-- Audit hardening migration: auth pipeline, moderation statuses, points ledger.

-- Users: holder verification timestamp.
alter table public.users
  add column if not exists holder_verified_at timestamptz;

-- Submissions: expand status model.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'submissions'
      and column_name = 'status'
  ) then
    alter table public.submissions
      drop constraint if exists submissions_status_check;

    alter table public.submissions
      add constraint submissions_status_check
      check (status in ('submitted', 'queued', 'ai_scored', 'human_review', 'approved', 'flagged', 'rejected'));

    alter table public.submissions
      alter column status set default 'submitted';
  end if;
end $$;

-- Points ledger for immutable point accounting.
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address),
  submission_id uuid references public.submissions(id) on delete set null,
  entry_type text not null check (
    entry_type in ('submission_approved', 'quest_bonus', 'manual_adjustment', 'penalty')
  ),
  points_delta integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_points_ledger_wallet on public.points_ledger(wallet_address);
create index if not exists idx_points_ledger_submission on public.points_ledger(submission_id);

-- RLS baseline.
alter table public.users enable row level security;
alter table public.submissions enable row level security;
alter table public.reactions enable row level security;
alter table public.rewards enable row level security;
alter table public.quest_progress enable row level security;
alter table public.points_ledger enable row level security;

-- Policies assume server role handles privileged operations.
-- Authenticated holders can read their own profile and submissions.
drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users for select
  using (wallet_address = auth.jwt()->>'wallet_address');

drop policy if exists submissions_select_own_or_approved on public.submissions;
create policy submissions_select_own_or_approved
  on public.submissions for select
  using (
    status = 'approved'
    or wallet_address = auth.jwt()->>'wallet_address'
  );

drop policy if exists rewards_select_own on public.rewards;
create policy rewards_select_own
  on public.rewards for select
  using (wallet_address = auth.jwt()->>'wallet_address');

drop policy if exists points_ledger_select_own on public.points_ledger;
create policy points_ledger_select_own
  on public.points_ledger for select
  using (wallet_address = auth.jwt()->>'wallet_address');
