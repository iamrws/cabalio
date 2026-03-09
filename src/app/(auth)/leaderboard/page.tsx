'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import { TIER_COLORS } from '@/lib/constants';
import type { LeaderboardEntry } from '@/lib/types';

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, wallet_address: 'Abc1...xyz9', display_name: 'SolanaBuilder', avatar_url: null, level: 5, total_points: 285, submission_count: 12, best_score: 95, tier: 'elite' },
  { rank: 2, wallet_address: 'Def2...uvw8', display_name: 'CabalOG.sol', avatar_url: null, level: 4, total_points: 210, submission_count: 9, best_score: 88, tier: 'elite' },
  { rank: 3, wallet_address: 'Ghi3...rst7', display_name: 'MevMaxi', avatar_url: null, level: 4, total_points: 155, submission_count: 7, best_score: 82, tier: 'elite' },
  { rank: 4, wallet_address: 'Jkl4...opq6', display_name: 'ArtistAnon', avatar_url: null, level: 3, total_points: 98, submission_count: 5, best_score: 78, tier: 'elite' },
  { rank: 5, wallet_address: 'Mno5...lmn5', display_name: 'StakeKing', avatar_url: null, level: 3, total_points: 72, submission_count: 4, best_score: 74, tier: 'elite' },
  { rank: 6, wallet_address: 'Pqr6...ijk4', display_name: 'DeFiDegen', avatar_url: null, level: 2, total_points: 45, submission_count: 3, best_score: 71, tier: 'member' },
  { rank: 7, wallet_address: 'Stu7...ghi3', display_name: 'ValidatorVibes', avatar_url: null, level: 2, total_points: 32, submission_count: 2, best_score: 68, tier: 'member' },
  { rank: 8, wallet_address: 'Vwx8...def2', display_name: 'NewCabal', avatar_url: null, level: 1, total_points: 15, submission_count: 1, best_score: 62, tier: 'initiate' },
];

type TimeRange = 'week' | 'alltime';

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const getTierStyle = (tier: string) => {
    const config = TIER_COLORS[tier as keyof typeof TIER_COLORS];
    return config;
  };

  const groupedByTier = {
    elite: MOCK_LEADERBOARD.filter((e) => e.tier === 'elite'),
    member: MOCK_LEADERBOARD.filter((e) => e.tier === 'member'),
    initiate: MOCK_LEADERBOARD.filter((e) => e.tier === 'initiate'),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 p-1 bg-bg-secondary rounded-xl border border-border-subtle">
          {[
            { id: 'week' as const, label: 'This Week' },
            { id: 'alltime' as const, label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === tab.id
                  ? 'bg-bg-tertiary text-neon-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-text-muted font-mono">
          Week 10, 2026
        </div>
      </div>

      {/* Tier sections */}
      {(['elite', 'member', 'initiate'] as const).map((tier) => {
        const entries = groupedByTier[tier];
        if (entries.length === 0) return null;
        const tierConfig = getTierStyle(tier);

        return (
          <div key={tier}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tierConfig.border, boxShadow: tierConfig.glow }}
              />
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: tierConfig.border }}>
                {tierConfig.label}
              </h3>
              <span className="text-xs text-text-muted font-mono">
                {tier === 'elite' ? '50+ pts' : tier === 'member' ? '25+ pts' : 'Active'}
              </span>
            </div>

            <NeonCard
              hover={false}
              glowColor={tier === 'elite' ? 'gold' : tier === 'member' ? 'cyan' : 'green'}
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
                  {entries.map((entry, i) => (
                    <motion.tr
                      key={entry.wallet_address}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border-subtle/50 last:border-0 hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className={`font-mono text-sm font-bold ${
                          entry.rank === 1 ? 'text-yellow-400' :
                          entry.rank === 2 ? 'text-gray-300' :
                          entry.rank === 3 ? 'text-orange-400' :
                          'text-text-muted'
                        }`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center text-xs font-mono">
                            {(entry.display_name || entry.wallet_address).slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {entry.display_name || entry.wallet_address}
                            </div>
                            <div className="text-xs text-text-muted font-mono">{entry.wallet_address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs font-mono text-text-secondary">Lv.{entry.level}</span>
                      </td>
                      <td className="text-right px-5 py-3 hidden md:table-cell">
                        <span className="text-sm font-mono text-text-secondary">{entry.submission_count}</span>
                      </td>
                      <td className="text-right px-5 py-3 hidden md:table-cell">
                        <span className={`text-sm font-mono font-bold ${
                          entry.best_score >= 80 ? 'text-neon-green' :
                          entry.best_score >= 60 ? 'text-neon-cyan' :
                          'text-neon-orange'
                        }`}>
                          {entry.best_score}
                        </span>
                      </td>
                      <td className="text-right px-5 py-3">
                        <span className="font-mono font-bold text-neon-cyan">{entry.total_points}</span>
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
