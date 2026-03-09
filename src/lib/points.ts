import { LEVEL_THRESHOLDS, type LevelInfo } from './types';
import {
  POINTS_BASE_MULTIPLIER,
  STREAK_BONUS_PER_DAY,
  STREAK_BONUS_CAP,
  QUEST_BONUS_MULTIPLIER,
  STREAK_GRACE_DAYS,
} from './constants';

export function calculatePoints(
  normalizedScore: number,
  streakDays: number,
  hasQuestBonus: boolean
): number {
  const streakBonus = Math.min(1.0 + streakDays * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
  const questBonus = hasQuestBonus ? QUEST_BONUS_MULTIPLIER : 1.0;
  return Math.round(normalizedScore * POINTS_BASE_MULTIPLIER * streakBonus * questBonus);
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let currentLevel = LEVEL_THRESHOLDS[0];
  let nextLevel = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i].min_xp) {
      currentLevel = LEVEL_THRESHOLDS[i];
      nextLevel = LEVEL_THRESHOLDS[i + 1] || LEVEL_THRESHOLDS[i];
      break;
    }
  }

  const xpInLevel = totalXp - currentLevel.min_xp;
  const xpForNextLevel = nextLevel.min_xp - currentLevel.min_xp;
  const progress = xpForNextLevel > 0 ? Math.min(xpInLevel / xpForNextLevel, 1) : 1;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    min_xp: currentLevel.min_xp,
    max_xp: nextLevel.min_xp,
    progress,
  };
}

export function calculateStreak(
  lastSubmissionDate: string | null,
  currentStreak: number
): { newStreak: number; isActive: boolean } {
  if (!lastSubmissionDate) {
    return { newStreak: 1, isActive: true };
  }

  const last = new Date(lastSubmissionDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Already submitted today
    return { newStreak: currentStreak, isActive: true };
  } else if (diffDays === 1) {
    // Consecutive day
    return { newStreak: currentStreak + 1, isActive: true };
  } else if (diffDays <= 1 + STREAK_GRACE_DAYS) {
    // Within grace period
    return { newStreak: currentStreak + 1, isActive: true };
  } else {
    // Streak broken
    return { newStreak: 1, isActive: false };
  }
}

export function getTierFromPoints(weeklyPoints: number): 'elite' | 'member' | 'initiate' {
  if (weeklyPoints >= 50) return 'elite';
  if (weeklyPoints >= 25) return 'member';
  return 'initiate';
}
