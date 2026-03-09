// Scoring weights for AI evaluation
export const SCORING_WEIGHTS = {
  relevance: 0.30,
  originality: 0.25,
  effort: 0.20,
  engagement_potential: 0.15,
  accuracy: 0.10,
} as const;

// Points calculation
export const POINTS_BASE_MULTIPLIER = 10;
export const STREAK_BONUS_PER_DAY = 0.05;
export const STREAK_BONUS_CAP = 1.5;
export const QUEST_BONUS_MULTIPLIER = 1.2;
export const MIN_WEEKLY_POINTS_FOR_REWARD = 25;

// Rate limiting
export const MAX_SUBMISSIONS_PER_DAY = 3;
export const MIN_TEXT_LENGTH = 50;
export const MIN_BLOG_WORDS = 200;
export const MIN_ART_DESCRIPTION_LENGTH = 50;
export const MAX_IMAGE_SIZE_MB = 5;

// Streak
export const STREAK_GRACE_DAYS = 1;

// Jito Cabal NFT (placeholder - replace with actual collection address)
export const JITO_CABAL_COLLECTION_ADDRESS = 'REPLACE_WITH_ACTUAL_COLLECTION_ADDRESS';

// API endpoints
export const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=';

// Weekly snapshot day (0 = Sunday)
export const SNAPSHOT_DAY = 0;

// Tier colors for leaderboard
export const TIER_COLORS = {
  elite: { border: '#ffd700', glow: '0 0 20px rgba(255, 215, 0, 0.3)', label: 'Cabal Elite' },
  member: { border: '#00f0ff', glow: '0 0 20px rgba(0, 240, 255, 0.3)', label: 'Cabal Member' },
  initiate: { border: '#39ff14', glow: '0 0 20px rgba(57, 255, 20, 0.3)', label: 'Cabal Initiate' },
} as const;

// Navigation items for sidebar
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  { label: 'Submit', href: '/submit', icon: 'plus' },
  { label: 'Leaderboard', href: '/leaderboard', icon: 'trophy' },
  { label: 'Quests', href: '/quests', icon: 'target' },
  { label: 'Rewards', href: '/rewards', icon: 'gift' },
] as const;
