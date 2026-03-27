'use client';

import { motion } from 'framer-motion';
import NeonCard from '../shared/NeonCard';

const steps = [
  {
    number: '01',
    title: 'Connect & Verify',
    description: 'Connect your Solana wallet and verify your Jito Cabal NFT ownership to enter the inner circle.',
    accent: '#b45309',
  },
  {
    number: '02',
    title: 'Submit Content',
    description: 'Share your Jito content, blog articles, or artwork. Up to 3 submissions per day to keep quality high.',
    accent: '#7c3aed',
  },
  {
    number: '03',
    title: 'AI Scores Your Work',
    description: 'Claude AI evaluates your content on 5 dimensions: relevance, originality, effort, engagement, and accuracy.',
    accent: '#0f766e',
  },
  {
    number: '04',
    title: 'Earn & Rise',
    description: 'Accumulate points with streak bonuses and quest multipliers. Climb the tiered leaderboard and claim rewards.',
    accent: '#b45309',
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
          <h2
            className="text-3xl md:text-5xl mb-4 text-[#1c1917]"
            style={{ fontFamily: '"Charter", "Bitstream Charter", Georgia, serif' }}
          >
            How it works
          </h2>
          <p className="text-[#57534e] text-lg max-w-2xl mx-auto" style={{ fontFamily: '"Avenir Next", system-ui, sans-serif' }}>
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
              <NeonCard accent={step.accent} className="p-6 h-full">
                <span className="font-mono text-sm text-[#a8a29e]">{step.number}</span>
                <h3
                  className="text-lg font-semibold mb-2 text-[#1c1917] mt-2"
                  style={{ fontFamily: '"Charter", Georgia, serif' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[#57534e] leading-relaxed" style={{ fontFamily: '"Avenir Next", system-ui, sans-serif' }}>
                  {step.description}
                </p>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
