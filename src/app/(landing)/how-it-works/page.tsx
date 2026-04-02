'use client';

import Link from 'next/link';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

/* ─────────────── DATA ─────────────── */

const BENEFITS = [
  {
    num: '01',
    title: 'You choose how to participate',
    body: 'Opt-in challenges, no forced grinds. Skip anything, anytime.',
  },
  {
    num: '02',
    title: 'You always know where you stand',
    body: 'Transparent scoring, clear tier progress, no mystery penalties.',
  },
  {
    num: '03',
    title: 'You win together',
    body: 'Props, mentorship roles, and team quests with shared rewards.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Connect your wallet',
    body: 'Sign in with your Solana wallet. We verify your NFT holder status automatically.',
  },
  {
    num: '02',
    title: 'Contribute and get scored',
    body: 'Submit content — posts, blogs, artwork. Every submission is human-reviewed before points move.',
  },
  {
    num: '03',
    title: 'Climb the leaderboard',
    body: 'Earn points, unlock tiers, compete in weekly brackets with fair resets.',
  },
];

const COMMITMENTS = [
  'Weekly resets keep the leaderboard open to everyone',
  'Streak shields mean life never costs you progress',
  'Human moderation keeps quality high, not volume',
  'Every rule is public. Every opt-out works.',
];

/* ─────────────── PAGE ─────────────── */

export default function HowItWorksPage() {
  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        aria-label="How Jito Cabal works"
        className="w-full pt-32 pb-20"
      >
        <div className="mx-auto w-full max-w-5xl px-6 text-center">
          <ScrollFadeUp className="mx-auto max-w-3xl">
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.03em] text-text-primary mb-6">
              How Jito Cabal Works
            </h1>
            <p className="text-base leading-[1.7] text-text-secondary max-w-2xl mx-auto">
              A Solana NFT community platform built around contribution, transparency, and fair competition.
              Every mechanic has a reason — and a guardrail.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ THE PLATFORM ═══════════════════ */}
      <section
        aria-label="Platform benefits"
        className="w-full py-28"
      >
        <div className="mx-auto w-full max-w-5xl px-6">
          <ScrollFadeUp className="mb-14">
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-4">
              The Platform
            </h2>
            <p className="text-base leading-[1.7] text-text-secondary max-w-xl">
              Three things that make Jito Cabal different from every other engagement system you have tried.
            </p>
          </ScrollFadeUp>

          <div className="space-y-4">
            {BENEFITS.map((benefit, idx) => (
              <ScrollFadeUp key={benefit.num} delay={idx * 0.08}>
                <div className="group flex items-start gap-5 rounded-lg border border-border-subtle bg-bg-surface/30 px-6 py-5 transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-surface/60 focus-within:border-accent-border">
                  <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text transition-[background-color,border-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {benefit.num}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary mb-1 leading-snug">
                      {benefit.title}
                    </h3>
                    <p className="text-base leading-[1.7] text-text-secondary">
                      {benefit.body}
                    </p>
                  </div>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ THREE STEPS ═══════════════════ */}
      <section
        aria-label="How to get started — three steps"
        className="w-full py-20"
      >
        <div className="mx-auto w-full max-w-5xl px-6">
          <ScrollFadeUp className="mb-14">
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-4">
              Three Steps
            </h2>
            <p className="text-base leading-[1.7] text-text-secondary max-w-xl">
              From wallet to leaderboard in minutes.
            </p>
          </ScrollFadeUp>

          <div className="space-y-4">
            {STEPS.map((step, idx) => (
              <ScrollFadeUp key={step.num} delay={idx * 0.08}>
                <div className="group flex items-start gap-5 rounded-lg border border-border-subtle bg-bg-raised/40 px-6 py-5 transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-raised/70 focus-within:border-accent-border">
                  <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text transition-[background-color,border-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary mb-1 leading-snug">
                      {step.title}
                    </h3>
                    <p className="text-base leading-[1.7] text-text-secondary">
                      {step.body}
                    </p>
                  </div>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ OUR COMMITMENTS ═══════════════════ */}
      <section
        aria-label="Our commitments"
        className="w-full py-20"
      >
        <div className="mx-auto w-full max-w-5xl px-6">
          <ScrollFadeUp className="mb-14">
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-4">
              Our Commitments
            </h2>
            <p className="text-base leading-[1.7] text-text-secondary max-w-xl">
              The rules we hold ourselves to, publicly.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp delay={0.08}>
            <ul className="space-y-5" role="list">
              {COMMITMENTS.map((commitment) => (
                <li key={commitment} className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-[0.45em] inline-block h-2 w-2 flex-shrink-0 rounded-full bg-accent"
                  />
                  <p className="text-base leading-[1.7] text-text-secondary">
                    {commitment}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section
        aria-label="Get started with Jito Cabal"
        className="mx-auto w-full max-w-5xl px-6 pt-28 pb-20"
      >
        <ScrollFadeUp className="mx-auto max-w-2xl text-center">
          <h2
            className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-4"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            Start earning with your community
          </h2>
          <p className="text-base leading-[1.7] text-text-secondary mb-10">
            Connect your wallet and start contributing. Quality work gets recognized.
          </p>
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-[#08080a] transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_40px_rgba(212,168,83,0.3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Connect Wallet
            <span className="absolute inset-0 rounded-lg bg-white/0 transition-[background-color] duration-200 group-hover:bg-white/10" />
          </Link>
        </ScrollFadeUp>
      </section>
    </>
  );
}
