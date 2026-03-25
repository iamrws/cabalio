-- Command center + seasonal engine schema additions.

-- Point reason catalog drives explainable ledger feeds.
create table if not exists public.point_reason_catalog (
  reason_code text primary key,
  label text not null,
  description_template text not null,
  is_positive boolean not null default true,
  is_visible_to_user boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Member streak state with explicit shield and comeback metadata.
create table if not exists public.member_streak_state (
  wallet_address text primary key references public.users(wallet_address) on delete cascade,
  current_days integer not null default 0 check (current_days >= 0),
  shields_available integer not null default 1 check (shields_available >= 0),
  last_activity_at timestamptz,
  broken_at timestamptz,
  comeback_bonus_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Next action templates for command center recommendations.
create table if not exists public.next_action_templates (
  action_id text primary key,
  title text not null,
  reason text not null,
  eligibility_rule_json jsonb not null default '{}'::jsonb,
  estimated_points integer not null default 0,
  priority_weight integer not null default 0,
  expires_in_hours integer not null default 24 check (expires_in_hours > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Season definitions.
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  theme text not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'live', 'ended')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recap_ends_at timestamptz not null,
  config_json jsonb not null default '{}'::jsonb,
  created_by text references public.users(wallet_address) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce one live season at a time.
create unique index if not exists idx_single_live_season
  on public.seasons ((status))
  where status = 'live';

create table if not exists public.season_roles (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  role_key text not null,
  title text not null,
  description text not null,
  perk_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, role_key)
);

create table if not exists public.season_member_state (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  role_key text,
  opt_out boolean not null default false,
  joined_at timestamptz not null default now(),
  last_role_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, wallet_address)
);

create table if not exists public.season_quests (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  role_key text,
  title text not null,
  rules_json jsonb not null default '{}'::jsonb,
  points_reward integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by text references public.users(wallet_address) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_quest_submissions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.season_quests(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'flagged')),
  evidence_type text not null
    check (evidence_type in ('submission_id', 'url', 'text', 'none')),
  evidence_id text,
  note text,
  reviewed_by text references public.users(wallet_address) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_season_quest_submissions_quest_wallet
  on public.season_quest_submissions (quest_id, wallet_address);

create index if not exists idx_season_quest_submissions_wallet_evidence
  on public.season_quest_submissions (wallet_address, evidence_type, evidence_id);

create table if not exists public.season_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  event_type text not null
    check (event_type in ('signal_storm', 'announcement', 'bonus_window')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  config_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by text references public.users(wallet_address) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_season_events_active_window
  on public.season_events (season_id, event_type, active, starts_at, ends_at);

create table if not exists public.season_world_boss_progress (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  metric_key text not null,
  current_value numeric not null default 0,
  target_value numeric not null default 100,
  updated_by text references public.users(wallet_address) on delete set null,
  updated_at timestamptz not null default now(),
  unique (season_id, metric_key)
);

create table if not exists public.season_world_boss_updates (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  metric_key text not null,
  idempotency_key text not null,
  delta_value numeric not null default 0,
  created_by text references public.users(wallet_address) on delete set null,
  created_at timestamptz not null default now(),
  unique (season_id, metric_key, idempotency_key)
);

-- Lightweight events table for recommendation and season analytics.
create table if not exists public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  wallet_address text references public.users(wallet_address) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  source text not null default 'app',
  created_at timestamptz not null default now()
);

create index if not exists idx_engagement_events_name_created
  on public.engagement_events (event_name, created_at desc);

create index if not exists idx_engagement_events_wallet_created
  on public.engagement_events (wallet_address, created_at desc);

-- Reason catalog seeds.
insert into public.point_reason_catalog (reason_code, label, description_template, is_positive, is_visible_to_user)
values
  ('submission_approved', 'Approved submission', 'Your contribution passed moderation and was scored for quality.', true, true),
  ('quest_bonus', 'Quest bonus', 'You completed a quest objective and earned bonus points.', true, true),
  ('manual_adjustment', 'Manual adjustment', 'An admin applied a points adjustment with a moderation note.', true, true),
  ('penalty', 'Penalty', 'A moderation action reduced points due to policy or quality concerns.', false, true),
  ('season_quest_approved', 'Season quest approved', 'Your seasonal quest evidence was approved and rewarded.', true, true),
  ('streak_comeback_bonus', 'Comeback bonus', 'You restarted after a break and earned a comeback bonus.', true, true)
on conflict (reason_code) do update
set
  label = excluded.label,
  description_template = excluded.description_template,
  is_positive = excluded.is_positive,
  is_visible_to_user = excluded.is_visible_to_user,
  updated_at = now();

-- Next best action seeds.
insert into public.next_action_templates (action_id, title, reason, eligibility_rule_json, estimated_points, priority_weight, expires_in_hours, active)
values
  (
    'first_approved_submission',
    'Publish your first quality submission',
    'First approved contributions unlock momentum and trust in the system.',
    '{"min_approved_submissions": 0, "max_approved_submissions": 0}',
    20,
    100,
    24,
    true
  ),
  (
    'reply_newcomer_thread',
    'Reply to a newcomer thread',
    'Helping new members is a high-signal behavior for tier growth.',
    '{"requires_active_week": true}',
    8,
    90,
    24,
    true
  ),
  (
    'complete_season_quest',
    'Complete one active season quest',
    'Season quests accelerate progression while improving community contribution quality.',
    '{"requires_live_season": true}',
    15,
    85,
    24,
    true
  ),
  (
    'maintain_streak_today',
    'Contribute today to protect your streak',
    'Consistent quality contributions compound your long-term progression.',
    '{"requires_streak": true}',
    10,
    80,
    18,
    true
  )
on conflict (action_id) do update
set
  title = excluded.title,
  reason = excluded.reason,
  eligibility_rule_json = excluded.eligibility_rule_json,
  estimated_points = excluded.estimated_points,
  priority_weight = excluded.priority_weight,
  expires_in_hours = excluded.expires_in_hours,
  active = excluded.active,
  updated_at = now();

-- RLS enablement for new tables.
alter table public.point_reason_catalog enable row level security;
alter table public.member_streak_state enable row level security;
alter table public.next_action_templates enable row level security;
alter table public.seasons enable row level security;
alter table public.season_roles enable row level security;
alter table public.season_member_state enable row level security;
alter table public.season_quests enable row level security;
alter table public.season_quest_submissions enable row level security;
alter table public.season_events enable row level security;
alter table public.season_world_boss_progress enable row level security;
alter table public.season_world_boss_updates enable row level security;
alter table public.engagement_events enable row level security;

-- Read policies for authenticated members where reasonable.
drop policy if exists point_reason_catalog_select_visible on public.point_reason_catalog;
create policy point_reason_catalog_select_visible
  on public.point_reason_catalog for select
  using (is_visible_to_user = true);

drop policy if exists member_streak_state_select_own on public.member_streak_state;
create policy member_streak_state_select_own
  on public.member_streak_state for select
  using (wallet_address = auth.jwt()->>'wallet_address');

drop policy if exists next_action_templates_select_active on public.next_action_templates;
create policy next_action_templates_select_active
  on public.next_action_templates for select
  using (active = true);

drop policy if exists seasons_select_all on public.seasons;
create policy seasons_select_all
  on public.seasons for select
  using (true);

drop policy if exists season_roles_select_all on public.season_roles;
create policy season_roles_select_all
  on public.season_roles for select
  using (true);

drop policy if exists season_quests_select_all on public.season_quests;
create policy season_quests_select_all
  on public.season_quests for select
  using (true);

drop policy if exists season_events_select_all on public.season_events;
create policy season_events_select_all
  on public.season_events for select
  using (true);

drop policy if exists season_world_boss_progress_select_all on public.season_world_boss_progress;
create policy season_world_boss_progress_select_all
  on public.season_world_boss_progress for select
  using (true);

drop policy if exists season_member_state_select_own on public.season_member_state;
create policy season_member_state_select_own
  on public.season_member_state for select
  using (wallet_address = auth.jwt()->>'wallet_address');

drop policy if exists season_quest_submissions_select_own on public.season_quest_submissions;
create policy season_quest_submissions_select_own
  on public.season_quest_submissions for select
  using (wallet_address = auth.jwt()->>'wallet_address');

drop policy if exists engagement_events_select_own on public.engagement_events;
create policy engagement_events_select_own
  on public.engagement_events for select
  using (
    wallet_address is null
    or wallet_address = auth.jwt()->>'wallet_address'
  );
