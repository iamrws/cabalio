'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuthControls from '@/components/shared/AuthControls';

interface BehavioralLandingProps {
  authState?: string;
}

type SimulatorFlag = 'streakShield' | 'weeklyReset' | 'transparentRules' | 'qualityWeighting';

/* ─────────────── DATA ─────────────── */

const pillarCards = [
  {
    num: '01',
    title: 'Autonomy',
    insight: 'Choice keeps motivation intrinsic.',
    mechanics: 'Opt-in challenges, profile control, and skippable events.',
    guardrail: 'No forced continuity or hidden enrollment.',
  },
  {
    num: '02',
    title: 'Competence',
    insight: 'Progress must feel earned and clear.',
    mechanics: 'Transparent point reasons, tier unlocks, and visible quality signals.',
    guardrail: 'No opaque scoring jumps or mystery penalties.',
  },
  {
    num: '03',
    title: 'Relatedness',
    insight: 'Community proof beats solo grinding.',
    mechanics: 'Props, mentorship roles, and team quests with shared wins.',
    guardrail: 'No zero-sum status monopolies.',
  },
];

const engineSteps = [
  { step: '01', label: 'Wallet Signature + Holder Check', detail: 'Nonce challenge and server-side NFT verification gate every protected path.' },
  { step: '02', label: 'Submission Intake with Abuse Controls', detail: 'Type validation, duplicate detection, daily caps, and file security screening.' },
  { step: '03', label: 'Human-Reviewed AI Scoring', detail: 'Admin moderation decides approval before points ever move.' },
  { step: '04', label: 'Immutable Points Ledger', detail: 'Approved actions write auditable point events that power all rankings.' },
  { step: '05', label: 'Weekly Brackets + Humane Streaks', detail: 'Resettable competitions, streak shields, and comeback bonuses keep pressure healthy.' },
];

const antiPatterns = [
  { risk: 'Winner-take-all leaderboards', fix: 'Weekly bracket resets keep upward mobility alive for every cohort.' },
  { risk: 'Anxiety-driven streak mechanics', fix: 'Streak shields and comeback bonuses convert failure into recovery loops.' },
  { risk: 'Volume farming and low-signal content', fix: 'Human moderation + quality-weighted scoring keeps trust in the feed.' },
  { risk: 'Dark-pattern engagement traps', fix: 'Opt-outs, public rules, and visible controls are first-class product features.' },
];

const roadmap = [
  { phase: 'P0', title: 'Trust Infrastructure', items: ['Transparent point rules', 'Tier unlocks', 'Endowed onboarding', 'Personality notifications'] },
  { phase: 'P1', title: 'Identity Layer', items: ['Activity heatmap', 'Skill badges', 'Streak shields', 'Peer props'] },
  { phase: 'P2', title: 'Social Dynamics', items: ['Bracket leaderboards', 'Variable rewards', 'Team quests', 'Celebration micro-interactions'] },
  { phase: 'P3', title: 'Long-Term Retention', items: ['Mentorship routing', 'Point economy spending', 'Impact year-in-review', 'Seasonal events'] },
];

const simulatorControls = [
  { key: 'streakShield' as SimulatorFlag, label: 'Streak Shields', description: 'Prevents anxiety spikes when real life interrupts consistency.' },
  { key: 'weeklyReset' as SimulatorFlag, label: 'Weekly Resets', description: 'Eliminates runaway incumbents in the leaderboard economy.' },
  { key: 'transparentRules' as SimulatorFlag, label: 'Transparent Rules', description: 'Shows exactly why points are earned or denied.' },
  { key: 'qualityWeighting' as SimulatorFlag, label: 'Quality Weighting', description: 'Rewards signal, not raw posting volume.' },
];

const bracketRows = [
  { name: 'You', points: 126, delta: '+18', highlight: true },
  { name: 'AnchorNode', points: 133, delta: '+9' },
  { name: 'HelixMint', points: 118, delta: '+11' },
  { name: 'CabalCraft', points: 109, delta: '+7' },
  { name: 'NoirValidator', points: 102, delta: '+6' },
];

