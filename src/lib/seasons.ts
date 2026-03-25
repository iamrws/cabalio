import type { SupabaseClient } from '@supabase/supabase-js';

export const ROLE_CHANGE_COOLDOWN_DAYS = 7;

export interface SeasonRow {
  id: string;
  name: string;
  theme: string;
  status: 'upcoming' | 'live' | 'ended';
  starts_at: string;
  ends_at: string;
  recap_ends_at: string;
  config_json: Record<string, unknown> | null;
}

export interface SeasonMemberStateRow {
  id: string;
  season_id: string;
  wallet_address: string;
  role_key: string | null;
  opt_out: boolean;
  joined_at: string;
  last_role_change_at: string | null;
}

export function getDefaultSeasonRoles() {
  return [
    {
      role_key: 'builder',
      title: 'Builder',
      description: 'Ships meaningful contributions and implementation artifacts.',
      perk_json: { focus: 'execution', points_bonus_hint: 'quest_weighted' },
    },
    {
      role_key: 'scout',
      title: 'Scout',
      description: 'Finds high-signal opportunities, ideas, and ecosystem alpha.',
      perk_json: { focus: 'discovery', points_bonus_hint: 'insight_quality' },
    },
    {
      role_key: 'guardian',
      title: 'Guardian',
      description: 'Protects quality, moderation health, and constructive behavior.',
      perk_json: { focus: 'quality', points_bonus_hint: 'safety_signal' },
    },
    {
      role_key: 'curator',
      title: 'Curator',
      description: 'Highlights valuable work and elevates community learning.',
      perk_json: { focus: 'amplification', points_bonus_hint: 'community_impact' },
    },
  ];
}

export async function getLiveSeason(supabase: SupabaseClient): Promise<SeasonRow | null> {
  const result = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'live')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data || null) as SeasonRow | null;
}

export async function getCurrentOrUpcomingSeason(supabase: SupabaseClient): Promise<SeasonRow | null> {
  const live = await getLiveSeason(supabase);
  if (live) return live;

  const nowIso = new Date().toISOString();
  const upcoming = await supabase
    .from('seasons')
    .select('*')
    .in('status', ['upcoming'])
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcoming.error) {
    throw upcoming.error;
  }

  return (upcoming.data || null) as SeasonRow | null;
}

export function canChangeRole(lastRoleChangeAt: string | null, now: Date = new Date()): boolean {
  if (!lastRoleChangeAt) return true;
  const last = new Date(lastRoleChangeAt);
  const cooldownMs = ROLE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - last.getTime() >= cooldownMs;
}

export async function ensureSeasonMemberState(
  supabase: SupabaseClient,
  seasonId: string,
  walletAddress: string
): Promise<SeasonMemberStateRow> {
  const existing = await supabase
    .from('season_member_state')
    .select('*')
    .eq('season_id', seasonId)
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as SeasonMemberStateRow;

  const nowIso = new Date().toISOString();
  const inserted = await supabase
    .from('season_member_state')
    .insert({
      season_id: seasonId,
      wallet_address: walletAddress,
      opt_out: false,
      joined_at: nowIso,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data as SeasonMemberStateRow;
}
