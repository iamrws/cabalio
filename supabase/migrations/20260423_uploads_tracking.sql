-- Rank 14 fix: track uploaded images + enforce per-wallet quota + ownership.
-- Closes M-04 from AUDIT_4.23.26.

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.users(wallet_address) on delete cascade,
  image_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text,
  bucket text not null,
  status text not null default 'ready'
    check (status in ('ready', 'used', 'deleted')),
  created_at timestamptz not null default now()
);

create index if not exists idx_uploads_wallet_created
  on public.uploads (wallet_address, created_at desc);

alter table public.uploads enable row level security;
revoke all on table public.uploads from anon, authenticated;

-- Owner-only read so holders can see their own upload history if we ever
-- expose it; writes stay service-role-only.
drop policy if exists uploads_select_own on public.uploads;
create policy uploads_select_own
  on public.uploads for select
  using (wallet_address = (auth.jwt() ->> 'wallet_address'));

-- Deny-all for anon/auth writes (service role bypasses).
drop policy if exists uploads_deny_write on public.uploads;
create policy uploads_deny_write
  on public.uploads for all to anon, authenticated
  using (false) with check (false);