/* ─────────────── ANIMATION HELPERS ─────────────── */

const heroWords = ["The", "inner", "circle", "doesn't", "grind."];
const heroAccent = ["It", "builds."];

/** Intersection Observer hook — triggers once when element enters viewport */
function useInView(ref: React.RefObject<HTMLElement | null>, opts?: { threshold?: number; once?: boolean }) {
  const [inView, setInView] = useState(false);
  const once = opts?.once ?? true;
  const threshold = opts?.threshold ?? 0.15;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, threshold]);
  return inView;
}

/** Shared transition style for scroll-triggered fade-up */
function fadeUpStyle(visible: boolean, delay = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(40px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  } as const;
}

/** Wrapper that observes itself and applies fade-up */
function ScrollFadeUp({ delay = 0, className = '', children }: { delay?: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={className} style={fadeUpStyle(inView, delay)}>
      {children}
    </div>
  );
}

/* ─────────────── COMPONENT ─────────────── */

export default function BehavioralLanding({ authState }: BehavioralLandingProps) {
  const [flags, setFlags] = useState<Record<SimulatorFlag, boolean>>({
    streakShield: true,
    weeklyReset: true,
    transparentRules: true,
    qualityWeighting: true,
  });

  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    // Trigger hero entrance on mount
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
    []
  );

  const heatmapPalette = ['#1a1a20', '#2a2520', '#6B5B3A', '#D4A853', '#B8923F'];

  const retentionLift = 12 + (flags.streakShield ? 9 : 0) + (flags.weeklyReset ? 8 : 0) + (flags.transparentRules ? 6 : 0) + (flags.qualityWeighting ? 5 : 0);
  const trustScore = 46 + (flags.transparentRules ? 24 : 0) + (flags.qualityWeighting ? 16 : 0) + (flags.weeklyReset ? 8 : 0);
  const signalQuality = 41 + (flags.qualityWeighting ? 27 : 0) + (flags.transparentRules ? 12 : 0) + (flags.streakShield ? 5 : 0);
  const maxBracketPoints = Math.max(...bracketRows.map((row) => row.points));

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* CSS keyframes for this page */}
      <style>{`
        @keyframes word-reveal {
          from { opacity: 0; transform: translateY(40px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0px); }
        }
        @keyframes bar-grow {
          from { width: 0; }
        }
        @keyframes bounce-scroll {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(6px); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: perspective(1200px) translateX(100px) rotateY(-8deg); }
          to   { opacity: 1; transform: perspective(1200px) translateX(0) rotateY(-3deg); }
        }
      `}</style>

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

      <div className="relative z-10">
        {/* ═══════ NAV ═══════ */}
        <header
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-bg-base/60 transition-opacity duration-[800ms]"
          style={{
            opacity: heroVisible ? 1 : 0,
            transitionDelay: '0.1s',
          }}
        >
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 h-14">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center text-xs font-bold text-[#08080a]">
                JC
              </div>
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-text hidden sm:block">
                Jito Cabal
              </span>
            </div>
            <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.15em] text-text-muted md:flex">
              {['Pillars', 'Engine', 'Roadmap', 'Simulator'].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  className="relative py-1 transition-colors duration-300 hover:text-accent-text focus-visible:text-accent-text active:opacity-70 focus-visible:outline-none group [&:focus-visible_span]:w-full"
                >
                  {label}
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-accent transition-[width] duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>
            <div className="hidden sm:block">
              <AuthControls compact />
            </div>
          </div>
        </header>

        {/* Auth warning banner */}
        {authState === 'required' ? (
          <div className="fixed top-16 left-0 right-0 z-40 px-6">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-lg border border-caution/30 bg-caution/5 backdrop-blur-sm px-4 py-2.5 text-sm text-caution">
                Wallet verification is required before accessing member routes. Sign in to continue.
              </div>
            </div>
          </div>
        ) : null}

        {/* ═══════════════════ HERO ═══════════════════ */}
        <section className="relative min-h-screen flex flex-col justify-center pt-16">
          <div className="mx-auto w-full max-w-7xl px-6 will-change-transform">
            {/* Overline */}
            <div
              className="mb-8 transition-all duration-[600ms]"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                transitionDelay: '0.15s',
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
                    opacity: heroVisible ? 1 : 0,
                    animation: heroVisible ? `word-reveal 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.08}s both` : 'none',
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
                    opacity: heroVisible ? 1 : 0,
                    animation: heroVisible ? `word-reveal 0.8s cubic-bezier(0.16,1,0.3,1) ${0.3 + (heroWords.length + i) * 0.08}s both` : 'none',
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>

            {/* Subhead */}
            <p
              className="max-w-xl text-base leading-relaxed text-text-secondary mb-10 transition-all duration-700"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
                transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                transitionDelay: '1.1s',
              }}
            >
              A behavioral operating system for a holder-gated community. Ethical motivation loops,
              contribution-first scoring, and anti-burnout safeguards — wired into Jito Cabal.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-wrap gap-4 mb-16 transition-all duration-700"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
                transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                transitionDelay: '1.3s',
              }}
            >
              <a
                href="#simulator"
                className="group relative rounded-md bg-accent px-7 py-3 text-sm font-semibold text-[#08080a] transition-[box-shadow,transform,background-color] duration-200 hover:bg-[var(--accent-dim)] hover:shadow-[0_0_30px_rgba(212,168,83,0.25)] active:scale-[0.97] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Test the Simulator
                <span className="absolute inset-0 rounded-md bg-white/0 transition-all group-hover:bg-white/10" />
              </a>
              <Link
                href="/dashboard"
                className="rounded-md border border-border-strong px-7 py-3 text-sm font-semibold text-text-primary transition-[color,border-color,transform] duration-200 hover:border-accent-text hover:text-accent-text active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Open Dashboard
              </Link>
            </div>

            {/* Feature chips — horizontal scroll on mobile */}
            <div
              className="flex flex-wrap gap-2 transition-all duration-700"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(30px)',
                transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                transitionDelay: '1.5s',
              }}
            >
              {['Transparent Points', 'Weekly Resets', 'Streak Shields', 'Immutable Ledger'].map((chip, i) => (
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

          {/* Floating preview cards — asymmetric overlap */}
          <div className="absolute right-0 top-[22%] w-[480px] hidden xl:block" style={{ perspective: '1200px' }}>
            <div
              className="relative"
              style={{
                animation: heroVisible ? 'slide-in-right 1.2s cubic-bezier(0.16,1,0.3,1) 0.8s both' : 'none',
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
                            background: row.highlight
                              ? 'var(--accent)'
                              : 'var(--text-muted)',
                            animation: `bar-grow 1s cubic-bezier(0.16,1,0.3,1) ${1.5 + rowIdx * 0.1}s both`,
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

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-1000"
            style={{ opacity: heroVisible ? 1 : 0, transitionDelay: '2.5s' }}
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Scroll</span>
            <div
              className="w-px h-6 bg-accent-text/40"
              style={{ animation: 'bounce-scroll 1.5s ease-in-out infinite' }}
            />
          </div>
        </section>

        {/* ═══════ GOLD DIVIDER ═══════ */}
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        {/* ═══════════════════ PILLARS ═══════════════════ */}
        <section id="pillars" className="mx-auto w-full max-w-7xl px-6 py-20">
          <ScrollFadeUp className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Psychology Core
            </p>
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary max-w-3xl">
              Three motivation systems,{' '}
              <span className="text-text-tertiary">one product language</span>
            </h2>
          </ScrollFadeUp>

          <div className="grid gap-6 md:grid-cols-3">
            {pillarCards.map((pillar, idx) => (
              <ScrollFadeUp
                key={pillar.title}
                delay={idx * 0.1}
                className="group relative rounded-xl border border-border-subtle bg-bg-surface/50 p-8 transition-all duration-500 hover:border-accent-border hover:bg-bg-surface/80"
              >
                {/* Number — oversized, faded */}
                <span className="absolute top-6 right-6 font-display text-6xl font-bold text-text-muted/20 select-none">
                  {pillar.num}
                </span>

                <div className="relative">
                  <h3 className="font-display text-lg text-accent-text mb-3">{pillar.title}</h3>
                  <p className="text-xl font-medium text-text-primary mb-3 leading-snug">{pillar.insight}</p>
                  <p className="text-sm leading-relaxed text-text-secondary mb-6">{pillar.mechanics}</p>

                  <div className="border-t border-border-subtle pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                      Guardrail — {pillar.guardrail}
                    </p>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ boxShadow: 'inset 0 1px 0 0 rgba(212,168,83,0.1), 0 0 20px rgba(212,168,83,0.03)' }}
                />
              </ScrollFadeUp>
            ))}
          </div>
        </section>

        {/* ═══════ DIVIDER ═══════ */}
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        {/* ═══════════════════ ENGINE ═══════════════════ */}
        <section id="engine" className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
            {/* Pipeline — left */}
            <ScrollFadeUp>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
                Engineering Flow
              </p>
              <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-[1.1] tracking-[-0.03em] text-text-primary mb-10">
                Contribution Pipeline
              </h2>

              <div className="space-y-3">
                {engineSteps.map((step, idx) => (
                  <ScrollFadeUp
                    key={step.step}
                    delay={idx * 0.08}
                    className="group flex gap-4 rounded-lg border border-border-subtle bg-bg-surface/30 p-4 transition-all duration-300 hover:border-accent-border hover:bg-bg-surface/60"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-accent-muted flex items-center justify-center font-mono text-sm font-bold text-accent-text">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary mb-0.5">{step.label}</p>
                      <p className="text-xs leading-relaxed text-text-secondary">{step.detail}</p>
                    </div>
                  </ScrollFadeUp>
                ))}
              </div>
            </ScrollFadeUp>

            {/* Anti-patterns — right */}
            <ScrollFadeUp delay={0.15}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-caution mb-4">
                Ethical Safety Rails
              </p>
              <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-[1.1] tracking-[-0.03em] text-text-primary mb-10">
                What We Refuse to Ship
              </h2>

              <div className="space-y-3">
                {antiPatterns.map((pattern, idx) => (
                  <ScrollFadeUp
                    key={pattern.risk}
                    delay={0.15 + idx * 0.08}
                    className="rounded-lg border border-border-subtle bg-bg-raised/50 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution/80 mb-2">
                      {pattern.risk}
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {pattern.fix}
                    </p>
                  </ScrollFadeUp>
                ))}
              </div>
            </ScrollFadeUp>
          </div>
        </section>

        {/* ═══════ DIVIDER ═══════ */}
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        {/* ═══════════════════ ROADMAP ═══════════════════ */}
        <section id="roadmap" className="mx-auto w-full max-w-7xl px-6 py-32">
          <ScrollFadeUp className="mb-16 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Build Plan
            </p>
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary">
              18 features by impact
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Foundation first, novelty second: trust and clarity before high-variance mechanics.
            </p>
          </ScrollFadeUp>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roadmap.map((phase, idx) => (
              <ScrollFadeUp
                key={phase.phase}
                delay={idx * 0.08}
                className="group rounded-xl border border-border-subtle bg-bg-surface/30 p-6 transition-all duration-500 hover:border-accent-border"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-sm bg-accent/10 px-2.5 py-1 font-mono text-xs font-bold text-accent-text">
                    {phase.phase}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-text-muted">{phase.title}</span>
                </div>
                <div className="space-y-1.5">
                  {phase.items.map((item) => (
                    <p
                      key={item}
                      className="rounded-md bg-bg-base/60 border border-border-subtle/50 px-3 py-2 text-xs text-text-secondary"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </section>

        {/* ═══════ DIVIDER ═══════ */}
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        {/* ═══════════════════ SIMULATOR ═══════════════════ */}
        <section id="simulator" className="mx-auto w-full max-w-7xl px-6 py-32">
          <ScrollFadeUp className="mb-12 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Scenario Builder
            </p>
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary">
              Engagement Simulator
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Flip safeguards on or off to see how retention, trust, and quality shift.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp delay={0.1} className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            {/* Controls */}
            <div className="space-y-3">
              {simulatorControls.map((control) => (
                <button
                  key={control.key}
                  type="button"
                  aria-pressed={flags[control.key]}
                  onClick={() => setFlags((prev) => ({ ...prev, [control.key]: !prev[control.key] }))}
                  className={`w-full rounded-lg border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    flags[control.key]
                      ? 'border-accent-border bg-accent-muted/30 hover:bg-[var(--accent-muted)]/50 hover:border-[var(--accent)]'
                      : 'border-border-subtle bg-bg-surface/30 hover:border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-text-primary">{control.label}</p>
                    <span
                      className={`rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
                        flags[control.key] ? 'bg-accent text-[#08080a]' : 'bg-bg-raised text-text-muted'
                      }`}
                    >
                      {flags[control.key] ? 'On' : 'Off'}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{control.description}</p>
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="rounded-xl border border-border-subtle bg-bg-base/80 p-6 space-y-5">
              {[
                { label: '14-Day Retention Lift', value: retentionLift, suffix: '%' },
                { label: 'Perceived Trust Score', value: trustScore, suffix: '/100' },
                { label: 'Signal Quality', value: signalQuality, suffix: '/100' },
              ].map((metric) => (
                <div key={metric.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
                    <p className="font-mono text-sm font-bold text-accent-text">
                      {metric.value}{metric.suffix}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-overlay">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                      style={{
                        width: `${Math.min(metric.value, 100)}%`,
                        transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-4 rounded-lg border border-border-subtle bg-bg-surface/50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-2">
                  Engineering Note
                </p>
                <p className="text-xs leading-relaxed text-text-secondary">
                  Feature flags will be instrumented with event telemetry for A/B testing behavior outcomes
                  before fully rolling out across the holder base.
                </p>
              </div>
            </div>
          </ScrollFadeUp>
        </section>

        {/* ═══════ DIVIDER ═══════ */}
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        {/* ═══════════════════ CTA ═══════════════════ */}
        <section className="mx-auto w-full max-w-7xl px-6 py-32">
          <ScrollFadeUp className="text-center max-w-3xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-6">
              Launch Direction
            </p>
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary mb-6">
              Build a community worth returning to
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-10">
              The system rewards contribution quality, preserves member dignity, and maps cleanly to your
              production stack: wallet auth, admin moderation, immutable ledger, and bracketed progression.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/submit"
                className="group relative rounded-md bg-accent px-8 py-3.5 text-sm font-semibold text-[#08080a] transition-all hover:shadow-[0_0_40px_rgba(212,168,83,0.3)]"
              >
                Submit Contribution
                <span className="absolute inset-0 rounded-md bg-white/0 transition-all group-hover:bg-white/10" />
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-md border border-border-strong px-8 py-3.5 text-sm font-semibold text-text-primary transition-all hover:border-accent-text hover:text-accent-text"
              >
                View Leaderboard
              </Link>
            </div>
          </ScrollFadeUp>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="border-t border-border-subtle/50 px-6 py-8">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-primary">
                Jito Cabal
              </span>
              <span className="text-[10px] text-text-muted font-mono">v2</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-text-muted">
              <a href="https://x.com/JitoCabalNFT" target="_blank" rel="noopener noreferrer" className="transition-[color] duration-150 hover:text-accent-text active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm">
                X / Twitter
              </a>
              <a href="https://jitocabal.com/" target="_blank" rel="noopener noreferrer" className="transition-[color] duration-150 hover:text-accent-text active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm">
                Jito Cabal
              </a>
              <a href="https://jitocabal.factorylabs.space/" target="_blank" rel="noopener noreferrer" className="transition-[color] duration-150 hover:text-accent-text active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm">
                Governance
              </a>
            </div>
            <p className="text-[10px] text-text-muted font-mono tracking-wider">
              Contribution over manipulation.
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile auth (fixed bottom) — visible on small screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-xl border-t border-border-subtle p-3">
        <AuthControls compact />
      </div>
    </main>
  );
}
