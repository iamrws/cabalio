import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFERENCES = {
  notifications: {
    submissions: true,
    points: true,
    quests: true,
    system: true,
  },
  privacy: {
    public_profile: true,
  },
  theme: 'dark' as const,
};

const preferencesSchema = z.object({
  notifications: z
    .object({
      submissions: z.boolean(),
      points: z.boolean(),
      quests: z.boolean(),
      system: z.boolean(),
    })
    .optional(),
  privacy: z
    .object({
      public_profile: z.boolean(),
    })
    .optional(),
  theme: z.enum(['dark', 'light']).optional(),
});

// GET /api/me/settings — return the current user's preferences
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('preferences')
    .eq('wallet_address', session.walletAddress)
    .single();

  if (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }

  // Merge stored preferences with defaults so all keys always exist
  const stored = (user?.preferences as Record<string, unknown>) || {};
  const preferences = {
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...(stored.notifications as Record<string, unknown> || {}) },
    privacy: { ...DEFAULT_PREFERENCES.privacy, ...(stored.privacy as Record<string, unknown> || {}) },
    theme: (stored.theme as string) || DEFAULT_PREFERENCES.theme,
  };

  return NextResponse.json({ preferences });
}

// PUT /api/me/settings — update the current user's preferences
export async function PUT(request: NextRequest) {
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

  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message);
    return NextResponse.json({ error: messages.join('; ') }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch existing preferences to deep merge
  const { data: existing } = await supabase
    .from('users')
    .select('preferences')
    .eq('wallet_address', session.walletAddress)
    .single();

  const currentPrefs = (existing?.preferences as Record<string, unknown>) || {};
  const incoming = parsed.data;

  const merged = {
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...(currentPrefs.notifications as Record<string, unknown> || {}),
      ...(incoming.notifications || {}),
    },
    privacy: {
      ...DEFAULT_PREFERENCES.privacy,
      ...(currentPrefs.privacy as Record<string, unknown> || {}),
      ...(incoming.privacy || {}),
    },
    theme: incoming.theme || (currentPrefs.theme as string) || DEFAULT_PREFERENCES.theme,
  };

  const { error } = await supabase
    .from('users')
    .update({ preferences: merged, updated_at: new Date().toISOString() })
    .eq('wallet_address', session.walletAddress);

  if (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({ preferences: merged });
}
