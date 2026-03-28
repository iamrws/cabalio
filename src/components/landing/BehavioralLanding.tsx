'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
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
    accent: 'var(--accent)',
  },
  {
    num: '02',
    title: 'Competence',
    insight: 'Progress must feel earned and clear.',
    mechanics: 'Transparent point reasons, tier unlocks, and visible quality signals.',
    guardrail: 'No opaque scoring jumps or mystery penalties.',
    accent: 'var(--accent-text)',
  },
  {
    num: '03',
    title: 'Relatedness',
    insight: 'Community proof beats solo grinding.',
    mechanics: 'Props, mentorship roles, and team quests with shared wins.',
    guardrail: 'No zero-sum status monopolies.',
    accent: 'var(--accent)',
  },
];

const engineSteps = [
  {
    step: '01',
    label: 'Wallet Signature + Holder Check',
    detail: 'Nonce challenge and server-side NFT verification gate every protected path.',
  },
  {
    step: '02',
    label: 'Submission Intake with Abuse Controls',
    detail: 'Type validation, duplicate detection, daily caps, and file security screening.',
  },
  {
    step: '03',
    label: 'Human-Reviewed AI Scoring',
    detail: 'Admin moderation decides approval before points ever move.',
  },
  {
    step: '04',
    label: 'Immutable Points Ledger',
    detail: 'Approved actions write auditable point events that power all rankings.',
  },
  {
    step: '05',
    label: 'Weekly Brackets + Humane Streaks',
    detail: 'Resettable competitions, streak shields, and comeback bonuses keep pressure healthy.',
  },
];

const antiPatterns = [
  {
    risk: 'Winner-take-all leaderboards',
    fix: 'Weekly bracket resets keep upward mobility alive for every cohort.',
  },
  {
    risk: 'Anxiety-driven streak mechanics',
    fix: 'Streak shields and comeback bonuses convert failure into recovery loops.',
  },
  {
    risk: 'Volume farming and low-signal content',
    fix: 'Human moderation + quality-weighted scoring keeps trust in the feed.',
  },
  {
    risk: 'Dark-pattern engagement traps',
    fix: 'Opt-outs, public rules, and visible controls are first-class product features.',
  },
];

const roadmap = [
  {
    phase: 'P0',
    title: 'Trust Infrastructure',
    items: ['Transparent point rules', 'Tier unlocks', 'Endowed onboarding', 'Personality notifications'],
  },
  {
    phase: 'P1',
    title: 'Identity Layer',
    items: ['Activity heatmap', 'Skill badges', 'Streak shields', 'Peer props'],
  },
  {
    phase: 'P2',
    title: 'Social Dynamics',
    items: ['Bracket leaderboards', 'Variable rewards', 'Team quests', 'Celebration micro-interactions'],
  },
  {
    phase: 'P3',
    title: 'Long-Term Retention',
    items: ['Mentorship routing', 'Point economy spending', 'Impact year-in-review', 'Seasonal events'],
  },
];

const simulatorControls = [
  {
    key: 'streakShield' as SimulatorFlag,
    label: 'Streak Shields',
    description: 'Prevents anxiety spikes when real life interrupts consistency.',
  },
  {
    key: 'weeklyReset' as SimulatorFlag,
    label: 'Weekly Resets',
    description: 'Eliminates runaway incumbents in the leaderboard economy.',
  },
  {
    key: 'transparentRules' as SimulatorFlag,
    label: 'Transparent Rules',
    description: 'Shows exactly why points are earned or denied.',
  },
  {
    key: 'qualityWeighting' as SimulatorFlag,
    label: 'Quality Weighting',
    description: 'Rewards signal, not raw posting volume.',
  },
];

const bracketRows = [
  { name: 'You', points: 126, delta: '+18', highlight: true },
  { name: 'AnchorNode', points: 133, delta: '+9' },
  { name: 'HelixMint', points: 118, delta: '+11' },
  { name: 'CabalCraft', points: 109, delta: '+7' },
  { name: 'NoirValidator', points: 102, delta: '+6' },
];

/* ─────────────── HELPERS ─────────────── */

function metricBarColor(kind: 'retention' | 'trust' | 'signal') {
  if (kind === 'retention') return 'var(--accent)';
  if (kind === 'trust') return 'var(--accent-text)';
  return 'var(--accent)';
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 as const },
  transition: { duration: 0.6, ease: 'easeOut' as const },
};

