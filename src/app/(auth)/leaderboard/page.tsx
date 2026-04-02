'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Lock, Trophy } from 'lucide-react';

import NeonCard from '@/components/shared/NeonCard';
import type { LeaderboardEntry } from '@/lib/types';

const TIER_CONFIG = {
  elite: { color: 'var(--tier-elite)', label: 'Cabal Elite' },
  member: { color: 'var(--tier-member)', label: 'Cabal Member' },
  initiate: { color: 'var(--tier-initiate)', label: 'Cabal Initiate' },
} as const;

type TimeRange = 'week' | 'all';

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
            { id: 'all' as const, label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-[color,background-color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
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
        /auth/i.test(error) || /unauthorized/i.test(error) || /authentication required/i.test(error) ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
            <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-accent-text" />
            </div>
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2" style={{ letterSpacing: '-0.03em' }}>
              Connect your wallet
            </h3>
            <p className="text-sm text-text-secondary max-w-xs leading-[1.7]">
              Sign in with your wallet to see the leaderboard rankings and your position.
            </p>
          </div>
        ) : (
          <NeonCard hover={false} className="p-4 border border-negative-border">
            <div className="text-sm text-negative">{error}</div>
          </NeonCard>
        )
      ) : null}

      {loading ? (
        <NeonCard hover={false} className="p-5">
          <div className="text-sm text-text-muted">Loading leaderboard...</div>
        </NeonCard>
      ) : null}

      {!loading && !error && entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
          <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6 text-accent-text" />
          </div>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-2" style={{ letterSpacing: '-0.03em' }}>
            No rankings yet
          </h3>
          <p className="text-sm text-text-secondary max-w-xs leading-[1.7]">
            Rankings appear after approved submissions are scored each week.
          </p>
        </div>
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
              <h3 className="text-sm font-semibold uppercase tracking-wider font-display" style={{ color: tierConfig.color }}>
                {tierConfig.label}
              </h3>
            </div>

            <NeonCard
              hover={false}
              className="overflow-hidden"
            >
              <table className="w-full">
                <caption className="sr-only">{tierConfig.label} tier leaderboard rankings</caption>
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
                  {tierEntries.map((entry) => (
                    <tr
                      key={entry.wallet_address}
                      className="border-b border-border-subtle/50 last:border-0 hover:bg-bg-raised/50 transition-[background-color]"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm font-bold text-text-primary">{entry.rank}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/profile/${entry.wallet_address}`}
                          className="text-sm font-medium text-text-primary hover:text-accent-text transition-[color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                        >
                          {entry.display_name || entry.wallet_address}
                        </Link>
                        <div className="text-xs text-text-muted font-mono truncate max-w-[120px] sm:max-w-none">
                          <span className="sm:hidden">{entry.wallet_address.slice(0, 4)}...{entry.wallet_address.slice(-4)}</span>
                          <span className="hidden sm:inline">{entry.wallet_address}</span>
                        </div>
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
                    </tr>
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
