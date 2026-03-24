import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy-initialized client to avoid build-time errors when env vars aren't set
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be set in environment variables');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// For convenience - lazy wrapper that only initializes at runtime
export const supabase = {
  from: (table: string) => getSupabase().from(table),
};

// Server-side client with service role key for admin operations
export function createServerClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase URL and Service Role Key must be set');
  }
  return createClient(supabaseUrl, serviceKey);
}

// ============================================================
// Database Schema (run this in Supabase SQL editor)
// ============================================================
export const SCHEMA_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
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
  status TEXT DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'queued', 'ai_scored', 'human_review', 'approved', 'flagged', 'rejected')
  ),
  week_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scored_at TIMESTAMPTZ
);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  type TEXT NOT NULL CHECK (type IN ('fire', 'hundred', 'brain', 'art', 'clap')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, wallet_address, type)
);

-- Weekly snapshots table
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  entries JSONB NOT NULL,
  total_submissions INTEGER DEFAULT 0,
  total_points_distributed INTEGER DEFAULT 0,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, year)
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  week_number INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  reward_amount_lamports BIGINT DEFAULT 0,
  status TEXT DEFAULT 'claimable' CHECK (status IN ('claimable', 'claimed', 'expired')),
  claimed_at TIMESTAMPTZ,
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('x_post', 'blog', 'art', 'any')),
  requirements TEXT NOT NULL,
  bonus_multiplier FLOAT DEFAULT 1.2,
  points_reward INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Quest progress tracking
CREATE TABLE IF NOT EXISTS quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(quest_id, wallet_address)
);

-- Points ledger for immutable accounting
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('submission_approved', 'quest_bonus', 'manual_adjustment', 'penalty')
  ),
  points_delta INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_wallet ON submissions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON submissions(week_number);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_submission ON reactions(submission_id);
CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON rewards(wallet_address);
CREATE INDEX IF NOT EXISTS idx_points_ledger_wallet ON points_ledger(wallet_address);
CREATE INDEX IF NOT EXISTS idx_points_ledger_submission ON points_ledger(submission_id);
`;
