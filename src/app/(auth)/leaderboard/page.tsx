'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import type { LeaderboardEntry } from '@/lib/types';

const TIER_CONFIG = {
  elite: { color: 'var(--tier-elite)', label: 'Cabal Elite' },
  member: { color: 'var(--tier-member)', label: 'Cabal Member' },
  initiate: { color: 'var(--tier-initiate)', label: 'Cabal Initiate' },
} as const;

type TimeRange = 'week' | 'alltime';

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/leaderboard?range=${timeRange}`, {
          method: 'GET',
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load leaderboard');
        }
        if (!cancelled) {
          setEntries(data.leaderboard || []);
          setWeekNumber(data.week_number ?? null);
          setParticipantCount(data.total_participants || 0);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load');
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const groupedByTier = useMemo(
    () => ({
      elite: entries.filter((entry) => entry.tier === 'elite'),
      member: entries.filter((entry) => entry.tier === 'member'),
      initiate: entries.filter((entry) => entry.tier === 'initiate'),
    }),
    [entries]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 p-1 bg-bg-surface rounded-xl border border-border-subtle">
          {[
            { id: 'week' as const, label: 'This Week' },
            { id: 'alltime' as const, label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === tab.id
                  ? 'bg-bg-raised text-accent-text'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-text-muted font-mono">
          {timeRange === 'week' && weekNumber ? `Week ${weekNumber}` : 'All-Time Rankings'}
        </div>
      </div>

      <NeonCard hover={false} className="p-3">
        <div className="text-xs text-text-secondary">
          Showing points for {participantCount} holder accounts.
        </div>
      </NeonCard>

      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      {loading ? (
        <NeonCard hover={false} className="p-5">
          <div className="text-sm text-text-muted">Loading leaderboard...</div>
        </NeonCard>
      ) : null}

      {!loading && entries.length === 0 ? (
        <NeonCard hover={false} className="p-5">
          <div className="text-sm text-text-muted">No approved submissions yet.</div>
        </NeonCard>
      ) : null}

      {(['elite', 'member', 'initiate'] as const).map((tier) => {
        const tierEntries = groupedByTier[tier];
        if (tierEntries.length === 0) return null;
        const tierConfig = TIER_CONFIG[tier];

        return (
          <div key={tier}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tierConfig.color }}
              />
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: tierConfig.color }}>
                {tierConfig.label}
              </h3>
            </div>

            <NeonCard
              hover={false}
              className="overflow-hidden"
            >
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border-subtle">
                    <th className="text-left px-5 py-3 w-12">#</th>
                    <th className="text-left px-5 py-3">Member</th>
                    <th className="text-right px-5 py-3 hidden sm:table-cell">Level</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Submissions</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Best Score</th>
                    <th className="text-right px-5 py-3">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {tierEntries.map((entry, index) => (
                    <motion.tr
                      key={entry.wallet_address}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border-subtle/50 last:border-0 hover:bg-bg-raised/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-bold text-text-primary">{entry.rank}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/profile/${entry.wallet_address}`}
                          className="text-sm font-medium text-text-primary hover:text-accent-text"
                        >
                          {entry.display_name || entry.wallet_address}
                        </Link>
                        <div className="text-xs text-text-muted font-mono">{entry.wallet_address}</div>
                      </td>
                      <td className="text-right px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs font-mono text-text-secondary">Lv.{entry.level}</span>
                      </td>
                      <td className="text-right px-5 py-3 hidden md:table-cell">
                        <span className="text-sm font-mono text-text-secondary">{entry.submission_count}</span>
                      </td>
                      <td className="text-right px-5 py-3 hidden md:table-cell">
                        <span className="text-sm font-mono font-bold text-positive">{entry.best_score}</span>
                      </td>
                      <td className="text-right px-5 py-3">
                        <span className="font-mono font-bold text-accent-text">{entry.total_points}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </NeonCard>
          </div>
        );
      })}
    </div>
  );
}
