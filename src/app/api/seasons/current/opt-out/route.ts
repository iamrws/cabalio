import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';
import { ensureSeasonMemberState, getLiveSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

const optOutSchema = z.object({
  opt_out: z.boolean(),
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
    const parsed = optOutSchema.parse(body);

    const supabase = createServerClient();
    const season = await getLiveSeason(supabase);
    if (!season) {
      return NextResponse.json({ error: 'No live season found' }, { status: 404 });
    }

    const memberState = await ensureSeasonMemberState(supabase, season.id, session.walletAddress);
    const nowIso = new Date().toISOString();

    const updateResult = await supabase
      .from('season_member_state')
      .update({ opt_out: parsed.opt_out, updated_at: nowIso })
      .eq('id', memberState.id)
      .select('*')
      .single();

    if (updateResult.error) {
      console.error('Season opt-out update error:', updateResult.error);
      return NextResponse.json({ error: 'Failed to update opt-out preference' }, { status: 500 });
    }

    await trackEngagementEvent(supabase, 'season_opt_out_toggled', session.walletAddress, {
      season_id: season.id,
      opt_out: parsed.opt_out,
    });

    return NextResponse.json({
      success: true,
      season_id: season.id,
      member_state: updateResult.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Season opt-out error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
