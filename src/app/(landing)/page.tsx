'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

/* ─────────────── DATA ─────────────── */

const heroWords = ['The', 'inner', 'circle', "doesn't", 'grind.'];
const heroAccent = ['It', 'builds.'];

const featureChips = ['Transparent Points', 'Weekly Resets', 'Streak Shields', 'Immutable Ledger'];

const PLATFORM_STRIPS = [
  {
    num: '01',
    title: 'Choose your path',
    body: 'Opt-in challenges, profile control, skip anything anytime.',
  },
  {
    num: '02',
    title: 'Earn transparently',
    body: 'Every point has a reason. Every tier unlock is visible.',
  },
  {
    num: '03',
    title: 'Compete fairly',
    body: 'Weekly resets, streak shields, no pay-to-win mechanics.',
  },
];

/* ─────────────── COMPONENT ─────────────── */

export default function HeroPage() {
  // Default true so content is always visible even if rAF never fires (headless/SSR).
  // The CSS animation still provides the enter transition when JS runs normally.
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    // No-op in practice (already true), kept for future progressive-enhancement hooks.
    const id = requestAnimationFrame(() => setHeroVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* ═══════ ATMOSPHERIC BACKGROUND ═══════ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Gold radial glow — hero focal point */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 50% 35%, rgba(212,168,83,0.12), transparent 70%),
              var(--bg-base)
            `,
          }}
        />
        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(212,168,83,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(212,168,83,1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        <div className="mx-auto w-full max-w-5xl px-6 will-change-transform flex flex-col items-center text-center">

          {/* Overline */}
          <div
            className="mb-8"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s`,
            }}
          >
            <span className="inline-flex items-center gap-2 rounded-md border border-accent-border bg-accent-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Community Points, Reimagined
            </span>
          </div>

          {/* Giant headline — word-by-word reveal */}
          <h1 className="font-display text-[clamp(3rem,8vw,6.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] mb-8 max-w-5xl text-center">
            {heroWords.map((word, i) => (
              <span key={i}>
                <span
                  className="inline-block"
                  style={{
                    animation: heroVisible
                      ? `word-reveal 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.08}s forwards`
                      : 'none',
                  }}
                >
                  {word}
                </span>{' '}
              </span>
            ))}
            <br className="hidden sm:block" />
            {heroAccent.map((word, i) => (
              <span key={`accent-${i}`}>
                <span
                  className="inline-block text-accent-text"
                  style={{
                    textShadow: '0 0 60px rgba(212,168,83,0.3)',
                    animation: heroVisible
                      ? `word-reveal 0.8s cubic-bezier(0.16,1,0.3,1) ${0.3 + (heroWords.length + i) * 0.08}s forwards`
                      : 'none',
                  }}
                >
                  {word}
                </span>{' '}
              </span>
            ))}
          </h1>

          {/* Subhead */}
          <p
            className="max-w-2xl text-base leading-[1.7] text-text-secondary mb-10 text-center mx-auto"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s`,
            }}
          >
            A holder-gated community that rewards quality contributions, not grinding. Transparent
            scoring, fair competition, anti-burnout safeguards.
          </p>

          {/* Single CTA */}
          <div
            className="flex justify-center mb-8"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.3s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.3s`,
            }}
          >
            <Link
              href="/dashboard"
              className="group relative rounded-md bg-accent px-7 py-3 text-sm font-semibold text-[#08080a] transition-[box-shadow,transform,background-color] duration-200 hover:bg-[var(--accent-dim)] hover:shadow-[0_0_30px_rgba(212,168,83,0.25)] active:scale-[0.97] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Enter the Cabal
              <span className="absolute inset-0 rounded-md bg-white/0 transition-[background-color] group-hover:bg-white/10" />
            </Link>
          </div>

          {/* Feature chips */}
          <div
            className="flex flex-wrap gap-2 justify-center"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.5s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.5s`,
            }}
          >
            {featureChips.map((chip, i) => (
              <span
                key={chip}
                className="rounded-sm border border-border-subtle bg-bg-surface/40 px-4 py-2 text-sm font-mono text-text-muted"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            opacity: heroVisible ? 1 : 0,
            transition: 'opacity 1s ease 2.5s',
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Scroll</span>
          <div
            className="w-px h-6 bg-accent-text/40"
            style={{ animation: 'bounce-scroll 1.5s ease-in-out infinite' }}
          />
        </div>
      </section>

      {/* ═══════════════════ PLATFORM SECTION ═══════════════════ */}
      <section className="relative z-10 w-full py-28" aria-label="Platform overview">
        <div className="mx-auto w-full max-w-5xl px-6">

          {/* Section header */}
          <ScrollFadeUp className="mb-14 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              The Platform
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary">
              Built for holders who build
            </h2>
          </ScrollFadeUp>

          {/* Horizontal strips */}
          <div className="space-y-4">
            {PLATFORM_STRIPS.map((strip, idx) => (
              <ScrollFadeUp key={strip.num} delay={idx * 0.08}>
                <div className="group flex items-start gap-5 rounded-lg border border-border-subtle bg-bg-surface/30 px-6 py-5 transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-surface/60 focus-within:border-accent-border">
                  <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text transition-[background-color,border-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {strip.num}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold text-text-primary mb-1 leading-snug">
                      {strip.title}
                    </h3>
                    <p className="text-base leading-[1.7] text-text-secondary">
                      {strip.body}
                    </p>
                  </div>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
