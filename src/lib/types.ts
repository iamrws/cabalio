// ============================================================
// Core Types for the Jito Cabal Community Engagement Platform
// ============================================================

export type SubmissionType = 'x_post' | 'blog' | 'art';
export type SubmissionStatus =
  | 'submitted'
  | 'queued'
  | 'ai_scored'
  | 'human_review'
  | 'approved'
  | 'flagged'
  | 'rejected';
export type QuestStatus = 'active' | 'completed' | 'expired';
export type RewardStatus = 'claimable' | 'claimed' | 'expired';

// --- User ---
export interface User {
  wallet_address: string;
  x_user_id: string | null;
  x_handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_submission_date: string | null;
  is_holder: boolean;
  nft_mint_address: string | null;
  badges: Badge[];
  created_at: string;
  updated_at: string;
}

// --- Submission ---
export interface Submission {
  id: string;
  wallet_address: string;
  type: SubmissionType;
  url: string | null;
  image_path: string | null;
  title: string;
  content_text: string;
  raw_score: number | null;
  normalized_score: number | null;
  scoring_breakdown: ScoringBreakdown | null;
  points_awarded: number;
  x_metrics: XMetrics | null;
  status: SubmissionStatus;
  week_number: number;
  created_at: string;
  scored_at: string | null;
  user?: User;
  reactions?: ReactionCount[];
}

export interface ScoringBreakdown {
  relevance: DimensionScore;
  originality: DimensionScore;
  effort: DimensionScore;
  engagement_potential: DimensionScore;
  accuracy: DimensionScore;
  weighted_total: number;
  summary: string;
}

export interface DimensionScore {
  score: number;
  rationale: string;
}

export interface XMetrics {
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
}

// --- Leaderboard ---
export interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  total_points: number;
  submission_count: number;
  best_score: number;
  tier: 'elite' | 'member' | 'initiate';
}

export interface WeeklySnapshot {
  week_number: number;
  year: number;
  entries: LeaderboardEntry[];
  total_submissions: number;
  total_points_distributed: number;
  snapshot_date: string;
}

// --- Gamification ---
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: SubmissionType | 'any';
  requirements: string;
  bonus_multiplier: number;
  points_reward: number;
  status: QuestStatus;
  progress: number;
  target: number;
  starts_at: string;
  expires_at: string;
}

export interface Streak {
  current: number;
  longest: number;
  last_submission_date: string | null;
  calendar: Record<string, boolean>; // date string -> submitted
}

// --- Rewards ---
export interface Reward {
  id: string;
  wallet_address: string;
  week_number: number;
  points_earned: number;
  reward_amount_lamports: number;
  status: RewardStatus;
  claimed_at: string | null;
  tx_signature: string | null;
  created_at: string;
}

// --- Reactions ---
export type ReactionType = 'fire' | 'hundred' | 'brain' | 'art' | 'clap';

export interface ReactionCount {
  type: ReactionType;
  count: number;
  user_reacted: boolean;
}

// --- Level System ---
export interface LevelInfo {
  level: number;
  name: string;
  min_xp: number;
  max_xp: number;
  progress: number; // 0-1
}

export const LEVEL_THRESHOLDS: { level: number; name: string; min_xp: number }[] = [
  { level: 1, name: 'Initiate', min_xp: 0 },
  { level: 2, name: 'Acolyte', min_xp: 100 },
  { level: 3, name: 'Sentinel', min_xp: 300 },
  { level: 4, name: 'Guardian', min_xp: 600 },
  { level: 5, name: 'Warden', min_xp: 1000 },
  { level: 6, name: 'Oracle', min_xp: 1500 },
  { level: 7, name: 'Phantom', min_xp: 2500 },
  { level: 8, name: 'Sovereign', min_xp: 4000 },
  { level: 9, name: 'Architect', min_xp: 6000 },
  { level: 10, name: 'Shadow Council', min_xp: 10000 },
];

export const TIER_THRESHOLDS = {
  elite: 50,
  member: 25,
  initiate: 0,
} as const;

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  fire: '🔥',
  hundred: '💯',
  brain: '🧠',
  art: '🎨',
  clap: '👏',
};

export const BADGE_DEFINITIONS: Omit<Badge, 'earned_at'>[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Made your first submission', icon: '⚡' },
  { id: 'thread_weaver', name: 'Thread Weaver', description: '5 Jito content submissions', icon: '🧵' },
  { id: 'wordsmith', name: 'Wordsmith', description: '5 blog submissions', icon: '✍️' },
  { id: 'artist', name: 'Artist', description: '5 art submissions', icon: '🎨' },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Scored 90+ on a submission', icon: '💎' },
  { id: 'iron_will', name: 'Iron Will', description: '30-day streak', icon: '🔥' },
  { id: 'century', name: 'Century', description: '100 total submissions', icon: '💯' },
  { id: 'top_cabal', name: 'Top of the Cabal', description: '#1 on weekly leaderboard', icon: '👑' },
  { id: 'consistent', name: 'Consistent', description: 'Submitted every week for 4 weeks', icon: '📅' },
];
