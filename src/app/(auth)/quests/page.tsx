'use client';

import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import type { Quest } from '@/lib/types';

const MOCK_QUESTS: Quest[] = [
  {
    id: '1',
    title: 'Thread Master',
    description: 'Write a detailed piece about JitoSOL staking benefits and share it with the community.',
    type: 'x_post',
    requirements: 'Submit Jito content about JitoSOL staking benefits',
    bonus_multiplier: 1.2,
    points_reward: 25,
    status: 'active',
    progress: 0,
    target: 1,
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
  {
    id: '2',
    title: 'Deep Dive Writer',
    description: 'Write a blog post comparing Jito MEV infrastructure to competitors on other chains.',
    type: 'blog',
    requirements: 'Submit a blog article (500+ words) comparing Jito MEV to alternatives',
    bonus_multiplier: 1.2,
    points_reward: 40,
    status: 'active',
    progress: 0,
    target: 1,
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Cabal Artist',
    description: 'Create original artwork featuring the Cabal aesthetic — cyberpunk, neon, dark themes.',
    type: 'art',
    requirements: 'Submit original artwork with Cabal-themed aesthetic',
    bonus_multiplier: 1.2,
    points_reward: 30,
    status: 'active',
    progress: 0,
    target: 1,
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
  {
    id: '4',
    title: 'Consistency King',
    description: 'Submit at least one piece of content every day for 5 consecutive days this week.',
    type: 'any',
    requirements: 'Submit content on 5 different days this week',
    bonus_multiplier: 1.0,
    points_reward: 50,
    status: 'active',
    progress: 0,
    target: 5,
    starts_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  },
];

const typeColors: Record<string, string> = {
  x_post: 'text-text-primary bg-text-primary/10 border-text-primary/20',
  blog: 'text-neon-purple bg-neon-purple/10 border-neon-purple/20',
  art: 'text-neon-orange bg-neon-orange/10 border-neon-orange/20',
  any: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20',
};

export default function QuestsPage() {
  const daysRemaining = 6;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Weekly Quests</h2>
          <p className="text-sm text-text-secondary">Complete quests for bonus points and badges</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-neon-cyan">{daysRemaining} days left</div>
          <div className="text-xs text-text-muted">Resets every Monday</div>
        </div>
      </div>

      {/* Quest cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_QUESTS.map((quest, i) => (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <NeonCard
              glowColor={quest.type === 'art' ? 'orange' : quest.type === 'blog' ? 'purple' : 'cyan'}
              className="p-5 h-full flex flex-col"
            >
              {/* Quest type badge + reward */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${typeColors[quest.type]}`}>
                  {quest.type === 'x_post' ? 'Jito Content' : quest.type === 'any' ? 'Any Type' : quest.type.charAt(0).toUpperCase() + quest.type.slice(1)}
                </span>
                <span className="text-xs font-mono text-neon-green">+{quest.points_reward} pts</span>
              </div>

              {/* Title + description */}
              <h3 className="text-base font-semibold text-text-primary mb-1">{quest.title}</h3>
              <p className="text-sm text-text-secondary mb-4 flex-1">{quest.description}</p>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-muted">Progress</span>
                  <span className="text-xs font-mono text-text-secondary">
                    {quest.progress}/{quest.target}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg-tertiary">
                  <div
                    className="h-full rounded-full bg-neon-cyan transition-all duration-500"
                    style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                  />
                </div>
              </div>

              {/* Bonus indicator */}
              {quest.bonus_multiplier > 1 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-neon-purple">
                  <span>⚡</span>
                  <span>{quest.bonus_multiplier}x bonus on matching submissions</span>
                </div>
              )}
            </NeonCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
