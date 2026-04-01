'use client';

import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

const roadmap = [
  {
    phase: 'P0',
    step: '01',
    title: 'Trust Infrastructure',
    items: [
      'Transparent point rules',
      'Tier unlocks',
      'Endowed onboarding',
      'Personality notifications',
    ],
  },
  {
    phase: 'P1',
    step: '02',
    title: 'Identity Layer',
    items: ['Activity heatmap', 'Skill badges', 'Streak shields', 'Peer props'],
  },
  {
    phase: 'P2',
    step: '03',
    title: 'Social Dynamics',
    items: [
      'Bracket leaderboards',
      'Variable rewards',
      'Team quests',
      'Celebration micro-interactions',
    ],
  },
  {
    phase: 'P3',
    step: '04',
    title: 'Long-Term Retention',
    items: [
      'Mentorship routing',
      'Point economy spending',
      'Impact year-in-review',
      'Seasonal events',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-24">
      {/* Header */}
      <ScrollFadeUp className="mb-16 max-w-2xl">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text">
          Build Plan
        </p>
        <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary">
          16 features by impact
        </h2>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          Foundation first, novelty second: trust and clarity before high-variance mechanics.
        </p>
        <p className="mt-3 text-sm leading-[1.7] text-text-muted">
          Each phase unlocks the next. We ship trust infrastructure before social dynamics — because
          leaderboards without transparency breed anxiety, not engagement. Four sequential milestones,
          sixteen features, one coherent system.
        </p>
      </ScrollFadeUp>

      {/* Phase grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roadmap.map((phase, idx) => (
          <ScrollFadeUp
            key={phase.phase}
            delay={idx * 0.08}
            tabIndex={0}
            className="group rounded-xl border border-border-subtle bg-bg-surface/30 p-6 transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.99]"
          >
            {/* Step number + phase badge row */}
            <div className="mb-5 flex items-center justify-between">
              {/* Prominent step number */}
              <span className="font-mono text-3xl font-bold leading-none text-accent/50 group-hover:text-accent/70 transition-[color] duration-200">
                {phase.step}
              </span>
              {/* Phase badge */}
              <span className="rounded-sm bg-accent/10 px-2.5 py-1 font-mono text-xs font-bold text-accent-text">
                {phase.phase}
              </span>
            </div>

            {/* Phase title */}
            <p className="mb-4 text-xs uppercase tracking-wider text-text-secondary font-semibold">
              {phase.title}
            </p>

            {/* Feature list */}
            <div className="space-y-1.5">
              {phase.items.map((item) => (
                <p
                  key={item}
                  className="rounded-md border border-border-subtle/50 bg-bg-base/60 px-3 py-2 text-sm text-text-primary"
                >
                  {item}
                </p>
              ))}
            </div>
          </ScrollFadeUp>
        ))}
      </div>
    </section>
  );
}
