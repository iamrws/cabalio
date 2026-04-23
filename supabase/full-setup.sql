-- ═══════════════════════════════════════════════════════════════════════
-- FULL DATABASE SETUP — Run this in Supabase SQL Editor (one shot)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── BASE TABLES ─────────────────────────────────────────────────────

-- 1. Users
CREATE TABLE IF NOT EXISTS public.users (
  wallet_address TEXT PRIMARY KEY,
  x_user_id TEXT UNIQUE,
  x_handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_submission_date DATE,
  is_holder BOOLEAN DEFAULT FALSE,
  nft_mint_address TEXT,
  holder_verified_at TIMESTAMPTZ,
  badges JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  type TEXT NOT NULL CHECK (type IN ('x_post', 'blog', 'art')),
  url TEXT,
  image_path TEXT,
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  raw_score FLOAT,
  normalized_score FLOAT,
  scoring_breakdown JSONB,
  points_awarded INTEGER DEFAULT 0,
  x_metrics JSONB,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'queued', 'ai_scored', 'human_review', 'approved', 'flagged', 'rejected')),
  week_number INTEGER NOT NULL,
  content_hash TEXT,
  idempotency_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  scored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_submissions_wallet ON public.submissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON public.submissions(week_number);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions(created_at);

-- 3. Reactions
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  type TEXT NOT NULL CHECK (type IN ('fire', 'hundred', 'brain', 'art', 'clap')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (submission_id, wallet_address, type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_submission ON public.reactions(submission_id);

-- 4. Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  week_number INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  reward_amount_lamports BIGINT DEFAULT 0,
  status TEXT DEFAULT 'claimable' CHECK (status IN ('claimable', 'claimed', 'expired')),
  claimed_at TIMESTAMPTZ,
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON public.rewards(wallet_address);

-- 5. Quest progress (requires a quests table)
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE (quest_id, wallet_address)
);


-- ─── MIGRATION: auth_nonces ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.auth_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet ON public.auth_nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_issued ON public.auth_nonces(issued_at);


-- ─── MIGRATION: audit_hardening ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('submission_approved', 'quest_bonus', 'manual_adjustment', 'penalty')
  ),
  points_delta INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_wallet ON public.points_ledger(wallet_address);
CREATE INDEX IF NOT EXISTS idx_points_ledger_submission ON public.points_ledger(submission_id);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
  ON public.users FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

DROP POLICY IF EXISTS submissions_select_own_or_approved ON public.submissions;
CREATE POLICY submissions_select_own_or_approved
  ON public.submissions FOR SELECT
  USING (
    status = 'approved'
    OR wallet_address = auth.jwt()->>'wallet_address'
  );

DROP POLICY IF EXISTS rewards_select_own ON public.rewards;
CREATE POLICY rewards_select_own
  ON public.rewards FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

DROP POLICY IF EXISTS points_ledger_select_own ON public.points_ledger;
CREATE POLICY points_ledger_select_own
  ON public.points_ledger FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');


-- ─── MIGRATION: security_audit_v2 (audit_logs, rate_limits, admin_wallets) ───

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_wallet TEXT NOT NULL,
  target_wallet TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_wallet);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_wallet);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  wallet_address TEXT NOT NULL,
  action TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_address, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(action, window_start);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Content hash and idempotency indexes on submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_content_hash
  ON public.submissions(content_hash)
  WHERE content_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_idempotency_token
  ON public.submissions(idempotency_token)
  WHERE idempotency_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_url_unique
  ON public.submissions(url)
  WHERE url IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.admin_wallets (
  wallet_address TEXT PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT true,
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;


-- ─── MIGRATION: security_audit_fixes (game_votes, reward_claims) ────

CREATE TABLE IF NOT EXISTS public.game_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('ai', 'human')),
  points_earned INTEGER NOT NULL DEFAULT 0,
  matched_consensus BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_address, video_id)
);

