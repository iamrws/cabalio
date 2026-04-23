'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Gift, CheckCircle2, Clock, Lock } from 'lucide-react';

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

/* ── Lazy-loaded earnings chart (client-only, code-split) ── */
const EarningsChart = dynamic(() => import('./EarningsChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[192px] rounded-lg bg-bg-raised/40 animate-pulse" aria-hidden="true" />
  ),
});

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
      setProjectionsLoading(true);
      setError('');
      // Fire both requests concurrently; treat projections as best-effort.
      const [summaryRes, projectionsRes] = await Promise.allSettled([
        fetch('/api/me/summary', { cache: 'no-store' }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || 'Failed to load rewards');
          return data;
        }),
        fetch('/api/me/reward-projections', { cache: 'no-store' }).then(async (r) => {
          if (!r.ok) return null;
          return r.json();
        }),
      ]);

      if (cancelled) return;

      if (summaryRes.status === 'fulfilled') {
        const data = summaryRes.value;
        setRewards(data.rewards || []);
        setWeeklyPoints(data.stats?.weekly_points || 0);
      } else {
        setError(summaryRes.reason instanceof Error ? summaryRes.reason.message : 'Failed to load rewards');
      }
      setLoading(false);

      if (projectionsRes.status === 'fulfilled' && projectionsRes.value) {
        setProjections(projectionsRes.value);
      }
      setProjectionsLoading(false);
    };

    void load();
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
            <div className="relative h-2 w-full bg-bg-raised rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 w-full rounded-full transition-[transform,background-color] duration-700 ease-out ${
                  isAheadOfPace ? 'bg-positive' : 'bg-accent'
                }`}
                style={{ transform: `scaleX(${pacePercent / 100})`, transformOrigin: 'left' }}
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
      <NeonCard hover={false} className="p-6 sm:p-8 text-center">
        <div className="text-sm text-text-muted uppercase tracking-wider mb-2 font-display">Claimable Rewards</div>
        <div className={`text-5xl font-mono font-bold mb-1 ${totalClaimable > 0 ? 'text-positive' : 'text-text-tertiary'}`}>
          <AnimatedCounter value={totalClaimable / 1e9} decimals={4} className={totalClaimable > 0 ? 'text-positive' : 'text-text-tertiary'} />
        </div>
        <div className="text-lg text-text-secondary mb-6">SOL</div>

        {totalClaimable > 0 ? (
          <div>
            <button
              onClick={handleClaim}
              disabled={claimLoading}
              className="bg-accent px-8 py-3 rounded-xl font-semibold text-[var(--bg-base)] hover:bg-accent-dim active:scale-[0.98] transition-[color,background-color,transform,box-shadow] duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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

      {error && !/auth/i.test(error) ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Reward History</h3>

        {/auth/i.test(error) ? (
          <NeonCard hover={false} className="p-6">
            <div className="flex flex-col items-center justify-center min-h-[30vh] text-center px-6">
              <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-accent-text" />
              </div>
              <h3 className="text-lg font-display font-semibold text-text-primary mb-2" style={{ letterSpacing: '-0.03em' }}>
                Connect your wallet
              </h3>
              <p className="text-sm text-text-secondary max-w-xs leading-[1.7]">
                Sign in to view your reward history and claim earnings.
              </p>
            </div>
          </NeonCard>
        ) : null}

        {!error && loading ? (
          <NeonCard hover={false} className="p-4">
            <div className="text-sm text-text-muted">Loading rewards...</div>
          </NeonCard>
        ) : null}

        {!error && !loading && rewards.length === 0 ? (
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
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-bg-raised" aria-label={reward.status === 'claimable' ? 'Claimable' : reward.status === 'claimed' ? 'Claimed' : 'Expired'}>
                      {reward.status === 'claimable' ? (
                        <Gift className="w-4 h-4" />
                      ) : reward.status === 'claimed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
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
