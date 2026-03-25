-- Security audit fixes migration (2026-03-25)
-- Addresses: C3 (game votes), C4 (reward claims), H2 (quest evidence uniqueness)

-- ═══════════════════════════════════════════════════════════════════════
-- C3: Server-side game vote storage + player state
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.game_votes (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  video_id text not null,
  vote text not null check (vote in ('ai', 'human')),
  points_earned integer not null default 0,
  matched_consensus boolean not null default false,
  created_at timestamptz not null default now(),
  -- Each wallet can only vote once per video
  unique (wallet_address, video_id)
);

create index if not exists idx_game_votes_video
  on public.game_votes (video_id);
create index if not exists idx_game_votes_wallet
  on public.game_votes (wallet_address, created_at desc);

create table if not exists public.game_player_state (
  wallet_address text primary key references public.users(wallet_address) on delete cascade,
  points integer not null default 0,
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.game_votes enable row level security;
alter table public.game_player_state enable row level security;

drop policy if exists game_votes_select_own on public.game_votes;
create policy game_votes_select_own
  on public.game_votes for select
  using (wallet_address = auth.jwt()->>'wallet_address');

drop policy if exists game_player_state_select_own on public.game_player_state;
create policy game_player_state_select_own
  on public.game_player_state for select
  using (wallet_address = auth.jwt()->>'wallet_address');


-- ═══════════════════════════════════════════════════════════════════════
-- C4: Reward claims table with idempotency
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete cascade,
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  idempotency_key text not null,
  amount_lamports bigint not null default 0,
  status text not null default 'pending_payout'
    check (status in ('pending_payout', 'processing', 'completed', 'failed')),
  tx_signature text,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  -- Prevent duplicate claims via idempotency key
  unique (wallet_address, idempotency_key),
  -- Each reward can only be claimed once
  unique (reward_id)
);

create index if not exists idx_reward_claims_wallet
  on public.reward_claims (wallet_address);
create index if not exists idx_reward_claims_status
  on public.reward_claims (status) where status = 'pending_payout';

-- Ensure the rewards table has a claimed_at column (may already exist from schema)
alter table public.rewards
  add column if not exists claimed_at timestamptz;

alter table public.reward_claims enable row level security;

drop policy if exists reward_claims_select_own on public.reward_claims;
create policy reward_claims_select_own
  on public.reward_claims for select
  using (wallet_address = auth.jwt()->>'wallet_address');


-- ═══════════════════════════════════════════════════════════════════════
-- H2: Unique constraint on (season_id, wallet_address, evidence_id)
-- Prevents multiple quests from referencing the same evidence per user
-- ═══════════════════════════════════════════════════════════════════════

-- Partial unique index: only applies when evidence_id is not null and
-- the submission is in an active state (submitted or approved).
-- This allows rejected/flagged rows to not block future resubmissions.
create unique index if not exists idx_unique_season_wallet_evidence
  on public.season_quest_submissions (season_id, wallet_address, evidence_id)
  where evidence_id is not null
    and status in ('submitted', 'approved');