CREATE INDEX IF NOT EXISTS idx_game_votes_video ON public.game_votes(video_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_wallet ON public.game_votes(wallet_address, created_at DESC);

CREATE TABLE IF NOT EXISTS public.game_player_state (
  wallet_address TEXT PRIMARY KEY REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_player_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS game_votes_select_own ON public.game_votes;
CREATE POLICY game_votes_select_own
  ON public.game_votes FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

DROP POLICY IF EXISTS game_player_state_select_own ON public.game_player_state;
CREATE POLICY game_player_state_select_own
  ON public.game_player_state FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_payout'
    CHECK (status IN ('pending_payout', 'processing', 'completed', 'failed')),
  tx_signature TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_address, idempotency_key),
  UNIQUE (reward_id)
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet ON public.reward_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON public.reward_claims(status) WHERE status = 'pending_payout';

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_claims_select_own ON public.reward_claims;
CREATE POLICY reward_claims_select_own
  ON public.reward_claims FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');


-- ─── MIGRATION: command_center_seasons ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.point_reason_catalog (
  reason_code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description_template TEXT NOT NULL,
  is_positive BOOLEAN NOT NULL DEFAULT true,
  is_visible_to_user BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_streak_state (
  wallet_address TEXT PRIMARY KEY REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  current_days INTEGER NOT NULL DEFAULT 0 CHECK (current_days >= 0),
  shields_available INTEGER NOT NULL DEFAULT 1 CHECK (shields_available >= 0),
  last_activity_at TIMESTAMPTZ,
  broken_at TIMESTAMPTZ,
  comeback_bonus_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.next_action_templates (
  action_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  eligibility_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_points INTEGER NOT NULL DEFAULT 0,
  priority_weight INTEGER NOT NULL DEFAULT 0,
  expires_in_hours INTEGER NOT NULL DEFAULT 24 CHECK (expires_in_hours > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'live', 'ended')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  recap_ends_at TIMESTAMPTZ NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_live_season
  ON public.seasons ((status))
  WHERE status = 'live';

CREATE TABLE IF NOT EXISTS public.season_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  perk_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, role_key)
);

CREATE TABLE IF NOT EXISTS public.season_member_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  role_key TEXT,
  opt_out BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_role_change_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, wallet_address)
);

CREATE TABLE IF NOT EXISTS public.season_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  role_key TEXT,
  title TEXT NOT NULL,
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  points_reward INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_by TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.season_quest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.season_quests(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected', 'flagged')),
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN ('submission_id', 'url', 'text', 'none')),
  evidence_id TEXT,
  note TEXT,
  reviewed_by TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_quest_submissions_quest_wallet
  ON public.season_quest_submissions(quest_id, wallet_address);

CREATE INDEX IF NOT EXISTS idx_season_quest_submissions_wallet_evidence
  ON public.season_quest_submissions(wallet_address, evidence_type, evidence_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_season_wallet_evidence
  ON public.season_quest_submissions(season_id, wallet_address, evidence_id)
  WHERE evidence_id IS NOT NULL
    AND status IN ('submitted', 'approved');

CREATE TABLE IF NOT EXISTS public.season_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('signal_storm', 'announcement', 'bonus_window')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_events_active_window
  ON public.season_events(season_id, event_type, active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.season_world_boss_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 100,
  updated_by TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, metric_key)
);

CREATE TABLE IF NOT EXISTS public.season_world_boss_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  delta_value NUMERIC NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, metric_key, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT REFERENCES public.users(wallet_address) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_name_created
  ON public.engagement_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_events_wallet_created
  ON public.engagement_events(wallet_address, created_at DESC);

-- Seed: point reason catalog
INSERT INTO public.point_reason_catalog (reason_code, label, description_template, is_positive, is_visible_to_user)
VALUES
  ('submission_approved', 'Approved submission', 'Your contribution passed moderation and was scored for quality.', true, true),
  ('quest_bonus', 'Quest bonus', 'You completed a quest objective and earned bonus points.', true, true),
  ('manual_adjustment', 'Manual adjustment', 'An admin applied a points adjustment with a moderation note.', true, true),
  ('penalty', 'Penalty', 'A moderation action reduced points due to policy or quality concerns.', false, true),
  ('season_quest_approved', 'Season quest approved', 'Your seasonal quest evidence was approved and rewarded.', true, true),
  ('streak_comeback_bonus', 'Comeback bonus', 'You restarted after a break and earned a comeback bonus.', true, true)
ON CONFLICT (reason_code) DO NOTHING;

-- Seed: next action templates
INSERT INTO public.next_action_templates (action_id, title, reason, eligibility_rule_json, estimated_points, priority_weight, expires_in_hours, active)
VALUES
  ('first_approved_submission', 'Publish your first quality submission', 'First approved contributions unlock momentum and trust in the system.', '{"min_approved_submissions": 0, "max_approved_submissions": 0}', 20, 100, 24, true),
  ('reply_newcomer_thread', 'Reply to a newcomer thread', 'Helping new members is a high-signal behavior for tier growth.', '{"requires_active_week": true}', 8, 90, 24, true),
  ('complete_season_quest', 'Complete one active season quest', 'Season quests accelerate progression while improving community contribution quality.', '{"requires_live_season": true}', 15, 85, 24, true),
  ('maintain_streak_today', 'Contribute today to protect your streak', 'Consistent quality contributions compound your long-term progression.', '{"requires_streak": true}', 10, 80, 18, true)
ON CONFLICT (action_id) DO NOTHING;

-- RLS for season/command center tables
ALTER TABLE public.point_reason_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_streak_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.next_action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_member_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_quest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_world_boss_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_world_boss_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS point_reason_catalog_select_visible ON public.point_reason_catalog;
CREATE POLICY point_reason_catalog_select_visible
  ON public.point_reason_catalog FOR SELECT USING (is_visible_to_user = true);

DROP POLICY IF EXISTS member_streak_state_select_own ON public.member_streak_state;
CREATE POLICY member_streak_state_select_own
  ON public.member_streak_state FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

