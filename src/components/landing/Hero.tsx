'use client';

import { motion } from 'framer-motion';
import HeroCanvas from './HeroCanvas';
import WalletButton from '../shared/WalletButton';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <HeroCanvas />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-primary/50 to-bg-primary z-[1]" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 px-4 py-1.5 mb-8"
        >
          <div className="h-2 w-2 rounded-full bg-neon-cyan pulse-neon" />
          <span className="text-sm font-mono text-neon-cyan">NFT Holders Only</span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="text-text-primary">JITO</span>{' '}
          <span className="gradient-text">CABAL</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-4"
        >
          The inner circle of builders, stakers, and believers
          shaping the future of Solana together.
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-sm font-mono text-neon-purple mb-10"
        >
          Submit. Score. Rise. Earn.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <WalletButton />
          <a
            href="#how-it-works"
            className="px-6 py-3 rounded-xl border border-border-subtle text-text-secondary hover:text-neon-cyan hover:border-neon-cyan/50 transition-all duration-300"
          >
            How it works
          </a>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-text-muted flex items-start justify-center p-1.5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />
        </motion.div>
      </motion.div>
    </section>
  );
}
