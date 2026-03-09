'use client';

import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import AnimatedCounter from '@/components/shared/AnimatedCounter';
import type { Reward } from '@/lib/types';

const MOCK_REWARDS: Reward[] = [
  {
    id: '1',
    wallet_address: 'Abc1...xyz9',
    week_number: 9,
    points_earned: 142,
    reward_amount_lamports: 50000000, // 0.05 SOL
    status: 'claimable',
    claimed_at: null,
    tx_signature: null,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: '2',
    wallet_address: 'Abc1...xyz9',
    week_number: 8,
    points_earned: 98,
    reward_amount_lamports: 32000000,
    status: 'claimed',
    claimed_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    tx_signature: '4xKz...abc',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

export default function RewardsPage() {
  const claimableRewards = MOCK_REWARDS.filter((r) => r.status === 'claimable');
  const claimedRewards = MOCK_REWARDS.filter((r) => r.status === 'claimed');
  const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.reward_amount_lamports, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Balance card */}
      <NeonCard glowColor="green" hover={false} className="p-8 text-center">
        <div className="text-sm text-text-muted uppercase tracking-wider mb-2">Claimable Rewards</div>
        <div className="text-5xl font-mono font-bold text-neon-green mb-1">
          <AnimatedCounter value={totalClaimable / 1e9} decimals={4} className="text-neon-green" />
        </div>
        <div className="text-lg text-text-secondary mb-6">SOL</div>

        {totalClaimable > 0 ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="gradient-bg px-8 py-3 rounded-xl font-semibold text-white shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 transition-shadow"
          >
            Claim Rewards
          </motion.button>
        ) : (
          <div className="text-sm text-text-muted">
            Earn at least 25 points this week to qualify for rewards
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-center gap-6 text-sm">
          <div>
            <div className="font-mono text-text-primary">0</div>
            <div className="text-text-muted text-xs">This Week Points</div>
          </div>
          <div className="h-8 w-px bg-border-subtle" />
          <div>
            <div className="font-mono text-text-primary">25</div>
            <div className="text-text-muted text-xs">Min Required</div>
          </div>
          <div className="h-8 w-px bg-border-subtle" />
          <div>
            <div className="font-mono text-text-primary">Pro-rata</div>
            <div className="text-text-muted text-xs">Distribution</div>
          </div>
        </div>
      </NeonCard>

      {/* How rewards work */}
      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">How Rewards Work</h3>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex items-start gap-2">
            <span className="text-neon-cyan mt-0.5">1.</span>
            <span>A percentage of weekly JitoSOL yield is allocated to the reward pool</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neon-cyan mt-0.5">2.</span>
            <span>Members with 25+ weekly points qualify for distribution</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neon-cyan mt-0.5">3.</span>
            <span>Rewards are distributed pro-rata based on your share of total points</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-neon-cyan mt-0.5">4.</span>
            <span>Claim rewards directly to your wallet via a Solana transaction</span>
          </div>
        </div>
      </NeonCard>

      {/* Reward history */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Reward History</h3>
        <div className="space-y-3">
          {MOCK_REWARDS.map((reward, i) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <NeonCard
                hover={false}
                glowColor={reward.status === 'claimable' ? 'green' : 'cyan'}
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${
                      reward.status === 'claimable' ? 'bg-neon-green/10' : 'bg-bg-tertiary'
                    }`}>
                      {reward.status === 'claimable' ? '🎁' : '✅'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        Week {reward.week_number} Reward
                      </div>
                      <div className="text-xs text-text-muted font-mono">
                        {reward.points_earned} pts earned
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono font-bold ${
                      reward.status === 'claimable' ? 'text-neon-green' : 'text-text-secondary'
                    }`}>
                      {(reward.reward_amount_lamports / 1e9).toFixed(4)} SOL
                    </div>
                    <div className={`text-xs ${
                      reward.status === 'claimable' ? 'text-neon-green' : 'text-text-muted'
                    }`}>
                      {reward.status === 'claimable' ? 'Claimable' : 'Claimed'}
                    </div>
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
