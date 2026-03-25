-- Security audit v2 migration (2026-03-25)
-- Addresses: H1 (audit_logs), H4 (rate_limits), H6 (content_hash + idempotency_token),
--            M7 (admin_wallets), and related indexes.

-- ═══════════════════════════════════════════════════════════════════════
-- H1: Immutable audit_logs table for admin actions and anomaly detection
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_wallet text not null,
  target_wallet text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Make the table append-only (no updates or deletes via RLS)
alter table public.audit_logs enable row level security;

-- No select policy for regular users; only service role can read
-- Prevent any updates or deletes
drop policy if exists audit_logs_deny_update on public.audit_logs;
drop policy if exists audit_logs_deny_delete on public.audit_logs;

create index if not exists idx_audit_logs_actor on public.audit_logs (actor_wallet);
create index if not exists idx_audit_logs_target on public.audit_logs (target_wallet);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);


-- ═══════════════════════════════════════════════════════════════════════
-- H4: Persistent rate_limits table (serverless-safe, replaces in-memory Map)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.rate_limits (
  wallet_address text not null,
  action text not null,
  request_count integer not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (wallet_address, action)
);

create index if not exists idx_rate_limits_window
  on public.rate_limits (action, window_start);

alter table public.rate_limits enable row level security;


-- ═══════════════════════════════════════════════════════════════════════
-- H6: Content hash and idempotency token columns on submissions
-- ═══════════════════════════════════════════════════════════════════════

alter table public.submissions
  add column if not exists content_hash text;

alter table public.submissions
  add column if not exists idempotency_token text;

-- Unique index on content_hash to block duplicate content permanently
create unique index if not exists idx_submissions_content_hash
  on public.submissions (content_hash)
  where content_hash is not null;

-- Unique index on idempotency_token for client-side dedup
create unique index if not exists idx_submissions_idempotency_token
  on public.submissions (idempotency_token)
  where idempotency_token is not null;

-- Unique index on URL to block same URL permanently (not just 7 days)
create unique index if not exists idx_submissions_url_unique
  on public.submissions (url)
  where url is not null;


-- ═══════════════════════════════════════════════════════════════════════
-- M7: admin_wallets table (allows runtime admin management without redeploy)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.admin_wallets (
  wallet_address text primary key,
  active boolean not null default true,
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_wallets enable row level security;

-- Only service role should manage this table; no RLS policies for anon/authenticated.
