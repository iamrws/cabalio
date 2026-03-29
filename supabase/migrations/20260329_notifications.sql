-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  type TEXT NOT NULL, -- 'submission_approved', 'submission_rejected', 'submission_flagged', 'points_awarded', 'tier_up', 'quest_completed', 'reward_available', 'manual_adjustment', 'system'
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_wallet ON notifications(wallet_address, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(wallet_address) WHERE read = false;

-- Add user_preferences JSONB column to users table for settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
