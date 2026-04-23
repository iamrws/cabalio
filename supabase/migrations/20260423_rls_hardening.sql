-- Rank 1 fix: RLS + explicit revokes + deny policies on server-only tables.
-- Closes C-01 and N-01 from AUDIT_4.23.26_CONSOLIDATED.md.
--
-- Defense in depth: every public.* table is RLS-enabled AND direct anon /
-- authenticated access is revoked for server-only tables. Even if a future
-- policy is added by mistake, the grant is still missing.

-- 1. Enable RLS on tables that are missing it.
alter table if exists public.auth_nonces enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.submission_appeals enable row level security;
alter table if exists public.feature_requests enable row level security;
alter table if exists public.quests enable row level security;

-- 2. Revoke all direct table access from anon + authenticated on strictly
-- server-only tables. Service role bypasses this and is unaffected.
revoke all on table public.auth_nonces from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.submission_appeals from anon, authenticated;
revoke all on table public.feature_requests from anon, authenticated;
revoke all on table public.reactions from anon, authenticated;
revoke all on table public.quest_progress from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.rate_limits from anon, authenticated;
revoke all on table public.admin_wallets from anon, authenticated;
revoke all on table public.season_world_boss_updates from anon, authenticated;
revoke all on table public.quests from anon, authenticated;

-- 3. Explicit deny policies. Redundant with (2) but catches the case where a
-- future GRANT slips in. `using (false)` makes every row invisible to non-
-- service roles. Service role ignores RLS entirely.
create policy auth_nonces_deny_all on public.auth_nonces
  for all to anon, authenticated using (false) with check (false);

create policy notifications_deny_all on public.notifications
  for all to anon, authenticated using (false) with check (false);

create policy submission_appeals_deny_all on public.submission_appeals
  for all to anon, authenticated using (false) with check (false);

create policy feature_requests_deny_all on public.feature_requests
  for all to anon, authenticated using (false) with check (false);

create policy reactions_deny_all on public.reactions
  for all to anon, authenticated using (false) with check (false);

create policy quest_progress_deny_all on public.quest_progress
  for all to anon, authenticated using (false) with check (false);

create policy audit_logs_deny_all on public.audit_logs
  for all to anon, authenticated using (false) with check (false);

create policy rate_limits_deny_all on public.rate_limits
  for all to anon, authenticated using (false) with check (false);

create policy admin_wallets_deny_all on public.admin_wallets
  for all to anon, authenticated using (false) with check (false);

create policy season_world_boss_updates_deny_all on public.season_world_boss_updates
  for all to anon, authenticated using (false) with check (false);

create policy quests_deny_all on public.quests
  for all to anon, authenticated using (false) with check (false);

-- 4. Tighten engagement_events: drop the policy that allows anon reads of
-- wallet_address IS NULL rows (N-19). Replace with strict owner-only.
drop policy if exists engagement_events_select_own on public.engagement_events;
create policy engagement_events_select_own on public.engagement_events
  for select to authenticated
  using (
    wallet_address is not null
    and wallet_address = (auth.jwt() ->> 'wallet_address')
  );

-- 5. Revoke execute on volatile RPC functions from anon/authenticated. These
-- should only be called by the server via service role. Read-only aggregation
-- functions used by public leaderboards keep their grants. (L-02 + N-20 prep.)
do $$
declare
  fn_name text;
begin
  foreach fn_name in array array[
    'consume_nonce',
    'cleanup_expired_nonces',
    'increment_game_state',
    'increment_user_xp'
  ] loop
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated', fn_name, (
      select pg_get_function_identity_arguments(p.oid)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = fn_name
      limit 1
    ));
  exception when others then
    -- function may not exist yet in some environments; continue.
    null;
  end loop;
end
$$;

-- 6. Schedule cleanup of expired nonces (N-20). Uses pg_cron if available; if
-- the extension is not enabled the statement is skipped.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cabalio_cleanup_expired_nonces',
      '*/15 * * * *',
      $cron$ select public.cleanup_expired_nonces() $cron$
    );
  end if;
exception when others then
  -- ignore schedule errors; ops can add it manually.
  null;
end
$$;
