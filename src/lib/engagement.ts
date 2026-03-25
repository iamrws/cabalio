export interface TierDefinition {
  key: string;
  label: string;
  minPoints: number;
  unlocks: string[];
}

export interface TierProgress {
  current: string;
  currentPoints: number;
  nextTier: string | null;
  pointsToNext: number;
  progress: number;
  unlocksPreview: string[];
}

export interface WeekWindow {
  weekStart: string;
  weekEnd: string;
}

export interface PointReasonCatalogRow {
  reason_code: string;
  label: string;
  description_template: string;
}

export interface PointReasonDetails {
  reasonCode: string;
  reasonLabel: string;
  explanation: string;
}

export interface NextActionTemplateRow {
  action_id: string;
  title: string;
  reason: string;
  eligibility_rule_json: Record<string, unknown> | null;
  estimated_points: number;
  priority_weight: number;
  expires_in_hours: number;
}

export interface NextActionEligibilityContext {
  approvedSubmissions: number;
  hasLiveSeason: boolean;
  streakDays: number;
  hasContributionToday: boolean;
}

export const BRACKET_SIZE = 30;

const BRACKET_NAMES = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Master',
  'Legend',
];

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    key: 'newcomer',
    label: 'Newcomer',
    minPoints: 0,
    unlocks: ['profile_badge_slot_1'],
  },
  {
    key: 'contributor',
    label: 'Contributor',
    minPoints: 100,
    unlocks: ['profile_theme_slot_1', 'weekly_bracket_visible'],
  },
  {
    key: 'guide',
    label: 'Guide',
    minPoints: 250,
    unlocks: ['mentor_opt_in', 'profile_theme_slot_2'],
  },
  {
    key: 'champion',
    label: 'Champion',
    minPoints: 500,
    unlocks: ['challenge_sponsor', 'rare_badge_track'],
  },
  {
    key: 'legend',
    label: 'Legend',
    minPoints: 1000,
    unlocks: ['council_moments', 'season_role_priority'],
  },
  {
    key: 'founder',
    label: 'Founder',
    minPoints: 2000,
    unlocks: ['champions_lounge', 'community_spotlight_priority'],
  },
];

function getCurrentTierDefinition(totalPoints: number): TierDefinition {
  let activeTier = TIER_DEFINITIONS[0];
  for (const tier of TIER_DEFINITIONS) {
    if (totalPoints >= tier.minPoints) {
      activeTier = tier;
    } else {
      break;
    }
  }
  return activeTier;
}

function getNextTierDefinition(totalPoints: number): TierDefinition | null {
  const current = getCurrentTierDefinition(totalPoints);
  const index = TIER_DEFINITIONS.findIndex((tier) => tier.key === current.key);
  if (index < 0 || index === TIER_DEFINITIONS.length - 1) return null;
  return TIER_DEFINITIONS[index + 1];
}

export function getTierProgress(totalPoints: number): TierProgress {
  const current = getCurrentTierDefinition(totalPoints);
  const next = getNextTierDefinition(totalPoints);
  const pointsToNext = next ? Math.max(0, next.minPoints - totalPoints) : 0;
  const progress = next
    ? Math.min(1, (totalPoints - current.minPoints) / Math.max(1, next.minPoints - current.minPoints))
    : 1;

  return {
    current: current.label,
    currentPoints: totalPoints,
    nextTier: next ? next.label : null,
    pointsToNext,
    progress,
    unlocksPreview: next ? next.unlocks : current.unlocks,
  };
}

export function getBracketName(bracketIndex: number): string {
  const safeIndex = Math.max(0, bracketIndex);
  if (safeIndex < BRACKET_NAMES.length) {
    return `${BRACKET_NAMES[safeIndex]}-${safeIndex + 1}`;
  }
  return `Ascendant-${safeIndex + 1}`;
}

export function getUtcWeekWindow(date: Date = new Date()): WeekWindow {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const mondayOffset = (utc.getUTCDay() + 6) % 7;
  const start = new Date(utc);
  start.setUTCDate(utc.getUTCDate() - mondayOffset);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
  };
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return false;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

export function isNextActionEligible(
  template: NextActionTemplateRow,
  context: NextActionEligibilityContext
): boolean {
  const rules = template.eligibility_rule_json || {};
  const minApproved = asNumber(rules.min_approved_submissions);
  const maxApproved = asNumber(rules.max_approved_submissions);
  const requiresLiveSeason = asBoolean(rules.requires_live_season);
  const requiresStreak = asBoolean(rules.requires_streak);

  if (minApproved !== null && context.approvedSubmissions < minApproved) return false;
  if (maxApproved !== null && context.approvedSubmissions > maxApproved) return false;
  if (requiresLiveSeason && !context.hasLiveSeason) return false;
  if (requiresStreak && context.streakDays <= 0) return false;

  return true;
}

function interpolateTemplate(template: string, points: number): string {
  return template.replace(/\{\{points\}\}/g, String(points));
}

export function resolvePointReasonDetails(
  entryType: string,
  pointsDelta: number,
  metadata: Record<string, unknown> | null,
  catalogMap: Map<string, PointReasonCatalogRow>
): PointReasonDetails {
  const reasonFromMetadata =
    metadata && typeof metadata.reason_code === 'string' ? metadata.reason_code : null;
  const reasonCode = reasonFromMetadata || entryType;
  const fallbackLabel = reasonCode
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const catalog = catalogMap.get(reasonCode);
  const reasonLabel = catalog?.label || fallbackLabel;
  const explanationTemplate =
    catalog?.description_template ||
    'This points event was recorded in the immutable ledger.';

  let explanation = interpolateTemplate(explanationTemplate, pointsDelta);
  if (metadata && typeof metadata.note === 'string' && metadata.note.trim().length > 0) {
    explanation = `${explanation} Note: ${metadata.note.trim()}`;
  }

  return {
    reasonCode,
    reasonLabel,
    explanation,
  };
}
