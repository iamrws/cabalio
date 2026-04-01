'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

/* ─────────────── TYPES ─────────────── */

type SimulatorFlag = 'streakShield' | 'weeklyReset' | 'transparentRules' | 'qualityWeighting';

/* ─────────────── DATA ─────────────── */

const simulatorControls: { key: SimulatorFlag; label: string; description: string }[] = [
  { key: 'streakShield',      label: 'Streak Shields',    description: 'Prevents anxiety spikes when real life interrupts consistency.' },
  { key: 'weeklyReset',       label: 'Weekly Resets',     description: 'Eliminates runaway incumbents in the leaderboard economy.' },
  { key: 'transparentRules',  label: 'Transparent Rules', description: 'Shows exactly why points are earned or denied.' },
  { key: 'qualityWeighting',  label: 'Quality Weighting', description: 'Rewards signal, not raw posting volume.' },
];

/* ─────────────── PAGE ─────────────── */

export default function SimulatorPage() {
  const [flags, setFlags] = useState<Record<SimulatorFlag, boolean>>({
    streakShield:     true,
    weeklyReset:      true,
    transparentRules: true,
    qualityWeighting: true,
  });

  /* Metric calculations — mirrors BehavioralLanding */
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
      {/* ═══════════════════ SIMULATOR ═══════════════════ */}
      <section id="simulator" className="mx-auto w-full max-w-7xl px-6 py-24">
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

        {/* Fix 1: results panel gets more emphasis — 2fr controls / 3fr results */}
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
                /* Fix 4: specific transition props, Fix 5: active scale + focus-visible */
                className={`w-full rounded-lg border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  flags[control.key]
                    ? /* Fix 3: active toggles stay interactive on hover */
                      'border-accent-border bg-accent-muted/30 hover:bg-accent-muted/50 hover:border-accent'
                    : 'border-border-subtle bg-bg-surface/30 hover:border-border-default'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-text-primary">{control.label}</p>
                  <span
                    className={`rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${
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
              { label: '14-Day Retention Lift', value: retentionLift, max: 40,  suffix: '%'    },
              { label: 'Perceived Trust Score',  value: trustScore,   max: 100, suffix: '/100' },
              { label: 'Signal Quality',          value: signalQuality, max: 100, suffix: '/100' },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-text-secondary">{metric.label}</p>
                  <p className="font-mono text-sm font-bold text-accent-text">
                    {metric.value}{metric.suffix}
                  </p>
                </div>
                {/* Fix 2: bars changed from h-1.5 (6px) to h-2.5 (10px) */}
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
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* ═══════════════════ CTA ═══════════════════ */}
      {/* Fix 7: py-24, Fix 8: pb-16 sm:pb-0 for mobile auth bar overlap */}
      <section className="mx-auto w-full max-w-7xl px-6 pt-24 pb-16 sm:pb-24">
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
            {/* Fix 6: active scale, focus-visible, specific transition on CTA buttons */}
            <Link
              href="/submit"
              className="group relative rounded-md bg-accent px-8 py-3.5 text-sm font-semibold text-[#08080a] transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_40px_rgba(212,168,83,0.3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Submit Contribution
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
