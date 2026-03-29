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

// Jito Cabal NFT collection address (public env)
export const JITO_CABAL_COLLECTION_ADDRESS =
  process.env.NEXT_PUBLIC_JITO_CABAL_COLLECTION_ADDRESS || '';

// Weekly snapshot day (0 = Sunday)
export const SNAPSHOT_DAY = 0;

// Tier colors for leaderboard
export const TIER_COLORS = {
  elite: { color: '#eab308', label: 'Cabal Elite' },
  member: { color: '#22c55e', label: 'Cabal Member' },
  initiate: { color: '#a1a1aa', label: 'Cabal Initiate' },
} as const;

// Navigation items for sidebar
export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'home' },
  { label: 'Submit', href: '/submit', icon: 'plus' },
  { label: 'Leaderboard', href: '/leaderboard', icon: 'trophy' },
  { label: 'Quests', href: '/quests', icon: 'target' },
  { label: 'Rewards', href: '/rewards', icon: 'gift' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;
