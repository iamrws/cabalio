import { describe, it, expect } from 'vitest';
import { calculatePoints, getLevelInfo, calculateStreak, getTierFromPoints } from './points';

// ─── calculatePoints ────────────────────────────────────────────

describe('calculatePoints', () => {
  it('calculates base points with no streak or quest bonus', () => {
    // normalizedScore * 10 * 1.0 * 1.0 = normalizedScore * 10
    expect(calculatePoints(0.8, 0, false)).toBe(8);
  });

  it('applies streak bonus', () => {
    // 0.5 * 10 * (1.0 + 5*0.05) * 1.0 = 5 * 1.25 = 6.25 → 6
    expect(calculatePoints(0.5, 5, false)).toBe(6);
  });

  it('caps streak bonus at 1.5', () => {
    // streak bonus = 1.0 + 20*0.05 = 2.0 → capped at 1.5
    // 1.0 * 10 * 1.5 * 1.0 = 15
    expect(calculatePoints(1.0, 20, false)).toBe(15);
  });

  it('applies quest bonus multiplier', () => {
    // 1.0 * 10 * 1.0 * 1.2 = 12
    expect(calculatePoints(1.0, 0, true)).toBe(12);
  });

  it('applies both streak and quest bonuses', () => {
    // streak bonus = 1.0 + 10*0.05 = 1.5 (exactly at cap)
    // 1.0 * 10 * 1.5 * 1.2 = 18
    expect(calculatePoints(1.0, 10, true)).toBe(18);
  });

  it('rounds the result', () => {
    // 0.33 * 10 * 1.0 * 1.0 = 3.3 → 3
    expect(calculatePoints(0.33, 0, false)).toBe(3);
    // 0.75 * 10 * (1.0 + 1*0.05) * 1.0 = 7.5 * 1.05 = 7.875 → 8
    expect(calculatePoints(0.75, 1, false)).toBe(8);
  });

  it('returns 0 for zero score', () => {
    expect(calculatePoints(0, 10, true)).toBe(0);
  });
});

// ─── getLevelInfo ───────────────────────────────────────────────

describe('getLevelInfo', () => {
  it('returns level 1 for 0 XP', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.name).toBe('Initiate');
    expect(info.min_xp).toBe(0);
    expect(info.progress).toBe(0);
  });

  it('returns level 2 for 100 XP', () => {
    const info = getLevelInfo(100);
    expect(info.level).toBe(2);
    expect(info.name).toBe('Acolyte');
  });

  it('returns level 3 for 300 XP', () => {
    const info = getLevelInfo(300);
    expect(info.level).toBe(3);
    expect(info.name).toBe('Sentinel');
  });

  it('calculates progress within a level', () => {
    // At 50 XP: level 1, need 100 for level 2
    // progress = 50 / (100 - 0) = 0.5
    const info = getLevelInfo(50);
    expect(info.level).toBe(1);
    expect(info.progress).toBeCloseTo(0.5);
  });

  it('returns level 10 for 10000+ XP', () => {
    const info = getLevelInfo(15000);
    expect(info.level).toBe(10);
    expect(info.name).toBe('Shadow Council');
    expect(info.progress).toBe(1);
  });

  it('returns correct level for exact threshold values', () => {
    expect(getLevelInfo(600).level).toBe(4); // Guardian
    expect(getLevelInfo(1000).level).toBe(5); // Warden
    expect(getLevelInfo(1500).level).toBe(6); // Oracle
    expect(getLevelInfo(2500).level).toBe(7); // Phantom
    expect(getLevelInfo(4000).level).toBe(8); // Sovereign
    expect(getLevelInfo(6000).level).toBe(9); // Architect
  });

  it('handles XP just below next level', () => {
    const info = getLevelInfo(99);
    expect(info.level).toBe(1);
    expect(info.progress).toBeCloseTo(0.99);
  });
});

// ─── calculateStreak ────────────────────────────────────────────

describe('calculateStreak', () => {
  it('returns streak 1 when no previous submission', () => {
    const result = calculateStreak(null, 0);
    expect(result.newStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('keeps streak the same when submitting on the same day', () => {
    const today = new Date().toISOString();
    const result = calculateStreak(today, 5);
    expect(result.newStreak).toBe(5);
    expect(result.isActive).toBe(true);
  });

  it('increments streak for consecutive days', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = calculateStreak(yesterday.toISOString(), 3);
    expect(result.newStreak).toBe(4);
    expect(result.isActive).toBe(true);
  });

  it('increments streak within grace period (2 days ago)', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = calculateStreak(twoDaysAgo.toISOString(), 3);
    expect(result.newStreak).toBe(4);
    expect(result.isActive).toBe(true);
  });

  it('resets streak when gap exceeds grace period', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const result = calculateStreak(fiveDaysAgo.toISOString(), 10);
    expect(result.newStreak).toBe(1);
    expect(result.isActive).toBe(false);
  });

  it('resets streak for a 3-day gap (beyond 1-day grace)', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const result = calculateStreak(threeDaysAgo.toISOString(), 7);
    expect(result.newStreak).toBe(1);
    expect(result.isActive).toBe(false);
  });
});

// ─── getTierFromPoints ──────────────────────────────────────────

describe('getTierFromPoints', () => {
  it('returns initiate for 0 points', () => {
    expect(getTierFromPoints(0)).toBe('initiate');
  });

  it('returns initiate for 24 points', () => {
    expect(getTierFromPoints(24)).toBe('initiate');
  });

  it('returns member for 25 points', () => {
    expect(getTierFromPoints(25)).toBe('member');
  });

  it('returns member for 49 points', () => {
    expect(getTierFromPoints(49)).toBe('member');
  });

  it('returns elite for 50 points', () => {
    expect(getTierFromPoints(50)).toBe('elite');
  });

  it('returns elite for 100 points', () => {
    expect(getTierFromPoints(100)).toBe('elite');
  });
});
