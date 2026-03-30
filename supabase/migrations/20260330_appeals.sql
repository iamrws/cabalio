CREATE TABLE IF NOT EXISTS submission_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  admin_response TEXT,
  reviewed_by TEXT REFERENCES users(wallet_address),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(submission_id)  -- one appeal per submission
);

CREATE INDEX idx_appeals_wallet ON submission_appeals(wallet_address);
CREATE INDEX idx_appeals_status ON submission_appeals(status) WHERE status = 'pending';
