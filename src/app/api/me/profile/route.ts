import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PROFILE_SELECT_FIELDS =
  'wallet_address, display_name, avatar_url, level, total_xp, current_streak, longest_streak, badges, x_handle, is_holder, holder_verified_at';

const patchBodySchema = z.object({
  display_name: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(2, 'Display name must be at least 2 characters')
        .max(30, 'Display name must be at most 30 characters')
        .regex(
          /^[a-zA-Z0-9 _]+$/,
          'Display name may only contain letters, numbers, spaces, and underscores'
        )
    )
    .optional(),
});

// GET /api/me/profile — return the current user's full profile data
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: user, error } = await supabase
    .from('users')
    .select(PROFILE_SELECT_FIELDS)
    .eq('wallet_address', session.walletAddress)
    .single();

  if (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }

  return NextResponse.json(
    { user },
    {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    }
  );
}

// PATCH /api/me/profile — update the current user's profile fields
export async function PATCH(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message);
    return NextResponse.json({ error: messages.join('; ') }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.display_name !== undefined) {
    updates.display_name = parsed.data.display_name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServerClient();

  const { data: user, error } = await supabase
    .from('users')
    .update(updates)
    .eq('wallet_address', session.walletAddress)
    .select(PROFILE_SELECT_FIELDS)
    .single();

  if (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({ user });
}