/* ─────────────── COMPONENT ─────────────── */

export default function BehavioralLanding({ authState }: BehavioralLandingProps) {
  const [flags, setFlags] = useState<Record<SimulatorFlag, boolean>>({
    streakShield: true,
    weeklyReset: true,
    transparentRules: true,
    qualityWeighting: true,
  });

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

  const retentionLift =
    12 +
    (flags.streakShield ? 9 : 0) +
    (flags.weeklyReset ? 8 : 0) +
    (flags.transparentRules ? 6 : 0) +
    (flags.qualityWeighting ? 5 : 0);
  const trustScore =
    46 +
    (flags.transparentRules ? 24 : 0) +
    (flags.qualityWeighting ? 16 : 0) +
    (flags.weeklyReset ? 8 : 0);
  const signalQuality =
    41 +
    (flags.qualityWeighting ? 27 : 0) +
    (flags.transparentRules ? 12 : 0) +
    (flags.streakShield ? 5 : 0);

  const maxBracketPoints = Math.max(...bracketRows.map((row) => row.points));

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* Ambient background — CSS-only generative mesh */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 15% 30%, rgba(212, 168, 83, 0.08), transparent 55%),
              radial-gradient(ellipse at 85% 15%, rgba(184, 146, 63, 0.06), transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(212, 168, 83, 0.05), transparent 50%),
              var(--bg-base)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A853' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10">
        {/* ─── NAV ─── */}
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent text-center text-sm font-bold leading-9 text-bg-base">
              JC
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent-text">Jito Cabal</p>
              <p className="text-xs text-text-tertiary">Backed by real yield. Built with humane loops.</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
            <a href="#pillars" className="transition hover:text-text-primary">Pillars</a>
            <a href="#engine" className="transition hover:text-text-primary">Engine</a>
            <a href="#roadmap" className="transition hover:text-text-primary">Roadmap</a>
            <a href="#simulator" className="transition hover:text-text-primary">Simulator</a>
          </nav>
        </header>

        {/* Auth warning banner */}
        {authState === 'required' ? (
          <div className="mx-auto mb-4 max-w-7xl px-6">
            <div className="rounded-2xl border border-caution/40 bg-caution/10 px-4 py-3 text-sm text-caution">
              Wallet verification is required before accessing member routes. Sign in to continue.
            </div>
          </div>
        ) : null}

        {/* ═══════════════════ SECTION 1: THE HOOK ═══════════════════ */}
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-16 pt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8"
          >
            <p className="inline-flex rounded-lg border border-accent-border bg-accent-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-accent-text">
              Community Points, Reimagined
            </p>

            <h1 className="font-display text-4xl font-normal leading-[1.12] tracking-tight text-text-primary md:text-6xl lg:text-7xl">
              The inner circle doesn&apos;t grind.{' '}
              <em className="not-italic text-accent-text">It builds.</em>
            </h1>

            <p className="max-w-2xl text-lg leading-relaxed text-text-secondary">
              A behavioral operating system for a holder-gated community. Ethical motivation loops,
              contribution-first scoring, and anti-burnout safeguards — wired directly into the
              Jito Cabal workflow.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Transparent Point Reasons',
                'Weekly Bracket Resets',
                'Streak Shields + Comeback Bonus',
                'Immutable Points Ledger',
              ].map((chip) => (
                <div
                  key={chip}
                  className="rounded-xl border border-border-subtle bg-bg-surface/70 px-4 py-3 text-sm font-medium text-text-secondary"
                >
                  {chip}
                </div>
              ))}
            </div>

            {/* Auth card */}
            <div className="rounded-2xl border border-border-default bg-bg-surface/80 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Member Access</p>
                <p className="text-xs text-text-tertiary">Wallet-signature auth flow</p>
              </div>
              <AuthControls compact />
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="#simulator"
                className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-bg-base transition hover:bg-accent/90 shadow-sm"
              >
                Test the Engagement Simulator
              </a>
              <Link
                href="/dashboard"
                className="rounded-lg border border-border-default bg-bg-surface/80 px-6 py-2.5 font-semibold text-text-primary transition hover:border-border-strong"
              >
                Open Member Dashboard
              </Link>
            </div>
          </motion.div>

          {/* Right column — Heatmap + Bracket */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Heatmap */}
            <div className="rounded-3xl border border-border-default bg-bg-surface/80 p-6 shadow-sm">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Profile Heatmap</p>
                  <h2 className="font-display text-xl font-semibold text-text-primary">Low-Pressure Consistency</h2>
                </div>
                <p className="text-xs text-text-tertiary">26-week snapshot</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-base p-3">
                <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(26, minmax(0, 1fr))' }}>
                  {heatmapCells.map((value, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-sm"
                      style={{ backgroundColor: heatmapPalette[value] }}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-text-tertiary">No rank shaming — just visible momentum.</p>
            </div>

            {/* Bracket leaderboard preview */}
            <div className="rounded-3xl border border-border-default bg-bg-raised p-6 text-text-secondary shadow-md">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Bracket Preview</p>
                  <h2 className="font-display text-xl font-semibold text-text-primary">Weekly Cohort Leaderboard</h2>
                </div>
                <p className="text-xs text-text-secondary">Reset every Monday</p>
              </div>
              <div className="space-y-3">
                {bracketRows.map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <p className={row.highlight ? 'font-semibold text-accent-text' : 'text-text-secondary'}>{row.name}</p>
                      <p className="font-mono text-xs text-accent-text">
                        {row.points} pts <span className="text-accent-text">{row.delta}</span>
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-bg-overlay">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(row.points / maxBracketPoints) * 100}%`,
                          background: row.highlight
                            ? 'linear-gradient(90deg, #D4A853, #B8923F)'
                            : 'linear-gradient(90deg, #6B5B3A, #D4A853)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════ SECTION 2: THREE PILLARS ═══════════════════ */}
        <section id="pillars" className="mx-auto w-full max-w-7xl px-6 py-20">
          <motion.div {...fadeUp} className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Psychology Core</p>
              <h2 className="font-display text-3xl text-text-primary md:text-5xl" style={{ lineHeight: 1.15 }}>
                Three motivation systems,<br />one product language
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-text-secondary">
              Autonomy, competence, and relatedness are treated as engineering requirements, not marketing copy.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillarCards.map((pillar, idx) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="group rounded-3xl border border-border-default bg-bg-surface/80 p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-2xl font-light text-text-tertiary">{pillar.num}</span>
                  <span
                    className="rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
                    style={{ backgroundColor: `color-mix(in srgb, ${pillar.accent} 10%, transparent)`, color: pillar.accent }}
                  >
                    {pillar.title}
                  </span>
                </div>
                <h3 className="text-xl text-text-primary mb-3">{pillar.insight}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{pillar.mechanics}</p>
                <p className="mt-5 border-t border-border-subtle pt-4 text-xs font-medium uppercase tracking-[0.1em] text-text-tertiary">
                  Guardrail — {pillar.guardrail}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ═══════════════════ SECTION 3: THE ENGINE ═══════════════════ */}
        <section id="engine" className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 lg:grid-cols-2">
          {/* Pipeline */}
          <motion.div {...fadeUp} className="rounded-3xl border border-border-default bg-bg-surface/80 p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Engineering Flow</p>
            <h2 className="font-display mt-2 text-3xl text-text-primary">Contribution Pipeline</h2>
            <div className="mt-6 space-y-4">
              {engineSteps.map((step) => (
                <div key={step.step} className="grid grid-cols-[auto_1fr] gap-4 rounded-2xl border border-border-subtle bg-bg-base p-4">
                  <div className="h-10 w-10 rounded-xl bg-accent-muted text-center font-mono text-sm leading-10 text-accent-text">
                    {step.step}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{step.label}</p>
                    <p className="text-sm leading-relaxed text-text-secondary">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Anti-patterns */}
          <motion.div {...fadeUp} className="rounded-3xl border border-border-default bg-bg-raised p-7 text-text-secondary shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Ethical Safety Rails</p>
            <h2 className="font-display mt-2 text-3xl text-text-primary">What We Refuse to Ship</h2>
            <div className="mt-6 space-y-4">
              {antiPatterns.map((pattern) => (
                <div key={pattern.risk} className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-caution">
                    Risk — {pattern.risk}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    Countermeasure — {pattern.fix}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════ SECTION 4: ROADMAP ═══════════════════ */}
        <section id="roadmap" className="mx-auto w-full max-w-7xl px-6 py-20">
          <motion.div {...fadeUp} className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Build Plan</p>
              <h2 className="font-display text-3xl text-text-primary md:text-5xl" style={{ lineHeight: 1.15 }}>
                18 features by impact
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-text-secondary">
              Foundation first, novelty second: trust and clarity before high-variance mechanics.
            </p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {roadmap.map((phase, idx) => (
              <motion.article
                key={phase.phase}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.06 }}
                className="rounded-3xl border border-border-default bg-bg-surface/80 p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-lg bg-accent-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">
                    {phase.phase}
                  </span>
                  <span className="text-xs font-medium text-text-tertiary">{phase.title}</span>
                </div>
                <div className="space-y-2">
                  {phase.items.map((item) => (
                    <p
                      key={item}
                      className="rounded-xl border border-border-subtle bg-bg-base px-3 py-2 text-sm text-text-secondary"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ═══════════════════ SECTION 5: SIMULATOR ═══════════════════ */}
        <section id="simulator" className="mx-auto w-full max-w-7xl px-6 py-20">
          <motion.div {...fadeUp} className="rounded-[2rem] border border-border-default bg-bg-surface/80 p-6 shadow-sm md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-text">Scenario Builder</p>
                <h2 className="font-display text-3xl text-text-primary md:text-4xl">
                  Engagement Simulator
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-text-secondary">
                Flip safeguards on or off to see how retention, trust, and quality shift.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-3">
                {simulatorControls.map((control) => (
                  <button
                    key={control.key}
                    type="button"
                    aria-pressed={flags[control.key]}
                    onClick={() =>
                      setFlags((prev) => ({
                        ...prev,
                        [control.key]: !prev[control.key],
                      }))
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                      flags[control.key]
                        ? 'border-accent-border bg-accent-muted'
                        : 'border-border-default bg-bg-surface'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-semibold text-text-primary">{control.label}</p>
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                          flags[control.key] ? 'bg-accent text-bg-base' : 'bg-border-default text-text-tertiary'
                        }`}
                      >
                        {flags[control.key] ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{control.description}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4 rounded-3xl border border-border-subtle bg-bg-base p-5">
                {[
                  { label: 'Predicted 14-Day Retention Lift', value: retentionLift, kind: 'retention' as const, suffix: '%' },
                  { label: 'Perceived Trust Score', value: trustScore, kind: 'trust' as const, suffix: '/100' },
                  { label: 'Contribution Signal Quality', value: signalQuality, kind: 'signal' as const, suffix: '/100' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <p className="font-medium text-text-primary">{metric.label}</p>
                      <p className="font-mono text-xs text-text-secondary">
                        {metric.value}{metric.suffix}
                      </p>
                    </div>
                    <div className="h-3 rounded-full bg-border-subtle">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: metricBarColor(metric.kind) }}
                        animate={{ width: `${Math.min(metric.value, 100)}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                    Engineering Note
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    These feature flags will be instrumented with event telemetry for A/B testing behavior outcomes
                    before fully rolling out across the holder base.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════ SECTION 6: CTA ═══════════════════ */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-8">
          <div className="rounded-[2rem] border border-border-default bg-bg-raised p-8 text-text-secondary shadow-md md:flex md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-text">Launch Direction</p>
              <h2 className="font-display mt-2 text-3xl text-text-primary md:text-4xl">
                Build a community worth returning to
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                The system rewards contribution quality, preserves member dignity, and maps cleanly to your
                production stack: wallet auth, admin moderation, immutable ledger, and bracketed progression.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-0">
              <Link
                href="/submit"
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-bg-base transition hover:bg-accent/90"
              >
                Submit Contribution
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-lg border border-border-default px-6 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-bg-surface"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-border-subtle px-6 py-10">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="h-card flex items-center gap-3">
              <span className="p-name text-lg font-bold text-text-primary">
                Jito Cabal
              </span>
              <span className="text-xs text-text-tertiary font-mono">v2</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <a href="https://x.com/JitoCabalNFT" target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">
                X / Twitter
              </a>
              <a href="https://jitocabal.com/" target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">
                Jito Cabal
              </a>
              <a href="https://jitocabal.factorylabs.space/" target="_blank" rel="noopener noreferrer" className="transition hover:text-text-primary">
                Governance
              </a>
            </div>
            <p className="text-xs text-text-tertiary font-mono">
              Humane mechanics. Contribution over manipulation.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
