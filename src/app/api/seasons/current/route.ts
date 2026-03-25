import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';
import { getCurrentOrUpcomingSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  const supabase = createServerClient();
  const nowIso = new Date().toISOString();

  try {
    const season = await getCurrentOrUpcomingSeason(supabase);
    if (!season) {
      return NextResponse.json({ season: null });
    }

    const [rolesResult, worldBossResult, activeEventsResult, memberStateLookup] = await Promise.all([
      supabase
        .from('season_roles')
        .select('id, role_key, title, description, perk_json')
        .eq('season_id', season.id)
        .order('title', { ascending: true }),
      supabase
        .from('season_world_boss_progress')
        .select('metric_key, current_value, target_value, updated_at')
        .eq('season_id', season.id),
      supabase
        .from('season_events')
        .select('id, event_type, starts_at, ends_at, config_json, active')
        .eq('season_id', season.id)
        .eq('active', true)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso),
      supabase
        .from('season_member_state')
        .select('*')
        .eq('season_id', season.id)
        .eq('wallet_address', session.walletAddress)
        .maybeSingle(),
    ]);

    if (rolesResult.error) return NextResponse.json({ error: rolesResult.error.message }, { status: 500 });
    if (worldBossResult.error) return NextResponse.json({ error: worldBossResult.error.message }, { status: 500 });
    if (activeEventsResult.error) return NextResponse.json({ error: activeEventsResult.error.message }, { status: 500 });
    if (memberStateLookup.error) return NextResponse.json({ error: memberStateLookup.error.message }, { status: 500 });

    let memberState = memberStateLookup.data;
    let memberStateCreated = false;

    if (!memberState && season.status === 'live') {
      const insertResult = await supabase
        .from('season_member_state')
        .insert({
          season_id: season.id,
          wallet_address: session.walletAddress,
          opt_out: false,
          joined_at: nowIso,
          updated_at: nowIso,
        })
        .select('*')
        .single();

      if (insertResult.error) {
        return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
      }

      memberState = insertResult.data;
      memberStateCreated = true;
    }

    if (memberStateCreated) {
      await trackEngagementEvent(supabase, 'season_joined', session.walletAddress, {
        season_id: season.id,
        join_channel: 'season_current_endpoint',
      });
    }

    const activeSignalStorm = (activeEventsResult.data || []).find(
      (event) => event.event_type === 'signal_storm'
    );

    return NextResponse.json({
      season,
      member_state: memberState,
      roles: rolesResult.data || [],
      world_boss_progress: worldBossResult.data || [],
      active_events: activeEventsResult.data || [],
      active_signal_storm: activeSignalStorm || null,
    });
  } catch (error) {
    console.error('Current season error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
