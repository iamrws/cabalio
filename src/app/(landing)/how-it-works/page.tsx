'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

/* ─────────────── TYPES ─────────────── */

type SimulatorFlag = 'streakShield' | 'weeklyReset' | 'transparentRules' | 'qualityWeighting';

/* ─────────────── DATA ─────────────── */

const PILLARS = [
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

const ENGINE_STEPS = [
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

const simulatorControls: { key: SimulatorFlag; label: string; description: string }[] = [
  { key: 'streakShield',     label: 'Streak Shields',    description: 'Prevents anxiety spikes when real life interrupts consistency.' },
  { key: 'weeklyReset',      label: 'Weekly Resets',     description: 'Eliminates runaway incumbents in the leaderboard economy.' },
  { key: 'transparentRules', label: 'Transparent Rules', description: 'Shows exactly why points are earned or denied.' },
  { key: 'qualityWeighting', label: 'Quality Weighting', description: 'Rewards signal, not raw posting volume.' },
];

/* ─────────────── PAGE ─────────────── */

export default function HowItWorksPage() {
  const [flags, setFlags] = useState<Record<SimulatorFlag, boolean>>({
    streakShield:     true,
    weeklyReset:      true,
    transparentRules: true,
    qualityWeighting: true,
  });

  /* Metric calculations */
  const retentionLift =
    12 +
    (flags.streakShield     ? 9 : 0) +
    (flags.weeklyReset      ? 8 : 0) +
    (flags.transparentRules ? 6 : 0) +
    (flags.qualityWeighting ? 5 : 0);

  const trustScore =
    46 +
    (flags.transparentRules ? 24 : 0) +
    (flags.qualityWeighting ? 16 : 0) +
    (flags.weeklyReset      ?  8 : 0);

  const signalQuality =
    41 +
    (flags.qualityWeighting  ? 27 : 0) +
    (flags.transparentRules  ? 12 : 0) +
    (flags.streakShield      ?  5 : 0);

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        aria-label="How Jito Cabal works — overview"
        className="w-full py-24"
      >
        <div className="mx-auto w-full max-w-7xl px-6 text-center">
          <ScrollFadeUp className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Platform Overview
            </p>
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.03em] text-text-primary mb-6">
              How Jito Cabal Works
            </h1>
            <p className="text-base leading-[1.7] text-text-secondary max-w-2xl mx-auto">
              A Solana NFT community platform built on behavioural science — not dark patterns.
              Every mechanic maps to a psychological principle, every safety rail has a reason.
            </p>

            {/* Anchor nav */}
            <nav
              aria-label="Page sections"
              className="mt-10 flex flex-wrap justify-center gap-3"
            >
              {[
                { href: '#philosophy', label: 'Philosophy' },
                { href: '#pipeline',   label: 'Pipeline'   },
                { href: '#simulator',  label: 'Simulator'  },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-md border border-border-subtle px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary transition-[border-color,color] duration-200 hover:border-accent-text hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.97]"
                >
                  {label}
                </a>
              ))}
            </nav>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* ═══════════════════ PHILOSOPHY ═══════════════════ */}
      <section
        id="philosophy"
        aria-label="Motivation pillars — the psychological foundations of Jito Cabal"
        className="w-full bg-bg-surface/20 py-24"
      >
        <div className="mx-auto w-full max-w-7xl px-6">
          <ScrollFadeUp className="mb-14 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Psychology Core
            </p>
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary mx-auto max-w-3xl mb-4">
              Three motivation systems,{' '}
              <span className="text-text-tertiary">one product language</span>
            </h2>
            <p className="text-base leading-[1.7] text-text-secondary mx-auto max-w-2xl">
              Every feature in Jito Cabal maps to one of these three Self-Determination Theory pillars.
              If a mechanic doesn't serve autonomy, competence, or relatedness — it doesn't ship.
            </p>
          </ScrollFadeUp>

          {/* Cards grid */}
          <div className="grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar, idx) => (
              <ScrollFadeUp
                key={pillar.title}
                delay={idx * 0.1}
                tabIndex={0}
                role="article"
                className="group relative rounded-xl border border-border-subtle bg-bg-surface/50 p-6 md:p-8 transition-[border-color,background-color] duration-500 hover:border-accent-border hover:bg-bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border active:scale-[0.99]"
              >
                <div className="mb-6 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text transition-[background-color,border-color] duration-500 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {pillar.num}
                  </span>
                  <h3 className="font-display text-2xl text-accent-text">{pillar.title}</h3>
                </div>

                <div className="relative space-y-4">
                  <p className="text-lg font-medium text-text-primary leading-snug">{pillar.insight}</p>
                  <p className="text-sm leading-[1.7] text-text-secondary">{pillar.mechanics}</p>

                  <div className="border-t border-border-subtle pt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
                      Guardrail — {pillar.guardrail}
                    </p>
                  </div>
                </div>

                {/* Hover glow */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow: 'inset 0 1px 0 0 rgba(212,168,83,0.1), 0 0 20px rgba(212,168,83,0.03)',
                  }}
                />
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* ═══════════════════ PIPELINE ═══════════════════ */}
      <section
        id="pipeline"
        aria-label="Contribution pipeline and ethical safety rails"
        className="mx-auto w-full max-w-7xl px-6 py-24"
      >
        <ScrollFadeUp className="mb-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
            Engineering Flow
          </p>
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary mx-auto max-w-3xl">
            Contribution Pipeline
          </h2>
        </ScrollFadeUp>

        {/* Stack on mobile, two columns at lg */}
        <div className="relative grid grid-cols-1 gap-16 lg:grid-cols-2">

          {/* Vertical divider between columns at lg */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-border-subtle lg:block"
          />

          {/* ── LEFT: Pipeline Steps ── */}
          <ScrollFadeUp>
            <div className="space-y-3">
              {ENGINE_STEPS.map((step, idx) => (
                <ScrollFadeUp
                  key={step.step}
                  delay={idx * 0.08}
                  className="group flex gap-4 rounded-lg border border-border-subtle bg-bg-surface/30 p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent-border hover:bg-bg-surface/60 active:bg-bg-surface/80"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-accent-muted font-mono text-sm font-bold text-accent-text transition-[background-color] duration-200 group-hover:bg-accent-muted/80">
                    {step.step}
                  </div>
                  <div>
                    <p className="mb-0.5 text-sm font-semibold text-text-primary">{step.label}</p>
                    <p className="text-xs leading-[1.7] text-text-secondary">{step.detail}</p>
                  </div>
                </ScrollFadeUp>
              ))}
            </div>
          </ScrollFadeUp>

          {/* ── RIGHT: What We Refuse to Build ── */}
          <ScrollFadeUp delay={0.15} className="lg:pl-16">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-caution">
              Ethical Safety Rails
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-semibold leading-snug tracking-[-0.02em] text-text-primary mb-10">
              What We Refuse to Build
            </h3>

            <div className="space-y-3">
              {antiPatterns.map((pattern, idx) => (
                <ScrollFadeUp
                  key={pattern.risk}
                  delay={0.15 + idx * 0.08}
                  className="rounded-lg border border-border-subtle bg-bg-raised/50 p-5 transition-[border-color,background-color] duration-200 hover:border-border-default hover:bg-bg-raised/60 active:bg-bg-raised/80"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-caution/70"
                    />
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution/90">
                      {pattern.risk}
                    </p>
                  </div>
                  <p className="text-sm leading-[1.7] text-text-secondary">
                    <span className="font-semibold text-positive" aria-label="Fix:">
                      Fix:{' '}
                    </span>
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
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* ═══════════════════ SIMULATOR ═══════════════════ */}
      <section id="simulator" className="mx-auto w-full max-w-7xl px-6 py-24">
        <ScrollFadeUp className="mb-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
            Scenario Builder
          </p>
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary">
            Engagement Simulator
          </h2>
          <p className="mt-4 text-sm leading-[1.7] text-text-secondary max-w-xl mx-auto">
            Flip safeguards on or off to see how retention, trust, and quality shift.
          </p>
        </ScrollFadeUp>

        {/* Controls / Results — 2fr controls / 3fr results */}
        <ScrollFadeUp delay={0.1} className="grid gap-8 lg:grid-cols-[2fr_3fr]">
          {/* Controls */}
          <div className="space-y-3">
            {simulatorControls.map((control) => (
              <button
                key={control.key}
                type="button"
                aria-pressed={flags[control.key]}
                onClick={() =>
                  setFlags((prev) => ({ ...prev, [control.key]: !prev[control.key] }))
                }
                className={`w-full rounded-lg border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  flags[control.key]
                    ? 'border-accent-border bg-accent-muted/30 hover:bg-accent-muted/50 hover:border-accent'
                    : 'border-border-subtle bg-bg-surface/30 hover:border-border-default'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-text-primary">{control.label}</p>
                  <span
                    className={`rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-[color,background-color] ${
                      flags[control.key]
                        ? 'bg-accent text-[#08080a]'
                        : 'bg-bg-raised text-text-muted'
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
              { label: '14-Day Retention Lift', value: retentionLift,  max: 40,  suffix: '%'    },
              { label: 'Perceived Trust Score',  value: trustScore,    max: 100, suffix: '/100' },
              { label: 'Signal Quality',          value: signalQuality, max: 100, suffix: '/100' },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
                  <p className="font-mono text-sm font-bold text-accent-text">
                    {metric.value}{metric.suffix}
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-bg-overlay overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-transform duration-500 w-full"
                    style={{
                      transform: `scaleX(${Math.min(metric.value / metric.max, 1)})`,
                      transformOrigin: 'left',
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
              <p className="text-xs leading-[1.7] text-text-secondary">
                Feature flags will be instrumented with event telemetry for A/B testing behavior outcomes
                before fully rolling out across the holder base.
              </p>
            </div>
          </div>
        </ScrollFadeUp>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section
        aria-label="Call to action — join Jito Cabal"
        className="mx-auto w-full max-w-7xl px-6 pt-24 pb-16 sm:pb-24"
      >
        <ScrollFadeUp className="text-center mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-6">
            Ready to Join?
          </p>
          <h2
            className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary mb-6"
            style={{ textWrap: 'balance' }}
          >
            Build a community worth returning to
          </h2>
          <p className="text-sm leading-[1.7] text-text-secondary mb-10">
            The system rewards contribution quality, preserves member dignity, and maps cleanly to your
            production stack: wallet auth, admin moderation, immutable ledger, and bracketed progression.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/submit"
              className="group relative rounded-md bg-accent px-8 py-3.5 text-sm font-semibold text-[#08080a] transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_40px_rgba(212,168,83,0.3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Connect Wallet
              <span className="absolute inset-0 rounded-md bg-white/0 transition-[background-color] duration-200 group-hover:bg-white/10" />
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md border border-border-strong px-8 py-3.5 text-sm font-semibold text-text-primary transition-[border-color,color,transform] duration-200 hover:border-accent-text hover:text-accent-text active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              View Leaderboard
            </Link>
          </div>
        </ScrollFadeUp>
      </section>
    </>
  );
}
