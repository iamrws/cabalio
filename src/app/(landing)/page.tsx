'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/* ─────────────── DATA ─────────────── */

const heroWords = ['The', 'inner', 'circle', "doesn't", 'grind.'];
const heroAccent = ['It', 'builds.'];

const bracketRows = [
  { name: 'You', points: 126, delta: '+18', highlight: true },
  { name: 'AnchorNode', points: 133, delta: '+9' },
  { name: 'HelixMint', points: 118, delta: '+11' },
  { name: 'CabalCraft', points: 109, delta: '+7' },
  { name: 'NoirValidator', points: 102, delta: '+6' },
];

const maxBracketPoints = Math.max(...bracketRows.map((r) => r.points));

const featureChips = ['Transparent Points', 'Weekly Resets', 'Streak Shields', 'Immutable Ledger'];

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

  const heatmapCells = useMemo(
    () =>
      Array.from({ length: 26 * 7 }, (_, index) => {
        const week = Math.floor(index / 7);
        const day = index % 7;
        const wave = Math.sin((week + 1) * 0.52 + day * 0.88);
        const seasonality = Math.cos((week + 1) * 0.2);
        const weekdayBonus = day >= 1 && day <= 4 ? 0.25 : -0.1;
        const normalized = (wave + seasonality + weekdayBonus + 2.2) / 4.4;
        return Math.max(0, Math.min(4, Math.round(normalized * 4)));
      }),
    [],
  );

  const heatmapPalette = ['#1a1a20', '#2a2520', '#6B5B3A', '#D4A853', '#B8923F'];

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
      <section className="relative z-10 min-h-screen flex flex-col justify-center">
        <div className="mx-auto w-full max-w-7xl px-6 will-change-transform">

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
          <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.04em] mb-8 max-w-5xl">
            {heroWords.map((word, i) => (
              <span
                key={i}
                className="inline-block mr-[0.25em]"
                style={{
                  animation: heroVisible
                    ? `word-reveal 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.08}s forwards`
                    : 'none',
                }}
              >
                {word}
              </span>
            ))}
            <br className="hidden sm:block" />
            {heroAccent.map((word, i) => (
              <span
                key={`accent-${i}`}
                className="inline-block mr-[0.25em] text-accent-text"
                style={{
                  textShadow: '0 0 60px rgba(212,168,83,0.3)',
                  animation: heroVisible
                    ? `word-reveal 0.8s cubic-bezier(0.16,1,0.3,1) ${0.3 + (heroWords.length + i) * 0.08}s forwards`
                    : 'none',
                }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Subhead */}
          <p
            className="max-w-xl text-base leading-[1.7] text-text-secondary mb-10"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s`,
            }}
          >
            A behavioral operating system for a holder-gated community. Ethical motivation loops,
            contribution-first scoring, and anti-burnout safeguards — wired into Jito Cabal.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap gap-4 mb-8"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.3s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.3s`,
            }}
          >
            <Link
              href="/simulator"
              className="group relative rounded-md bg-accent px-7 py-3 text-sm font-semibold text-[#08080a] transition-[box-shadow,transform,background-color] duration-200 hover:bg-[var(--accent-dim)] hover:shadow-[0_0_30px_rgba(212,168,83,0.25)] active:scale-[0.97] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Test the Simulator
              <span className="absolute inset-0 rounded-md bg-white/0 transition-[background-color] group-hover:bg-white/10" />
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-border-strong px-7 py-3 text-sm font-semibold text-text-primary transition-[color,border-color,transform] duration-200 hover:border-accent-text hover:text-accent-text active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Open Dashboard
            </Link>
          </div>

          {/* Feature chips */}
          <div
            className="flex flex-wrap gap-2"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
              transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.5s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.5s`,
            }}
          >
            {featureChips.map((chip, i) => (
              <span
                key={chip}
                className="rounded-sm border border-border-subtle bg-bg-surface/40 px-3 py-1.5 text-xs font-mono text-text-muted"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Floating preview cards — desktop: absolute floating; mobile: inline stacked */}
        {/* Desktop */}
        <div className="absolute right-0 top-[22%] w-[480px] hidden lg:block" style={{ perspective: '1200px' }}>
          <div
            className="relative"
            style={{
              animation: heroVisible ? 'slide-in-right 1.2s cubic-bezier(0.16,1,0.3,1) 0.8s forwards' : 'none',
            }}
          >
            {/* Heatmap card */}
            <div className="rounded-xl border border-border-default bg-bg-surface/90 backdrop-blur-sm p-5 shadow-lg mb-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-text">Profile Heatmap</span>
                <span className="text-[10px] text-text-muted font-mono">26w</span>
              </div>
              <div className="rounded-lg bg-bg-base/80 p-2">
                <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(26, minmax(0, 1fr))' }}>
                  {heatmapCells.map((value, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-[1px]"
                      style={{ backgroundColor: heatmapPalette[value] }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bracket card — offset */}
            <div className="ml-8 rounded-xl border border-border-default bg-bg-raised/90 backdrop-blur-sm p-5 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-text">Weekly Bracket</span>
                <span className="text-[10px] text-text-muted font-mono">Resets Mon</span>
              </div>
              <div className="space-y-2.5">
                {bracketRows.map((row, rowIdx) => (
                  <div key={row.name}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className={row.highlight ? 'font-semibold text-accent-text' : 'text-text-muted'}>
                        {row.name}
                      </span>
                      <span className="font-mono text-[10px] text-accent-text/70">
                        {row.points} <span className="text-accent-text/40">{row.delta}</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-bg-overlay">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.points / maxBracketPoints) * 100}%`,
                          background: row.highlight ? 'var(--accent)' : 'var(--text-muted)',
                          transformOrigin: 'left',
                          animation: `bar-grow 1s cubic-bezier(0.16,1,0.3,1) ${1.5 + rowIdx * 0.1}s forwards`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gold glow behind cards */}
            <div
              className="absolute -inset-10 -z-10 opacity-30 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.15), transparent 70%)' }}
            />
          </div>
        </div>

        {/* Mobile preview — compact scrollable row of product snapshots */}
        <div
          className="lg:hidden relative z-10 mx-auto w-full max-w-7xl px-6 mt-10"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1) 1.7s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 1.7s',
          }}
        >
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {/* Heatmap snapshot */}
            <div className="snap-start shrink-0 w-[calc(100vw-3rem)] max-w-sm rounded-xl border border-border-default bg-bg-surface/90 backdrop-blur-sm p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-text">Profile Heatmap</span>
                <span className="text-[10px] text-text-muted font-mono">26w</span>
              </div>
              <div className="rounded-lg bg-bg-base/80 p-2">
                <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(26, minmax(0, 1fr))' }}>
                  {heatmapCells.map((value, idx) => (
                    <div
                      key={`m-${idx}`}
                      className="aspect-square rounded-[1px]"
                      style={{ backgroundColor: heatmapPalette[value] }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bracket snapshot */}
            <div className="snap-start shrink-0 w-[calc(100vw-3rem)] max-w-sm rounded-xl border border-border-default bg-bg-raised/90 backdrop-blur-sm p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-text">Weekly Bracket</span>
                <span className="text-[10px] text-text-muted font-mono">Resets Mon</span>
              </div>
              <div className="space-y-2">
                {bracketRows.map((row, rowIdx) => (
                  <div key={`m-${row.name}`}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className={row.highlight ? 'font-semibold text-accent-text' : 'text-text-muted'}>
                        {row.name}
                      </span>
                      <span className="font-mono text-[10px] text-accent-text/70">
                        {row.points} <span className="text-accent-text/40">{row.delta}</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-bg-overlay">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.points / maxBracketPoints) * 100}%`,
                          background: row.highlight ? 'var(--accent)' : 'var(--text-muted)',
                          transformOrigin: 'left',
                          animation: `bar-grow 1s cubic-bezier(0.16,1,0.3,1) ${1.8 + rowIdx * 0.1}s forwards`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Scroll hint dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            <span className="h-1 w-4 rounded-full bg-accent/60" />
            <span className="h-1 w-1.5 rounded-full bg-border-subtle" />
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
    </div>
  );
}
