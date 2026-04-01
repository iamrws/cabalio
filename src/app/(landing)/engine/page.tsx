'use client';

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

/* ─────────────── PAGE ─────────────── */

export default function EnginePage() {
  return (
    <>
      {/* Gold divider at top */}
      <div className="relative mx-auto max-w-7xl px-6 pt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      <section
        id="engine"
        aria-label="Contribution pipeline and ethical safety rails"
        className="mx-auto w-full max-w-7xl px-6 py-24"
      >
        {/* Fix 6: stack on mobile, two columns at lg */}
        <div className="relative grid grid-cols-1 gap-16 lg:grid-cols-2">

          {/* Fix 4: vertical divider between columns at lg */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-border-subtle lg:block"
          />

          {/* ── LEFT: Contribution Pipeline ── */}
          <ScrollFadeUp>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text">
              Engineering Flow
            </p>

            {/* Fix 1: primary h2 — larger, dominant */}
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary mb-10">
              Contribution Pipeline
            </h2>

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
                    <p className="text-xs leading-relaxed text-text-secondary">{step.detail}</p>
                  </div>
                </ScrollFadeUp>
              ))}
            </div>
          </ScrollFadeUp>

          {/* ── RIGHT: What We Refuse to Ship ── */}
          <ScrollFadeUp delay={0.15} className="lg:pl-16">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-caution">
              Ethical Safety Rails
            </p>

            {/* Fix 1: secondary heading — smaller than left column primary */}
            <h2 className="font-display text-2xl sm:text-3xl font-semibold leading-snug tracking-[-0.02em] text-text-primary mb-10">
              What We Refuse to Ship
            </h2>

            <div className="space-y-3">
              {antiPatterns.map((pattern, idx) => (
                <ScrollFadeUp
                  key={pattern.risk}
                  delay={0.15 + idx * 0.08}
                  /* Fix 2: hover states on anti-pattern cards */
                  className="rounded-lg border border-border-subtle bg-bg-raised/50 p-5 transition-[border-color,background-color] duration-200 hover:border-border-default hover:bg-bg-raised/60 active:bg-bg-raised/80"
                >
                  {/* Fix 7: risk label in caution color with a small indicator dot */}
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-1.5 w-1.5 rounded-full bg-caution/70 flex-shrink-0"
                    />
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-caution/90">
                      {pattern.risk}
                    </p>
                  </div>

                  {/* Fix 7: fix text with positive color prefix */}
                  <p className="text-sm leading-relaxed text-text-secondary">
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

      {/* Gold divider at bottom */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>
    </>
  );
}
