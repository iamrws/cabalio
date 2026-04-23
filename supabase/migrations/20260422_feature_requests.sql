-- Feature requests / bug reports submitted via the site-wide feedback widget.
-- Service-role only (no RLS policies needed — all reads/writes go through route handlers).

CREATE TABLE IF NOT EXISTS feature_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('feature','bug')),
  title text not null,
  description text not null,
  wallet_address text,
  email text,
  ip_hash text,
  user_agent text,
  status text not null default 'new' check (status in ('new','triaged','in_progress','done','wont_do')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status_created ON feature_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_wallet ON feature_requests(wallet_address);
