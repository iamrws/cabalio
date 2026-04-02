'use client';

import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

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

/* ─────────────── PAGE ─────────────── */

export default function PillarsPage() {
  return (
    <>
      {/* Gold divider at top */}
      <div className="relative mx-auto max-w-5xl px-6 pt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      {/* Fix 6: subtle background variation to differentiate from hero */}
      <section
        id="pillars"
        aria-label="Motivation pillars — the psychological foundations of Jito Cabal"
        className="w-full bg-bg-surface/20 py-24"
      >
        <div className="mx-auto w-full max-w-5xl px-6">
          {/* Section header */}
          <ScrollFadeUp className="mb-14">
            {/* Overline */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Psychology Core
            </p>

            {/* Fix 7: improved heading + subhead */}
            <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.03em] text-text-primary max-w-3xl mb-4">
              Three motivation systems,{' '}
              <span className="text-text-tertiary">one product language</span>
            </h2>

            <p className="text-base leading-[1.7] text-text-secondary max-w-2xl">
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
                {/* Fix 4: prominent numbered badge replacing faded oversized number */}
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text transition-[background-color,border-color] duration-500 group-hover:border-accent/60 group-hover:bg-accent/20"
                  >
                    {pillar.num}
                  </span>
                  {/* Fix 1: title promoted to text-2xl — was text-lg */}
                  <h3 className="font-display text-2xl text-accent-text">{pillar.title}</h3>
                </div>

                {/* Fix 2: increased space-y inside card from implicit to space-y-4 */}
                <div className="relative space-y-4">
                  {/* Fix 1: insight demoted to text-lg — was text-xl */}
                  <p className="text-lg font-medium text-text-primary leading-snug">{pillar.insight}</p>
                  <p className="text-sm leading-[1.7] text-text-secondary">{pillar.mechanics}</p>

                  <div className="border-t border-border-subtle pt-6">
                    {/* Fix 3: guardrail text raised from text-[10px] to text-xs (12px) */}
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
                      Guardrail — {pillar.guardrail}
                    </p>
                  </div>
                </div>

                {/* Hover glow */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    boxShadow:
                      'inset 0 1px 0 0 rgba(212,168,83,0.1), 0 0 20px rgba(212,168,83,0.03)',
                  }}
                />
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Gold divider at bottom */}
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>
    </>
  );
}
