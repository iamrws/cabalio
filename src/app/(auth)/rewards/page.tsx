'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

import NeonCard from '@/components/shared/NeonCard';
import AnimatedCounter from '@/components/shared/AnimatedCounter';

interface Reward {
  id: string;
  week_number: number;
  points_earned: number;
  reward_amount_lamports: number;
  status: 'claimable' | 'claimed' | 'expired';
  tx_signature: string | null;
  created_at: string;
}

interface WeekHistory {
  week_number: number;
  year: number;
  points: number;
  reward_sol: number;
}

interface Projections {
  avg_weekly_points: number;
  current_week_points: number;
  projected_week_points: number;
  estimated_weekly_sol: number;
  estimated_monthly_sol: number;
  trend: 'up' | 'down' | 'stable';
  trend_pct: number;
  weeks_history: WeekHistory[];
}

function generateIdempotencyKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ── Trend arrow component ── */
function TrendIndicator({ trend, pct }: { trend: 'up' | 'down' | 'stable'; pct: number }) {
  const color =
    trend === 'up' ? 'text-positive' : trend === 'down' ? 'text-negative' : 'text-text-muted';
  const arrow = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '\u2192';
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-mono ${color}`}>
      <span className="text-base">{arrow}</span>
      {Math.abs(pct)}%
    </span>
  );
}

/* ── Earnings History Bar Chart (inline SVG) ── */
function EarningsChart({ weeks }: { weeks: WeekHistory[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxPoints = Math.max(...weeks.map((w) => w.points), 1);
  const barCount = weeks.length;
  const chartHeight = 160;
  const barGap = 6;
  const barWidth = `calc((100% - ${(barCount - 1) * barGap}px) / ${barCount})`;

  return (
    <div className="relative">
      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-bg-raised border border-border-subtle rounded-lg px-3 py-1.5 text-xs font-mono shadow-lg z-10 whitespace-nowrap pointer-events-none transition-opacity duration-150"
        >
          <span className="text-text-primary">{weeks[hoveredIdx].points} pts</span>
          <span className="text-text-muted mx-1">·</span>
          <span className="text-accent-text">{weeks[hoveredIdx].reward_sol.toFixed(4)} SOL</span>
        </div>
      )}

      {/* Bars */}
      <div
        className="flex items-end"
        style={{ height: chartHeight, gap: barGap }}
      >
        {weeks.map((week, idx) => {
          const isCurrentWeek = idx === weeks.length - 1;
          const heightPct = maxPoints > 0 ? (week.points / maxPoints) * 100 : 0;
          const minHeight = week.points > 0 ? 4 : 1;
          return (
            <div
              key={`${week.year}-${week.week_number}`}
              className="flex flex-col items-center justify-end"
              style={{ width: barWidth, height: '100%' }}
            >
              <div
                className={`w-full rounded-t-md cursor-pointer transition-all duration-500 ${
                  isCurrentWeek
                    ? 'bg-accent'
                    : hoveredIdx === idx
                      ? 'bg-accent/70'
                      : 'bg-accent/30'
                }`}
                style={{ minHeight, height: `${Math.max(heightPct, minHeight / chartHeight * 100)}%` }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </div>
          );
        })}
      </div>

      {/* Week labels */}
      <div className="flex mt-2" style={{ gap: barGap }}>
        {weeks.map((week, idx) => {
          const isCurrentWeek = idx === weeks.length - 1;
          return (
            <div
              key={`label-${week.year}-${week.week_number}`}
              className={`text-center text-[10px] font-mono ${
                isCurrentWeek ? 'text-accent-text' : 'text-text-muted'
              }`}
              style={{ width: barWidth }}
            >
              {isCurrentWeek ? 'Now' : `W${week.week_number}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [projections, setProjections] = useState<Projections | null>(null);
  const [projectionsLoading, setProjectionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/me/summary', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load rewards');
        }
        if (!cancelled) {
          setRewards(data.rewards || []);
          setWeeklyPoints(data.stats?.weekly_points || 0);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load rewards');
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProjections = async () => {
      setProjectionsLoading(true);
      try {
        const res = await fetch('/api/me/reward-projections', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && !cancelled) {
          setProjections(data);
        }
      } catch {
        // Projections are supplemental; don't block the page on failure
      } finally {
        if (!cancelled) setProjectionsLoading(false);
      }
    };

    void loadProjections();
    return () => {
      cancelled = true;
    };
  }, []);

  const claimableRewards = useMemo(
    () => rewards.filter((reward) => reward.status === 'claimable'),
    [rewards]
  );
  const totalClaimable = useMemo(
    () => claimableRewards.reduce((sum, reward) => sum + reward.reward_amount_lamports, 0),
    [claimableRewards]
  );

  const handleClaim = useCallback(async () => {
    if (claimableRewards.length === 0 || claimLoading) return;

    setClaimLoading(true);
    setClaimError('');

    try {
      // Claim each eligible reward sequentially with idempotency protection
      for (const reward of claimableRewards) {
        const idempotencyKey = generateIdempotencyKey();
        const res = await fetch('/api/rewards/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rewardId: reward.id,
            idempotencyKey,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          // 503 means the feature is gated/not yet enabled
          if (res.status === 503) {
            setClaimError(data.error || 'Claiming is not yet enabled.');
            break;
          }
          setClaimError(data.error || 'Claim failed');
          break;
        }

        // Update local state to reflect the claim
        setRewards((prev) =>
          prev.map((r) =>
            r.id === reward.id ? { ...r, status: 'claimed' as const } : r
          )
        );
      }
    } catch {
      setClaimError('Network error while claiming rewards');
    } finally {
      setClaimLoading(false);
    }
  }, [claimableRewards, claimLoading]);

  // Pace indicator values
  const paceRatio =
    projections && projections.avg_weekly_points > 0
      ? projections.current_week_points / projections.avg_weekly_points
      : 0;
  const pacePercent = Math.min(paceRatio * 100, 100);
  const isAheadOfPace = paceRatio >= 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Earnings Projection Card ── */}
      {!projectionsLoading && projections && (
        <div>
          <NeonCard hover={false} className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-text-muted uppercase tracking-wider mb-1 font-display">
                  Estimated Weekly Earnings
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-mono font-bold text-accent-text">
                    <AnimatedCounter
                      value={projections.estimated_weekly_sol}
                      decimals={4}
                      className="text-accent-text"
                    />
                  </span>
                  <span className="text-lg text-text-secondary font-display">SOL</span>
                </div>
                <div className="mt-1 text-sm text-text-muted font-mono">
                  ~{projections.estimated_monthly_sol.toFixed(4)} SOL / month
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <TrendIndicator trend={projections.trend} pct={projections.trend_pct} />
                <div className="text-xs text-text-muted">vs prior 2 weeks</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle">
              <div className="text-xs text-text-muted">
                Based on your last 4 weeks of activity
                <span className="mx-2 text-border-subtle">|</span>
                <span className="font-mono text-text-secondary">
                  {projections.avg_weekly_points} avg pts/week
                </span>
              </div>
            </div>
          </NeonCard>
        </div>
      )}

      {/* ── Earnings History Chart ── */}
      {!projectionsLoading && projections && projections.weeks_history.length > 0 && (
        <div>
          <NeonCard hover={false} className="p-6">
            <h3 className="text-sm font-display text-text-muted uppercase tracking-wider mb-4">
              Weekly Earnings — Last 8 Weeks
            </h3>
            <EarningsChart weeks={projections.weeks_history} />
          </NeonCard>
        </div>
      )}

      {/* ── Pace Indicator ── */}
      {!projectionsLoading && projections && (
        <div>
          <NeonCard hover={false} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-text-muted font-display">This Week So Far</div>
              <div className="font-mono text-sm text-text-primary">
                {projections.current_week_points} pts
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-bg-raised rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                  isAheadOfPace ? 'bg-positive' : 'bg-accent'
                }`}
                style={{ width: `${pacePercent}%` }}
              />
              {/* Average marker */}
              {projections.avg_weekly_points > 0 && (
                <div
                  className="absolute top-0 h-full w-px bg-text-muted/50"
                  style={{ left: '100%' }}
                  title={`Weekly average: ${projections.avg_weekly_points} pts`}
                />
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-text-muted">
                {isAheadOfPace
                  ? "You're on track for a strong week"
                  : 'Pick up the pace to match your average'}
              </div>
              <div className="text-xs font-mono text-text-muted">
                avg {projections.avg_weekly_points}
              </div>
            </div>

            {projections.projected_week_points > 0 && (
              <div className="mt-2 pt-2 border-t border-border-subtle text-xs text-text-muted">
                Projected this week:{' '}
                <span className="font-mono text-text-secondary">
                  {projections.projected_week_points} pts
                </span>
                <span className="mx-1">·</span>
                <span className="font-mono text-accent-text">
                  {(projections.projected_week_points * (projections.estimated_weekly_sol / (projections.avg_weekly_points || 1))).toFixed(4)} SOL
                </span>
              </div>
            )}
          </NeonCard>
        </div>
      )}

      {/* ── Projections skeleton ── */}
      {projectionsLoading && (
        <NeonCard hover={false} className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-bg-raised rounded w-1/3" />
            <div className="h-10 bg-bg-raised rounded w-1/2" />
            <div className="h-2 bg-bg-raised rounded w-2/3" />
          </div>
        </NeonCard>
      )}

      {/* ── Claimable Rewards (existing) ── */}
      <NeonCard hover={false} className="p-8 text-center">
        <div className="text-sm text-text-muted uppercase tracking-wider mb-2 font-display">Claimable Rewards</div>
        <div className="text-5xl font-mono font-bold text-positive mb-1">
          <AnimatedCounter value={totalClaimable / 1e9} decimals={4} className="text-positive" />
        </div>
        <div className="text-lg text-text-secondary mb-6">SOL</div>

        {totalClaimable > 0 ? (
          <div>
            <button
              onClick={handleClaim}
              disabled={claimLoading}
              className="bg-accent px-8 py-3 rounded-xl font-semibold text-[#08080a] hover:bg-accent-dim active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {claimLoading ? 'Processing...' : 'Claim Rewards'}
            </button>
            {claimError ? (
              <div className="mt-2 text-sm text-negative">{claimError}</div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-text-muted">
            No claimable rewards yet. Keep submitting approved work to qualify.
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-center gap-6 text-sm">
          <div>
            <div className="font-mono text-text-primary">{weeklyPoints}</div>
            <div className="text-text-muted text-xs">This Week Points</div>
          </div>
          <div className="h-8 w-px bg-border-subtle" />
          <div>
            <div className="font-mono text-text-primary">25</div>
            <div className="text-text-muted text-xs">Min Required</div>
          </div>
        </div>
      </NeonCard>

      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Reward History</h3>
        {loading ? (
          <NeonCard hover={false} className="p-4">
            <div className="text-sm text-text-muted">Loading rewards...</div>
          </NeonCard>
        ) : null}

        {!loading && rewards.length === 0 ? (
          <NeonCard hover={false} className="p-4">
            <div className="text-sm text-text-muted">No reward records yet.</div>
          </NeonCard>
        ) : null}

        <div className="space-y-3">
          {rewards.map((reward) => (
            <div key={reward.id}>
              <NeonCard hover={false} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg bg-bg-raised">
                      <span aria-hidden="true">{reward.status === 'claimable' ? '🎁' : reward.status === 'claimed' ? '✅' : '⏳'}</span>
                      <span className="sr-only">{reward.status === 'claimable' ? 'Claimable' : reward.status === 'claimed' ? 'Claimed' : 'Expired'}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        Week {reward.week_number} Reward
                      </div>
                      <div className="text-xs text-text-muted font-mono">
                        {reward.points_earned} pts · {new Date(reward.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-accent-text">
                      {(reward.reward_amount_lamports / 1e9).toFixed(4)} SOL
                    </div>
                    <div className="text-xs text-text-muted">{reward.status}</div>
                  </div>
                </div>
              </NeonCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
