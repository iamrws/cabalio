'use client';

import { motion } from 'framer-motion';
import AnimatedCounter from '../shared/AnimatedCounter';

const stats = [
  { label: 'Active Members', value: 0, suffix: '', description: 'NFT holders engaging daily' },
  { label: 'Submissions', value: 0, suffix: '', description: 'Content pieces scored by AI' },
  { label: 'Points Distributed', value: 0, suffix: '', description: 'Total points earned by community' },
];

export default function CommunityStats() {
  return (
    <section className="py-24 px-6 bg-bg-secondary/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Community <span className="gradient-text">Pulse</span>
          </h2>
          <p className="text-text-secondary text-lg">
            Real-time stats from the Cabal engagement platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-xl bg-bg-secondary border border-border-subtle"
            >
              <div className="text-3xl md:text-4xl font-bold mb-2">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  className="text-neon-cyan"
                />
              </div>
              <div className="text-sm font-semibold text-text-primary mb-1">{stat.label}</div>
              <div className="text-xs text-text-muted">{stat.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
