'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import PointsBadge from '@/components/shared/PointsBadge';
import { BADGE_DEFINITIONS } from '@/lib/types';
import { getLevelInfo } from '@/lib/points';

interface SummaryResponse {
  wallet_address: string;
  user: {
    display_name: string | null;
    wallet_address: string;
    level: number;
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    badges: Array<{ id: string; earned_at: string }>;
  };
  stats: {
    total_submissions: number;
    approved_submissions: number;
    pending_submissions: number;
    weekly_points: number;
    avg_score: number;
  };
}

export default function ProfilePage() {
  const params = useParams<{ address: string }>();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/me/summary', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }
        if (!cancelled) {
          setSummary(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.address]);

  const levelInfo = useMemo(
    () => getLevelInfo(summary?.user.total_xp || 0),
    [summary?.user.total_xp]
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <NeonCard hover={false} className="p-5">
          <div className="text-sm text-text-muted">Loading profile...</div>
        </NeonCard>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-3xl mx-auto">
        <NeonCard hover={false} className="p-5 border border-red-500/30">
          <div className="text-sm text-red-400">{error || 'Profile unavailable'}</div>
        </NeonCard>
      </div>
    );
  }

  const displayName = summary.user.display_name || `${summary.wallet_address.slice(0, 4)}...${summary.wallet_address.slice(-4)}`;
  const earnedBadgeIds = new Set(summary.user.badges?.map((badge) => badge.id) || []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <NeonCard hover={false} className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="h-20 w-20 rounded-2xl bg-bg-tertiary border-2 border-neon-cyan/30 flex items-center justify-center text-2xl font-mono font-bold gradient-text">
            {displayName.slice(0, 2)}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-text-primary mb-1">{displayName}</h2>
            <div className="text-sm text-text-muted font-mono mb-3">{summary.wallet_address}</div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30">
                <span className="text-xs font-mono text-neon-purple font-bold">Lv.{levelInfo.level}</span>
                <span className="text-xs text-neon-purple/70">{levelInfo.name}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-orange/10 border border-neon-orange/30">
                <span>🔥</span>
                <span className="text-xs font-mono text-neon-orange font-bold">
                  {summary.user.current_streak} day streak
                </span>
              </div>
              <PointsBadge points={summary.stats.weekly_points} size="sm" />
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Level Progress</span>
            <span className="text-xs font-mono text-text-secondary">
              {summary.user.total_xp} XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-bg-tertiary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(levelInfo.progress * 100, 2)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
            />
          </div>
        </div>
      </NeonCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Submissions', value: summary.stats.total_submissions, color: 'text-neon-cyan' },
          { label: 'Approved', value: summary.stats.approved_submissions, color: 'text-neon-green' },
          { label: 'Avg Score', value: summary.stats.avg_score, color: 'text-neon-purple' },
          { label: 'Best Streak', value: `${summary.user.longest_streak}d`, color: 'text-neon-orange' },
        ].map((stat) => (
          <NeonCard key={stat.label} hover={false} className="p-4 text-center">
            <div className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-1">{stat.label}</div>
          </NeonCard>
        ))}
      </div>

      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Badges ({earnedBadgeIds.size}/{BADGE_DEFINITIONS.length})
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);
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
