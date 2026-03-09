'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import PointsBadge from '@/components/shared/PointsBadge';
import { REACTION_EMOJIS, type ReactionType, type Submission } from '@/lib/types';

// Mock data for initial build
const MOCK_SUBMISSIONS: (Submission & { user_display: string })[] = [
  {
    id: '1',
    wallet_address: 'Abc1...xyz9',
    type: 'x_post',
    url: 'https://x.com/example/status/1',
    image_path: null,
    title: 'Why JitoSOL is the future of liquid staking on Solana',
    content_text: 'Thread: JitoSOL combines staking rewards with MEV tips, creating the highest-yield LST on Solana...',
    raw_score: 8.2,
    normalized_score: 82,
    scoring_breakdown: null,
    points_awarded: 85,
    x_metrics: { likes: 42, retweets: 12, replies: 8, impressions: 3200 },
    status: 'scored',
    week_number: 10,
    created_at: new Date().toISOString(),
    scored_at: new Date().toISOString(),
    user_display: 'CabalOG.sol',
    reactions: [
      { type: 'fire', count: 5, user_reacted: false },
      { type: 'brain', count: 3, user_reacted: true },
    ],
  },
  {
    id: '2',
    wallet_address: 'Def2...uvw8',
    type: 'art',
    url: null,
    image_path: '/placeholder-art.png',
    title: 'Cabal Rising — Digital Art',
    content_text: 'A cyberpunk interpretation of the Jito Cabal aesthetic...',
    raw_score: 7.5,
    normalized_score: 75,
    scoring_breakdown: null,
    points_awarded: 62,
    x_metrics: null,
    status: 'scored',
    week_number: 10,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    scored_at: new Date(Date.now() - 3500000).toISOString(),
    user_display: 'ArtistAnon',
    reactions: [
      { type: 'art', count: 8, user_reacted: false },
      { type: 'fire', count: 2, user_reacted: false },
    ],
  },
  {
    id: '3',
    wallet_address: 'Ghi3...rst7',
    type: 'blog',
    url: 'https://medium.com/example',
    image_path: null,
    title: 'Deep Dive: Jito MEV Architecture and Its Impact on Solana',
    content_text: 'In this article, we explore how Jito\'s MEV infrastructure processes 590M bundles...',
    raw_score: 9.1,
    normalized_score: 91,
    scoring_breakdown: null,
    points_awarded: 105,
    x_metrics: null,
    status: 'scored',
    week_number: 10,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    scored_at: new Date(Date.now() - 7100000).toISOString(),
    user_display: 'SolanaBuilder',
    reactions: [
      { type: 'brain', count: 12, user_reacted: true },
      { type: 'hundred', count: 6, user_reacted: false },
      { type: 'clap', count: 4, user_reacted: false },
    ],
  },
];

const typeIcons: Record<string, { icon: string; label: string; color: string }> = {
  x_post: { icon: '📢', label: 'Jito Content', color: 'text-neon-cyan' },
  blog: { icon: '📝', label: 'Blog', color: 'text-neon-purple' },
  art: { icon: '🎨', label: 'Art', color: 'text-neon-orange' },
};

const dailyChallenge = "Today's vibe: Share your hottest take on Solana's MEV landscape";

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome + Submit CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
          <p className="text-text-secondary text-sm">3 submissions remaining today</p>
        </div>
        <Link href="/submit">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="gradient-bg px-6 py-3 rounded-xl font-semibold text-white shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 transition-shadow"
          >
            + Submit Content
          </motion.button>
        </Link>
      </div>

      {/* Daily Challenge */}
      <NeonCard glowColor="purple" className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">💡</span>
          <div>
            <div className="text-xs text-neon-purple font-mono uppercase tracking-wider mb-0.5">Daily Challenge</div>
            <div className="text-sm text-text-primary">{dailyChallenge}</div>
          </div>
        </div>
      </NeonCard>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Week Points', value: '0', icon: '⭐' },
          { label: 'Streak', value: '0 days', icon: '🔥' },
          { label: 'Submissions', value: '0', icon: '📊' },
          { label: 'Rank', value: '--', icon: '🏆' },
        ].map((stat) => (
          <NeonCard key={stat.label} hover={false} className="p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-lg font-mono font-bold text-text-primary">{stat.value}</div>
            <div className="text-xs text-text-muted">{stat.label}</div>
          </NeonCard>
        ))}
      </div>

      {/* Community Feed */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Community Feed</h3>
        <div className="space-y-4">
          {MOCK_SUBMISSIONS.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <NeonCard className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center text-xs font-mono">
                      {sub.user_display.slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{sub.user_display}</div>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className={typeIcons[sub.type].color}>{typeIcons[sub.type].icon}</span>
                        <span>{typeIcons[sub.type].label}</span>
                        <span>·</span>
                        <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {sub.normalized_score && (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-lg font-mono font-bold ${
                          sub.normalized_score >= 80 ? 'text-neon-green' :
                          sub.normalized_score >= 60 ? 'text-neon-cyan' :
                          'text-neon-orange'
                        }`}>
                          {sub.normalized_score}
                        </div>
                        <div className="text-[10px] text-text-muted uppercase">Score</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <h4 className="text-base font-semibold text-text-primary mb-1">{sub.title}</h4>
                <p className="text-sm text-text-secondary line-clamp-2 mb-3">{sub.content_text}</p>

                {/* X metrics */}
                {sub.x_metrics && (
                  <div className="flex items-center gap-4 text-xs text-text-muted mb-3 font-mono">
                    <span>❤️ {sub.x_metrics.likes}</span>
                    <span>🔄 {sub.x_metrics.retweets}</span>
                    <span>💬 {sub.x_metrics.replies}</span>
                  </div>
                )}

                {/* Footer: Reactions + Points */}
                <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                  <div className="flex items-center gap-2">
                    {sub.reactions?.map((r) => (
                      <button
                        key={r.type}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                          r.user_reacted
                            ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan'
                            : 'bg-bg-tertiary border border-border-subtle text-text-muted hover:text-text-primary hover:border-text-muted'
                        }`}
                      >
                        <span>{REACTION_EMOJIS[r.type as ReactionType]}</span>
                        <span className="font-mono">{r.count}</span>
                      </button>
                    ))}
                  </div>
                  <PointsBadge points={sub.points_awarded} size="sm" showLabel={false} />
                </div>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
