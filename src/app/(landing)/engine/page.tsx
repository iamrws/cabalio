'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

/* ─────────────── DATA ─────────────── */

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

const ANTI_PATTERNS = [
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

type SimulatorFlag = 'streakShield' | 'weeklyReset' | 'transparentRules' | 'qualityWeighting';

const SIMULATOR_CONTROLS: { key: SimulatorFlag; label: string; description: string }[] = [
  { key: 'streakShield', label: 'Streak Shields', description: 'Prevents anxiety spikes when real life interrupts consistency.' },
  { key: 'weeklyReset', label: 'Weekly Resets', description: 'Eliminates runaway incumbents in the leaderboard economy.' },
  { key: 'transparentRules', label: 'Transparent Rules', description: 'Shows exactly why points are earned or denied.' },
  { key: 'qualityWeighting', label: 'Quality Weighting', description: 'Rewards signal, not raw posting volume.' },
];

/* ─────────────── PAGE ─────────────── */

export default function EnginePage() {
  const [flags, setFlags] = useState<Record<SimulatorFlag, boolean>>({
    streakShield: true,
    weeklyReset: true,
    transparentRules: true,
    qualityWeighting: true,
  });

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

  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section aria-label="The engine — how Jito Cabal is built" className="w-full pt-20 sm:pt-28 pb-12">
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-10 text-center">
          <ScrollFadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              The Engine
            </p>
            <h1
              className="mx-auto font-display font-semibold leading-[1.02] tracking-[-0.03em] text-text-primary mb-6"
              style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4rem)' }}
            >
              How the system works under the hood
            </h1>
            <p className="mx-auto max-w-2xl text-base sm:text-lg leading-[1.7] text-text-secondary">
              The contribution pipeline, our anti-pattern guardrails, and a live simulator so you can
              see how each safeguard moves the metrics.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ PIPELINE + ANTI-PATTERNS ═══════════════════ */}
      <section
        id="engine"
        aria-label="Contribution pipeline and ethical safety rails"
        className="w-full py-12 sm:py-16"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10">
          <ScrollFadeUp className="mb-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Engineering Flow
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary">
              Contribution Pipeline & Safety Rails
            </h2>
          </ScrollFadeUp>

          <div className="relative grid grid-cols-1 gap-12 lg:gap-16 lg:grid-cols-2">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-border-subtle lg:block"
            />

            {/* LEFT: Pipeline */}
            <ScrollFadeUp>
              <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-text-secondary">
                Contribution Pipeline
              </p>
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
                      <p className="mb-0.5 text-base font-semibold text-text-primary">{step.label}</p>
                      <p className="text-sm leading-[1.7] text-text-secondary">{step.detail}</p>
                    </div>
                  </ScrollFadeUp>
                ))}
              </div>
            </ScrollFadeUp>

            {/* RIGHT: Anti-patterns */}
            <ScrollFadeUp delay={0.15} className="lg:pl-12">
              <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-text-secondary">
                What We Refuse to Ship
              </p>
              <div className="space-y-3">
                {ANTI_PATTERNS.map((pattern, idx) => (
                  <ScrollFadeUp
                    key={pattern.risk}
                    delay={0.15 + idx * 0.08}
                    className="rounded-lg border border-border-subtle bg-bg-raised/50 p-5 transition-[border-color,background-color] duration-200 hover:border-border-default hover:bg-bg-raised/60 active:bg-bg-raised/80"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full bg-caution/70 flex-shrink-0"
                      />
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution/90">
                        {pattern.risk}
                      </p>
                    </div>
                    <p className="text-base leading-[1.7] text-text-secondary">
                      <span className="font-semibold text-positive" aria-label="Fix:">Fix: </span>
                      {pattern.fix}
                    </p>
                  </ScrollFadeUp>
                ))}
              </div>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      {/* ═══════════════════ SIMULATOR (merged from /simulator) ═══════════════════ */}
      <section
        id="simulator"
        aria-label="Engagement simulator"
        className="w-full bg-bg-surface/20 py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10">
          <ScrollFadeUp className="mb-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Scenario Builder
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-3">
              Engagement Simulator
            </h2>
            <p className="mx-auto max-w-xl text-base leading-[1.7] text-text-secondary">
              Flip safeguards on or off to see how retention, trust, and quality shift.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp delay={0.1} className="grid gap-6 lg:gap-8 lg:grid-cols-[2fr_3fr]">
            {/* Controls */}
            <div className="space-y-3">
              {SIMULATOR_CONTROLS.map((control) => (
                <button
                  key={control.key}
                  type="button"
                  aria-pressed={flags[control.key]}
                  onClick={() => setFlags((prev) => ({ ...prev, [control.key]: !prev[control.key] }))}
                  className={`w-full rounded-lg border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    flags[control.key]
                      ? 'border-accent-border bg-accent-muted/30 hover:bg-accent-muted/50 hover:border-accent'
                      : 'border-border-subtle bg-bg-surface/30 hover:border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-base font-semibold text-text-primary">{control.label}</p>
                    <span
                      className={`rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-[color,background-color] ${
                        flags[control.key]
                          ? 'bg-accent text-[var(--bg-base)]'
                          : 'bg-bg-raised text-text-muted'
                      }`}
                    >
                      {flags[control.key] ? 'On' : 'Off'}
                    </span>
                  </div>
                  <p className="text-xs leading-[1.6] text-text-secondary">{control.description}</p>
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="rounded-xl border border-border-subtle bg-bg-base/80 p-6 space-y-5">
              {[
                { label: '14-Day Retention Lift', value: retentionLift, max: 40, suffix: '%' },
                { label: 'Perceived Trust Score', value: trustScore, max: 100, suffix: '/100' },
                { label: 'Signal Quality', value: signalQuality, max: 100, suffix: '/100' },
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
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="w-full pt-16 pb-24">
        <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 text-center">
          <ScrollFadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Launch Direction
            </p>
            <h2
              className="font-display leading-[1.05] tracking-[-0.03em] text-text-primary mb-6"
              style={{ fontSize: 'clamp(1.875rem, 4.5vw, 3rem)', textWrap: 'balance' } as React.CSSProperties}
            >
              Build a community worth returning to
            </h2>
            <p className="mx-auto max-w-xl text-sm sm:text-base leading-[1.7] text-text-secondary mb-10">
              The system rewards contribution quality, preserves member dignity, and maps cleanly to
              wallet auth, admin moderation, an immutable ledger, and bracketed progression.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="group relative rounded-md bg-accent px-8 py-3.5 text-sm font-semibold text-[var(--bg-base)] transition-[box-shadow,transform,background-color] duration-200 hover:bg-accent-dim hover:shadow-[0_0_40px_rgba(212,168,83,0.3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Open the Dashboard
              </Link>
              <Link
                href="/roadmap"
                className="rounded-md border border-border-strong px-8 py-3.5 text-sm font-semibold text-text-primary transition-[border-color,color,transform] duration-200 hover:border-accent-text hover:text-accent-text active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                See the Roadmap
              </Link>
            </div>
          </ScrollFadeUp>
        </div>
      </section>
    </>
  );
}
