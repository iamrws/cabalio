import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';
import { canChangeRole, ensureSeasonMemberState, getLiveSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

const roleSchema = z.object({
  role: z.string().regex(/^[a-z0-9_]+$/, 'Role key must contain only lowercase letters, numbers, and underscores').min(1).max(40),
});

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = roleSchema.parse(body);

    const supabase = createServerClient();
    const season = await getLiveSeason(supabase);
    if (!season) {
      return NextResponse.json({ error: 'No live season found' }, { status: 404 });
    }

    const roleResult = await supabase
      .from('season_roles')
      .select('role_key, title')
      .eq('season_id', season.id)
      .eq('role_key', parsed.role)
      .maybeSingle();

    if (roleResult.error) {
      console.error('Season role lookup error:', roleResult.error);
      return NextResponse.json({ error: 'Failed to look up role' }, { status: 500 });
    }
    if (!roleResult.data) {
      return NextResponse.json({ error: 'Role not found for active season' }, { status: 404 });
    }

    const memberState = await ensureSeasonMemberState(supabase, season.id, session.walletAddress);
    if (!canChangeRole(memberState.last_role_change_at)) {
      return NextResponse.json(
        { error: 'Role change cooldown is active. Try again later.' },
        { status: 429 }
      );
    }

    const nowIso = new Date().toISOString();
    const updateResult = await supabase
      .from('season_member_state')
      .update({
        role_key: parsed.role,
        last_role_change_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', memberState.id)
      .select('*')
      .single();

    if (updateResult.error) {
      console.error('Season role update error:', updateResult.error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    await trackEngagementEvent(supabase, 'season_role_selected', session.walletAddress, {
      season_id: season.id,
      role_key: parsed.role,
      previous_role: memberState.role_key,
      changed_at: nowIso,
    });

    return NextResponse.json({
      success: true,
      season_id: season.id,
      role: roleResult.data,
      member_state: updateResult.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Season role selection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
