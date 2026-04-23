-- Rank 2 fix: atomic reward claim flow + status enum drift.
-- Closes C-02, N-02, N-03, MED15 from AUDIT_4.23.26.
--
-- The route previously: (a) marked the reward 'claimed', (b) sent SOL,
-- (c) inserted a reward_claims row with status='paid'. The status check
-- rejects 'paid' (enum is pending_payout|processing|completed|failed),
-- so the claim row never persisted and the idempotency/daily-limit
-- accounting was silently broken. Daily-limit check was also
-- non-transactional so two concurrent claims could both pass.
--
-- This migration introduces two server-only RPCs that reserve a claim
-- row with a transactional advisory lock and a proper status, then
-- finalize it with the on-chain tx signature.

-- 1. Reserve a claim. Locks the daily-budget mutex, verifies idempotency
-- key + reward ownership + status, checks daily total including this
-- claim, marks reward 'claimed', inserts claim row with status='processing'.
-- Returns claim_id. Raises on any contract violation so the route can
-- map to the correct HTTP status.
create or replace function public.record_reward_claim_atomic(
  p_reward_id uuid,
  p_wallet text,
  p_idempotency_key text,
  p_amount_lamports bigint,
  p_daily_limit_lamports bigint
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz := date_trunc('day', now() at time zone 'UTC');
  v_today_total bigint;
  v_existing_claim_id uuid;
  v_existing_reward_id uuid;
  v_claim_id uuid;
  v_reward_status text;
  v_reward_wallet text;
  v_reward_claimed_at timestamptz;
begin
  -- Global budget lock. Short critical section; every reservation
  -- acquires this so concurrent requests serialize on daily-limit check.
  perform pg_advisory_xact_lock(hashtext('cabalio-reward-claims-budget'));

  -- Idempotency pre-check. If the key was previously used but for a
  -- different reward, refuse (N-02).
  select id, reward_id
    into v_existing_claim_id, v_existing_reward_id
    from public.reward_claims
   where wallet_address = p_wallet
     and idempotency_key = p_idempotency_key
   limit 1;
  if v_existing_claim_id is not null then
    if v_existing_reward_id is distinct from p_reward_id then
      raise exception 'idempotency_key_reused_for_different_reward' using errcode = 'P0003';
    end if;
    -- Same key + same reward = caller should use the GET path, but raise
    -- a deterministic error so callers can detect.
    raise exception 'idempotency_key_already_used' using errcode = 'P0004';
  end if;

  -- Reward row lock. Must belong to wallet and be claimable.
  select status, wallet_address, claimed_at
    into v_reward_status, v_reward_wallet, v_reward_claimed_at
    from public.rewards
   where id = p_reward_id
   for update;

  if v_reward_status is null then
    raise exception 'reward_not_found' using errcode = 'P0005';
  end if;
  if v_reward_wallet is distinct from p_wallet then
    raise exception 'reward_not_owned_by_wallet' using errcode = 'P0006';
  end if;
  if v_reward_status <> 'claimable' or v_reward_claimed_at is not null then
    raise exception 'reward_not_claimable' using errcode = 'P0007';
  end if;

  -- Daily limit check includes THIS claim (todayTotal + amount <= limit).
  -- Counts both completed and processing claims so in-flight payouts
  -- still count against the budget.
  if p_daily_limit_lamports is not null and p_daily_limit_lamports > 0 then
    select coalesce(sum(amount_lamports), 0)
      into v_today_total
      from public.reward_claims
     where created_at >= v_today_start
       and status in ('processing', 'completed');
    if v_today_total + p_amount_lamports > p_daily_limit_lamports then
      raise exception 'daily_limit_exceeded' using errcode = 'P0008';
    end if;
  end if;

  -- Mark reward claimed.
  update public.rewards
     set status = 'claimed',
         claimed_at = now()
   where id = p_reward_id;

  -- Insert claim in processing state.
  insert into public.reward_claims (
    reward_id, wallet_address, idempotency_key,
    amount_lamports, status, created_at, claimed_at
  ) values (
    p_reward_id, p_wallet, p_idempotency_key,
    p_amount_lamports, 'processing', now(), now()
  ) returning id into v_claim_id;

  return v_claim_id;
end;
$$;

-- 2. Finalize claim after on-chain settlement (or failure). Route calls
-- this with the tx signature after executePayout returns. Never rolls
-- the reward back to 'claimable' -- ambiguous failures stay 'claimed'
-- and require ops reconciliation.
create or replace function public.finalize_reward_claim_atomic(
  p_claim_id uuid,
  p_tx_signature text,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'invalid_finalize_status' using errcode = 'P0009';
  end if;

  update public.reward_claims
     set status = p_status,
         tx_signature = p_tx_signature,
         completed_at = case when p_status = 'completed' then now() else completed_at end
   where id = p_claim_id;

  -- Also persist tx_signature on the rewards row for user-facing display
  -- when the claim completed successfully.
  if p_status = 'completed' and p_tx_signature is not null then
    update public.rewards r
       set tx_signature = p_tx_signature
      from public.reward_claims rc
     where rc.id = p_claim_id
       and rc.reward_id = r.id;
  end if;
end;
$$;

-- Lock down direct execution of both RPCs.
revoke execute on function public.record_reward_claim_atomic(uuid, text, text, bigint, bigint) from public, anon, authenticated;
revoke execute on function public.finalize_reward_claim_atomic(uuid, text, text) from public, anon, authenticated;

-- Drop the old unique(reward_id) constraint: with 'failed' claims we want
-- ops to be able to retry via a new reward row without collision. Leave
-- the (wallet, idempotency_key) unique constraint in place.
alter table public.reward_claims
  drop constraint if exists reward_claims_reward_id_key;

-- Add a partial unique index so only one *successful* or *in-flight*
-- claim exists per reward. Failed claims don't block retry of a new
-- idempotency key for the same reward.
create unique index if not exists idx_reward_claims_reward_active
  on public.reward_claims (reward_id)
  where status in ('processing', 'completed');
