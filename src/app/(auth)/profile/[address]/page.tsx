'use client';

import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import PointsBadge from '@/components/shared/PointsBadge';
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '@/lib/types';

// Mock profile data
const MOCK_PROFILE = {
  wallet_address: 'Abc1...xyz9',
  display_name: 'CabalOG.sol',
  level: 4,
  level_name: 'Guardian',
  total_xp: 720,
  next_level_xp: 1000,
  current_streak: 7,
  longest_streak: 14,
  total_submissions: 32,
  avg_score: 76,
  weekly_points: 85,
  badges: [
    { ...BADGE_DEFINITIONS[0], earned_at: '2026-01-15' },
    { ...BADGE_DEFINITIONS[1], earned_at: '2026-02-01' },
    { ...BADGE_DEFINITIONS[8], earned_at: '2026-02-20' },
  ],
};

// Streak calendar mock (last 28 days)
const streakCalendar = Array.from({ length: 28 }, (_, i) => ({
  date: new Date(Date.now() - (27 - i) * 86400000).toISOString().split('T')[0],
  submitted: Math.random() > 0.4,
}));

export default function ProfilePage() {
  const profile = MOCK_PROFILE;
  const levelProgress = ((profile.total_xp - 600) / (1000 - 600)) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <NeonCard hover={false} className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="h-20 w-20 rounded-2xl bg-bg-tertiary border-2 border-neon-cyan/30 flex items-center justify-center text-2xl font-mono font-bold gradient-text">
            {profile.display_name.slice(0, 2)}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-text-primary mb-1">{profile.display_name}</h2>
            <div className="text-sm text-text-muted font-mono mb-3">{profile.wallet_address}</div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {/* Level badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30">
                <span className="text-xs font-mono text-neon-purple font-bold">Lv.{profile.level}</span>
                <span className="text-xs text-neon-purple/70">{profile.level_name}</span>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-orange/10 border border-neon-orange/30">
                <span>🔥</span>
                <span className="text-xs font-mono text-neon-orange font-bold">{profile.current_streak} day streak</span>
              </div>

              <PointsBadge points={profile.weekly_points} size="sm" />
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-5 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Level {profile.level} Progress</span>
            <span className="text-xs font-mono text-text-secondary">
              {profile.total_xp} / {profile.next_level_xp} XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-bg-tertiary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
            />
          </div>
        </div>
      </NeonCard>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Submissions', value: profile.total_submissions, color: 'text-neon-cyan' },
          { label: 'Avg Score', value: profile.avg_score, color: 'text-neon-green' },
          { label: 'Total XP', value: profile.total_xp, color: 'text-neon-purple' },
          { label: 'Best Streak', value: `${profile.longest_streak}d`, color: 'text-neon-orange' },
        ].map((stat) => (
          <NeonCard key={stat.label} hover={false} className="p-4 text-center">
            <div className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-1">{stat.label}</div>
          </NeonCard>
        ))}
      </div>

      {/* Streak calendar */}
      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Submission Calendar</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-[10px] text-text-muted font-mono mb-1">
              {day}
            </div>
          ))}
          {streakCalendar.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm ${
                day.submitted
                  ? 'bg-neon-cyan/40 border border-neon-cyan/30'
                  : 'bg-bg-tertiary border border-border-subtle'
              }`}
              title={`${day.date}: ${day.submitted ? 'Submitted' : 'No submission'}`}
            />
          ))}
        </div>
      </NeonCard>

      {/* Badges */}
      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Badges ({profile.badges.length}/{BADGE_DEFINITIONS.length})
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {BADGE_DEFINITIONS.map((badge) => {
            const earned = profile.badges.find((b) => b.id === badge.id);
            return (
              <div
                key={badge.id}
                className={`text-center p-3 rounded-lg border transition-all ${
                  earned
                    ? 'bg-neon-cyan/5 border-neon-cyan/20'
                    : 'bg-bg-tertiary/50 border-border-subtle opacity-40'
                }`}
              >
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-xs font-medium text-text-primary truncate">{badge.name}</div>
                <div className="text-[10px] text-text-muted truncate">{badge.description}</div>
              </div>
            );
          })}
        </div>
      </NeonCard>
    </div>
  );
}
