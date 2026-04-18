'use client';

import Link from 'next/link';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';
import LandingAuthGate from '@/components/landing/LandingAuthGate';

/* ─────────────── PAGE ───────────────
   NOTE: This page intentionally does NOT call useWallet/useConnection.
   The Solana wallet adapter is loaded lazily via <LandingAuthGate />
   (which itself dynamic-imports <WalletProviders>) so the wallet chunks
   stay off the landing page's first-load JS. */

const FEATURE_HIGHLIGHTS = [
  {
    num: '01',
    title: 'Transparent Points',
    body: 'Every point has a reason. Every tier unlock is visible.',
  },
  {
    num: '02',
    title: 'Weekly Resets',
    body: 'Fair brackets. No runaway incumbents. Open to everyone.',
  },
  {
    num: '03',
    title: 'Holder-Gated',
    body: 'Sign with your Jito Cabal NFT wallet. Real members only.',
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* ═══════ ATMOSPHERIC BACKGROUND ═══════ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 25%, rgba(212,168,83,0.10), transparent 70%),
              var(--bg-base)
            `,
          }}
        />
      </div>

      {/* ═══════════════════ HERO + GATE ═══════════════════ */}
      <section
        aria-label="Jito Cabal — holder dashboard"
        className="relative z-10 w-full"
      >
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-10 pt-10 sm:pt-16 pb-20 text-center">

          {/* Overline */}
          <ScrollFadeUp>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-muted/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Holder Dashboard
            </span>
          </ScrollFadeUp>

          {/* Headline */}
          <ScrollFadeUp delay={0.05}>
            <h1
              className="mt-8 mx-auto max-w-3xl font-display font-semibold leading-[1.05] tracking-[-0.03em] text-text-primary"
              style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5rem)' }}
            >
              Your Cabal,{' '}
              <span className="text-accent-text">
                front and center.
              </span>
            </h1>
          </ScrollFadeUp>

          {/* Subhead */}
          <ScrollFadeUp delay={0.1}>
            <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-[1.7] text-text-secondary">
              Sign in with the Solana wallet that holds your Jito Cabal NFT. We verify on-chain — then your
              live dashboard appears below.
            </p>
          </ScrollFadeUp>

          {/* ═════════ DASHBOARD GATE CARD — lazy-mounted ═════════ */}
          <ScrollFadeUp delay={0.15}>
            <div className="mt-12 mx-auto w-full max-w-3xl">
              <LandingAuthGate />
            </div>
          </ScrollFadeUp>

          {/* Quick links to the other 3 pages — centered */}
          <ScrollFadeUp delay={0.2}>
            <nav
              aria-label="Explore Jito Cabal"
              className="mt-12 flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.15em] text-text-muted"
            >
              <Link
                href="/how-it-works"
                className="rounded-md border border-border-subtle px-4 py-2 transition-[color,border-color] duration-150 hover:text-accent-text hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                How It Works
              </Link>
              <Link
                href="/roadmap"
                className="rounded-md border border-border-subtle px-4 py-2 transition-[color,border-color] duration-150 hover:text-accent-text hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Roadmap
              </Link>
              <Link
                href="/engine"
                className="rounded-md border border-border-subtle px-4 py-2 transition-[color,border-color] duration-150 hover:text-accent-text hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                The Engine
              </Link>
            </nav>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ FEATURE HIGHLIGHTS ═══════════════════ */}
      <section
        aria-label="Why Jito Cabal"
        className="relative z-10 w-full bg-bg-surface/20 py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 text-center">
          <ScrollFadeUp className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              The Platform
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary">
              Built for holders who build
            </h2>
          </ScrollFadeUp>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {FEATURE_HIGHLIGHTS.map((f, idx) => (
              <ScrollFadeUp key={f.num} delay={idx * 0.08}>
                <div className="group h-full rounded-xl border border-border-subtle bg-bg-surface/40 p-6 sm:p-7 text-center transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-surface/60">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text mb-4 mx-auto transition-[background-color,border-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {f.num}
                  </span>
                  <h3 className="text-lg font-semibold text-text-primary mb-2 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-[1.7] text-text-secondary">
                    {f.body}
                  </p>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
