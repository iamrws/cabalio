-- Auth nonces table: prevents nonce replay attacks (C1 audit fix).
-- Each nonce is stored server-side and marked used on verification.

create table if not exists public.auth_nonces (
  nonce text primary key,
  wallet_address text not null,
  used boolean not null default false,
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_nonces_wallet on public.auth_nonces(wallet_address);
create index if not exists idx_auth_nonces_issued on public.auth_nonces(issued_at);

-- Periodic cleanup: delete nonces older than 10 minutes (they expire after 5 min anyway).
-- Run via pg_cron or application-level cleanup.
