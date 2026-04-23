'use client';

import { useState } from 'react';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

type SimulatorFlag = 'streakShield' | 'weeklyReset' | 'transparentRules' | 'qualityWeighting';

const SIMULATOR_CONTROLS: { key: SimulatorFlag; label: string; description: string }[] = [
  { key: 'streakShield', label: 'Streak Shields', description: 'Prevents anxiety spikes when real life interrupts consistency.' },
  { key: 'weeklyReset', label: 'Weekly Resets', description: 'Eliminates runaway incumbents in the leaderboard economy.' },
  { key: 'transparentRules', label: 'Transparent Rules', description: 'Shows exactly why points are earned or denied.' },
  { key: 'qualityWeighting', label: 'Quality Weighting', description: 'Rewards signal, not raw posting volume.' },
];

/**
 * Client-only interactive section extracted from the engine page so the
 * rest of that route can remain a server component. Holds the simulator
 * flag state and the derived retention/trust/signal metrics.
 */
export default function EngineSimulator() {
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
  );
}
