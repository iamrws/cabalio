'use client';

import { motion } from 'framer-motion';
import NeonCard from '../shared/NeonCard';

const steps = [
  {
    number: '01',
    title: 'Connect & Verify',
    description: 'Connect your Solana wallet and verify your Jito Cabal NFT ownership to enter the inner circle.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-9.86a4.5 4.5 0 00-6.364 6.364l4.5 4.5a4.5 4.5 0 007.244 1.242" />
      </svg>
    ),
    color: 'cyan' as const,
  },
  {
    number: '02',
    title: 'Submit Content',
    description: 'Share your Jito content, blog articles, or artwork. Up to 3 submissions per day to keep quality high.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    color: 'purple' as const,
  },
  {
    number: '03',
    title: 'AI Scores Your Work',
    description: 'Claude AI evaluates your content on 5 dimensions: relevance, originality, effort, engagement, and accuracy.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    color: 'green' as const,
  },
  {
    number: '04',
    title: 'Earn & Rise',
    description: 'Accumulate points with streak bonuses and quest multipliers. Climb the tiered leaderboard and claim rewards.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    color: 'orange' as const,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            A new way to engage with the Jito ecosystem. Create value, get recognized, earn rewards.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <NeonCard glowColor={step.color} className="p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-sm text-text-muted">{step.number}</span>
                  <div className={`text-neon-${step.color}`}>{step.icon}</div>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-text-primary">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
