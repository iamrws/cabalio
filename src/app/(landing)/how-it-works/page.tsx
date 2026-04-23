import Link from 'next/link';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

/* ─────────────── DATA ─────────────── */

const STEPS = [
  {
    num: '01',
    title: 'Connect your wallet',
    body: 'Sign in with your Solana wallet. We verify your Jito Cabal NFT holder status automatically.',
  },
  {
    num: '02',
    title: 'Contribute and get scored',
    body: 'Submit content — posts, blogs, artwork. Every submission is human-reviewed before points move.',
  },
  {
    num: '03',
    title: 'Climb the leaderboard',
    body: 'Earn points, unlock tiers, compete in weekly brackets with fair resets.',
  },
];

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

const COMMITMENTS = [
  'Weekly resets keep the leaderboard open to everyone',
  'Streak shields mean life never costs you progress',
  'Human moderation keeps quality high, not volume',
  'Every rule is public. Every opt-out works.',
];

/* ─────────────── PAGE ─────────────── */

export default function HowItWorksPage() {
  return (
    <>
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section
        aria-label="How Jito Cabal works"
        className="w-full pt-20 sm:pt-28 pb-16"
      >
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-10 text-center">
          <ScrollFadeUp>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              Field Manual
            </p>
            <h1
              className="mx-auto font-display font-semibold leading-[1.02] tracking-[-0.03em] text-text-primary mb-6"
              style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4rem)' }}
            >
              How Jito Cabal Works
            </h1>
            <p className="mx-auto max-w-2xl text-base sm:text-lg leading-[1.7] text-text-secondary">
              A Solana NFT community platform built around contribution, transparency, and fair competition.
              Every mechanic has a reason — and a guardrail.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ THREE STEPS ═══════════════════ */}
      <section
        aria-label="How to get started — three steps"
        className="w-full py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-10 text-center">
          <ScrollFadeUp className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              Three Steps
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-3">
              From wallet to leaderboard
            </h2>
            <p className="mx-auto max-w-xl text-base leading-[1.7] text-text-secondary">
              Minutes to get started. Years to master.
            </p>
          </ScrollFadeUp>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {STEPS.map((step, idx) => (
              <ScrollFadeUp key={step.num} delay={idx * 0.08}>
                <div className="group h-full rounded-xl border border-border-subtle bg-bg-surface/40 p-6 text-center transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-surface/60">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text mb-4 mx-auto transition-[background-color,border-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {step.num}
                  </span>
                  <h3 className="text-lg font-semibold text-text-primary mb-2 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-[1.7] text-text-secondary">
                    {step.body}
                  </p>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PSYCHOLOGY PILLARS (merged from /pillars) ═══════════════════ */}
      <section
        id="pillars"
        aria-label="Motivation pillars — the psychological foundations of Jito Cabal"
        className="w-full bg-bg-surface/20 py-20 sm:py-24"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 text-center">
          <ScrollFadeUp className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent-text mb-4">
              Psychology Core
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-4">
              Three motivation systems,{' '}
              <span className="text-text-tertiary">one product language</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-[1.7] text-text-secondary">
              Every feature in Jito Cabal maps to one of these three Self-Determination Theory pillars.
              If a mechanic doesn&apos;t serve autonomy, competence, or relatedness — it doesn&apos;t ship.
            </p>
          </ScrollFadeUp>

          <div className="grid gap-6 md:gap-8 md:grid-cols-3 text-left">
            {PILLARS.map((pillar, idx) => (
              <ScrollFadeUp
                key={pillar.title}
                delay={idx * 0.1}
                tabIndex={0}
                role="article"
                className="group relative rounded-xl border border-border-subtle bg-bg-surface/50 p-6 md:p-7 transition-[border-color,background-color] duration-300 hover:border-accent-border hover:bg-bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border active:scale-[0.99]"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text transition-[background-color,border-color] duration-300 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {pillar.num}
                  </span>
                  <h3 className="font-display text-xl text-accent-text">{pillar.title}</h3>
                </div>

                <div className="space-y-3">
                  <p className="text-base font-medium text-text-primary leading-snug">{pillar.insight}</p>
                  <p className="text-sm leading-[1.7] text-text-secondary">{pillar.mechanics}</p>

                  <div className="border-t border-border-subtle pt-4 mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary leading-relaxed">
                      Guardrail — {pillar.guardrail}
                    </p>
                  </div>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ OUR COMMITMENTS ═══════════════════ */}
      <section
        aria-label="Our commitments"
        className="w-full py-20"
      >
        <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 text-center">
          <ScrollFadeUp className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              Commitments
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-3">
              The rules we hold ourselves to
            </h2>
            <p className="text-base leading-[1.7] text-text-secondary">
              Publicly. Auditably. Always.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp delay={0.08}>
            <ul className="mx-auto inline-flex flex-col gap-4 text-left" role="list">
              {COMMITMENTS.map((commitment) => (
                <li key={commitment} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[0.5em] inline-block h-2 w-2 flex-shrink-0 rounded-full bg-accent"
                  />
                  <p className="text-base leading-[1.7] text-text-secondary">
                    {commitment}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section
        aria-label="Get started with Jito Cabal"
        className="w-full pt-16 pb-24"
      >
        <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 text-center">
          <ScrollFadeUp>
            <h2
              className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary mb-4"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              Start earning with your community
            </h2>
            <p className="mx-auto max-w-xl text-base leading-[1.7] text-text-secondary mb-10">
              Connect your wallet and start contributing. Quality work gets recognized.
            </p>
            <div className="flex justify-center">
              <Link
                href="/"
                className="group relative inline-flex items-center rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-[var(--bg-base)] transition-[box-shadow,transform,background-color] duration-200 hover:bg-accent-dim hover:shadow-[0_0_40px_rgba(212,168,83,0.3)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Connect Your Wallet
              </Link>
            </div>
          </ScrollFadeUp>
        </div>
      </section>
    </>
  );
}