DROP POLICY IF EXISTS next_action_templates_select_active ON public.next_action_templates;
CREATE POLICY next_action_templates_select_active
  ON public.next_action_templates FOR SELECT USING (active = true);

DROP POLICY IF EXISTS seasons_select_all ON public.seasons;
CREATE POLICY seasons_select_all ON public.seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS season_roles_select_all ON public.season_roles;
CREATE POLICY season_roles_select_all ON public.season_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS season_quests_select_all ON public.season_quests;
CREATE POLICY season_quests_select_all ON public.season_quests FOR SELECT USING (true);

DROP POLICY IF EXISTS season_events_select_all ON public.season_events;
CREATE POLICY season_events_select_all ON public.season_events FOR SELECT USING (true);

DROP POLICY IF EXISTS season_world_boss_progress_select_all ON public.season_world_boss_progress;
CREATE POLICY season_world_boss_progress_select_all
  ON public.season_world_boss_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS season_member_state_select_own ON public.season_member_state;
CREATE POLICY season_member_state_select_own
  ON public.season_member_state FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

DROP POLICY IF EXISTS season_quest_submissions_select_own ON public.season_quest_submissions;
CREATE POLICY season_quest_submissions_select_own
  ON public.season_quest_submissions FOR SELECT
  USING (wallet_address = auth.jwt()->>'wallet_address');

DROP POLICY IF EXISTS engagement_events_select_own ON public.engagement_events;
CREATE POLICY engagement_events_select_own
  ON public.engagement_events FOR SELECT
  USING (wallet_address IS NULL OR wallet_address = auth.jwt()->>'wallet_address');


-- ─── MIGRATION: notifications ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON public.notifications(wallet_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(wallet_address) WHERE read = false;


-- ─── MIGRATION: appeals ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.submission_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id),
  wallet_address TEXT NOT NULL REFERENCES public.users(wallet_address),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'denied')),
  admin_response TEXT,
  reviewed_by TEXT REFERENCES public.users(wallet_address),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(submission_id)
);

CREATE INDEX IF NOT EXISTS idx_appeals_wallet ON public.submission_appeals(wallet_address);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON public.submission_appeals(status) WHERE status = 'pending';


-- ─── RPC FUNCTIONS ───────────────────────────────────────────────────

-- Leaderboard: weekly
CREATE OR REPLACE FUNCTION aggregate_leaderboard_weekly(
  week_start TIMESTAMPTZ,
  week_end TIMESTAMPTZ
)
RETURNS TABLE(wallet_address TEXT, total_points BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT pl.wallet_address, COALESCE(SUM(pl.points_delta), 0) AS total_points
  FROM points_ledger pl
  WHERE pl.created_at >= week_start AND pl.created_at < week_end
  GROUP BY pl.wallet_address;
$$;

-- Leaderboard: all-time
CREATE OR REPLACE FUNCTION aggregate_leaderboard_alltime()
RETURNS TABLE(wallet_address TEXT, total_points BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT pl.wallet_address, COALESCE(SUM(pl.points_delta), 0) AS total_points
  FROM points_ledger pl
  GROUP BY pl.wallet_address;
$$;

-- Sum positive points (community stats)
CREATE OR REPLACE FUNCTION sum_positive_points()
RETURNS TABLE(total BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(SUM(points_delta), 0)::BIGINT AS total
  FROM points_ledger WHERE points_delta > 0;
$$;

-- Atomic game state increment
CREATE OR REPLACE FUNCTION increment_game_state(
  p_wallet TEXT, p_points_delta INT, p_new_streak INT
) RETURNS void AS $$
BEGIN
  INSERT INTO game_player_state (wallet_address, points, streak, updated_at)
  VALUES (p_wallet, p_points_delta, p_new_streak, NOW())
  ON CONFLICT (wallet_address) DO UPDATE
  SET points = game_player_state.points + p_points_delta,
      streak = p_new_streak, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Atomic user XP increment
CREATE OR REPLACE FUNCTION increment_user_xp(
  p_wallet TEXT, p_delta INT
) RETURNS void AS $$
BEGIN
  UPDATE users SET total_xp = total_xp + p_delta, updated_at = NOW()
  WHERE wallet_address = p_wallet;
END;
$$ LANGUAGE plpgsql;

-- Atomic nonce consumption
CREATE OR REPLACE FUNCTION consume_nonce(
  p_nonce TEXT, p_wallet TEXT
) RETURNS TABLE(nonce TEXT, wallet_address TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE auth_nonces
  SET used = true, used_at = NOW()
  WHERE auth_nonces.nonce = p_nonce
    AND auth_nonces.wallet_address = p_wallet
    AND auth_nonces.used = false
  RETURNING auth_nonces.nonce, auth_nonces.wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired nonces
CREATE OR REPLACE FUNCTION cleanup_expired_nonces() RETURNS void AS $$
BEGIN
  DELETE FROM auth_nonces WHERE issued_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
