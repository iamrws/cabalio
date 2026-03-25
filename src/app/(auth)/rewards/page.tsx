'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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

function generateIdempotencyKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <NeonCard glowColor="green" hover={false} className="p-8 text-center">
        <div className="text-sm text-text-muted uppercase tracking-wider mb-2">Claimable Rewards</div>
        <div className="text-5xl font-mono font-bold text-neon-green mb-1">
          <AnimatedCounter value={totalClaimable / 1e9} decimals={4} className="text-neon-green" />
        </div>
        <div className="text-lg text-text-secondary mb-6">SOL</div>

        {totalClaimable > 0 ? (
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClaim}
              disabled={claimLoading}
              className="gradient-bg px-8 py-3 rounded-xl font-semibold text-white shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 transition-shadow disabled:opacity-50"
            >
              {claimLoading ? 'Processing...' : 'Claim Rewards'}
            </motion.button>
            {claimError ? (
              <div className="mt-2 text-sm text-red-400">{claimError}</div>
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
        <NeonCard hover={false} className="p-4 border border-red-500/30">
          <div className="text-sm text-red-400">{error}</div>
        </NeonCard>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Reward History</h3>
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
          {rewards.map((reward, index) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <NeonCard hover={false} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg bg-bg-tertiary">
                      {reward.status === 'claimable' ? '🎁' : reward.status === 'claimed' ? '✅' : '⏳'}
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
                    <div className="font-mono font-bold text-neon-cyan">
                      {(reward.reward_amount_lamports / 1e9).toFixed(4)} SOL
                    </div>
                    <div className="text-xs text-text-muted">{reward.status}</div>
                  </div>
                </div>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
