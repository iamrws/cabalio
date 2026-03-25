'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import AuthControls from '@/components/shared/AuthControls';

interface BehavioralLandingProps {
  authState?: string;
}

type SimulatorFlag = 'streakShield' | 'weeklyReset' | 'transparentRules' | 'qualityWeighting';

const pillarCards = [
  {
    title: 'Autonomy',
    insight: 'Choice keeps motivation intrinsic.',
    mechanics: 'Opt-in challenges, profile control, and skippable events.',
    guardrail: 'No forced continuity or hidden enrollment.',
    accent: '#1f8a70',
  },
  {
    title: 'Competence',
    insight: 'Progress must feel earned and clear.',
    mechanics: 'Transparent point reasons, tier unlocks, and visible quality signals.',
    guardrail: 'No opaque scoring jumps or mystery penalties.',
    accent: '#2657b0',
  },
  {
    title: 'Relatedness',
    insight: 'Community proof beats solo grinding.',
    mechanics: 'Props, mentorship roles, and team quests with shared wins.',
    guardrail: 'No zero-sum status monopolies.',
    accent: '#d5602e',
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

function metricBarColor(kind: 'retention' | 'trust' | 'signal') {
  if (kind === 'retention') return '#1f8a70';
  if (kind === 'trust') return '#2657b0';
  return '#d5602e';
}

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

  const heatmapPalette = ['#efe4cc', '#d4e4d2', '#9bcfb8', '#59b58f', '#1f8a70'];

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
    <main
      className="relative min-h-screen overflow-hidden bg-[#f6f0e5] text-[#10213b]"
      style={{
        fontFamily: '"Avenir Next", "Trebuchet MS", "Century Gothic", "Segoe UI", sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#9bcfb8]/35 blur-3xl"
          animate={{ x: [0, 22, 0], y: [0, -16, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-10 h-96 w-96 rounded-full bg-[#bcd7ff]/30 blur-3xl"
          animate={{ x: [0, -28, 0], y: [0, 12, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#ffd3b7]/25 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 14, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#10213b] text-center text-sm font-bold leading-8 text-[#f6f0e5]">
              JC
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2657b0]">Jito Cabal</p>
              <p className="text-xs text-[#3f5577]">Backed by real yield. Built with humane loops.</p>
            </div>
          </div>
          <nav className="hidden items-center gap-5 text-sm text-[#244260] md:flex">
            <a href="#architecture" className="transition hover:text-[#10213b]">
              Architecture
            </a>
            <a href="#engine" className="transition hover:text-[#10213b]">
              Engine
            </a>
            <a href="#roadmap" className="transition hover:text-[#10213b]">
              Roadmap
            </a>
            <a href="#simulator" className="transition hover:text-[#10213b]">
              Simulator
            </a>
          </nav>
        </header>

        {authState === 'required' ? (
          <div className="mx-auto mb-4 max-w-7xl px-6">
            <div className="rounded-2xl border border-[#d5602e]/30 bg-[#fff7f2] px-4 py-3 text-sm text-[#91451f]">
              Wallet verification is required before accessing member routes. Sign in to continue.
            </div>
          </div>
        ) : null}

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-12 pt-8 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="space-y-7"
          >
            <p className="inline-flex rounded-full border border-[#2657b0]/30 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2657b0]">
              Community Points, Reimagined
            </p>
            <h1
              className="text-4xl font-semibold leading-tight tracking-tight text-[#10213b] md:text-6xl"
              style={{ fontFamily: '"Rockwell Nova", "Avenir Next Condensed", "Trebuchet MS", sans-serif' }}
            >
              A Behavioral OS for a Holder-Gated Community
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-[#274767]">
              This new landing experience turns your psychology playbook into product architecture: ethical
              motivation loops, contribution-first scoring, and anti-burnout safeguards wired directly into the
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
                  className="rounded-xl border border-[#10213b]/10 bg-white/70 px-4 py-3 text-sm font-medium text-[#1e3c5a]"
                >
                  {chip}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#10213b]/10 bg-white/80 p-5 shadow-[0_16px_40px_rgba(16,33,59,0.09)]">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2657b0]">Member Access</p>
                <p className="text-xs text-[#4a6283]">Wallet-signature auth flow</p>
              </div>
              <AuthControls compact />
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="#simulator"
                className="rounded-full bg-[#10213b] px-5 py-2.5 font-semibold text-[#f6f0e5] transition hover:bg-[#1b3358]"
              >
                Test the Engagement Simulator
              </a>
              <Link
                href="/dashboard"
                className="rounded-full border border-[#10213b]/20 bg-white/80 px-5 py-2.5 font-semibold text-[#163250] transition hover:border-[#10213b]/40"
              >
                Open Member Dashboard
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: 'easeOut' }}
            className="space-y-5"
          >
            <div className="rounded-3xl border border-[#10213b]/10 bg-white/80 p-6 shadow-[0_18px_45px_rgba(16,33,59,0.1)]">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2657b0]">Profile Heatmap</p>
                  <h2 className="text-xl font-semibold text-[#10213b]">Low-Pressure Consistency Loop</h2>
                </div>
                <p className="text-xs text-[#4c6485]">GitHub-style activity signal</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#10213b]/10 bg-[#f9f3e8] p-3">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: 'repeat(26, minmax(0, 1fr))' }}
                >
                  {heatmapCells.map((value, idx) => (
                    <div
                      key={idx}
                      className="h-2.5 rounded-sm"
                      style={{ backgroundColor: heatmapPalette[value] }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#4d6484]">
                <p>No rank shaming, just visible momentum.</p>
                <p>26-week snapshot</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[#10213b]/10 bg-[#10213b] p-6 text-[#e7ecf4] shadow-[0_18px_45px_rgba(16,33,59,0.22)]">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9bcfb8]">Bracket Preview</p>
                  <h2 className="text-xl font-semibold">Weekly Cohort Leaderboard</h2>
                </div>
                <p className="text-xs text-[#b9c8dd]">Reset every Monday</p>
              </div>
              <div className="space-y-3">
                {bracketRows.map((row) => (
                  <div key={row.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <p className={row.highlight ? 'font-semibold text-[#ffd8bc]' : 'text-[#d9e2ee]'}>{row.name}</p>
                      <p className="font-mono text-xs text-[#9bcfb8]">
                        {row.points} pts <span className="text-[#79cea7]">{row.delta}</span>
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-[#27486f]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.points / maxBracketPoints) * 100}%`,
                          background: row.highlight
                            ? 'linear-gradient(90deg, #ffd8bc, #d5602e)'
                            : 'linear-gradient(90deg, #9bcfb8, #1f8a70)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="architecture" className="mx-auto w-full max-w-7xl px-6 py-16">
          <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2657b0]">Psychology Core</p>
              <h2 className="text-3xl font-semibold text-[#10213b] md:text-4xl">
                Three Motivation Systems, One Product Language
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[#325070]">
              Built from the strongest insights in your research: autonomy, competence, and relatedness are treated
              as engineering requirements, not marketing copy.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {pillarCards.map((pillar, idx) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: idx * 0.07 }}
                className="rounded-3xl border border-[#10213b]/10 bg-white/80 p-6 shadow-[0_14px_35px_rgba(16,33,59,0.08)]"
              >
                <p className="mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: `${pillar.accent}1c`, color: pillar.accent }}>
                  {pillar.title}
                </p>
                <h3 className="text-lg font-semibold text-[#10213b]">{pillar.insight}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#365574]">{pillar.mechanics}</p>
                <p className="mt-4 border-t border-[#10213b]/10 pt-3 text-xs font-medium uppercase tracking-[0.1em] text-[#4f6786]">
                  Guardrail: {pillar.guardrail}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="engine" className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-[#10213b]/10 bg-white/80 p-6 shadow-[0_14px_35px_rgba(16,33,59,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2657b0]">Engineering Flow</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#10213b]">Contribution-to-Reputation Pipeline</h2>
            <div className="mt-6 space-y-4">
              {engineSteps.map((step) => (
                <div key={step.step} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-[#10213b]/10 bg-[#fefcf8] p-3">
                  <div className="h-9 w-9 rounded-xl bg-[#10213b] text-center font-mono text-sm leading-9 text-[#f6f0e5]">
                    {step.step}
                  </div>
                  <div>
                    <p className="font-semibold text-[#163150]">{step.label}</p>
                    <p className="text-sm leading-relaxed text-[#446383]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#10213b]/10 bg-[#10213b] p-6 text-[#dce6f3] shadow-[0_18px_40px_rgba(16,33,59,0.2)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9bcfb8]">Ethical Safety Rails</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">What We Refuse to Ship</h2>
            <div className="mt-6 space-y-4">
              {antiPatterns.map((pattern) => (
                <div key={pattern.risk} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#ffd8bc]">Risk: {pattern.risk}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#dce6f3]">Countermeasure: {pattern.fix}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roadmap" className="mx-auto w-full max-w-7xl px-6 py-16">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2657b0]">Build Plan</p>
              <h2 className="text-3xl font-semibold text-[#10213b] md:text-4xl">
                18 Features Organized by Impact and Complexity
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[#355474]">
              Foundation first, novelty second: launch trust and clarity before introducing high-variance mechanics.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roadmap.map((phase, idx) => (
              <motion.article
                key={phase.phase}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: idx * 0.05 }}
                className="rounded-3xl border border-[#10213b]/10 bg-white/80 p-5 shadow-[0_12px_30px_rgba(16,33,59,0.08)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-[#10213b] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#f6f0e5]">
                    {phase.phase}
                  </span>
                  <span className="text-xs font-medium text-[#526b8b]">{phase.title}</span>
                </div>
                <div className="space-y-2">
                  {phase.items.map((item) => (
                    <p key={item} className="rounded-xl border border-[#10213b]/10 bg-[#fdf8ef] px-3 py-2 text-sm text-[#264464]">
                      {item}
                    </p>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="simulator" className="mx-auto w-full max-w-7xl px-6 py-16">
          <div className="rounded-[2rem] border border-[#10213b]/10 bg-white/80 p-6 shadow-[0_18px_45px_rgba(16,33,59,0.1)] md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2657b0]">Scenario Builder</p>
                <h2 className="text-3xl font-semibold text-[#10213b] md:text-4xl">
                  Engagement Simulator: Tune the System Live
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-[#355474]">
                Flip safeguards on or off to see how retention, trust, and content quality shift in a simplified model.
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
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      flags[control.key]
                        ? 'border-[#1f8a70]/50 bg-[#eaf7f1]'
                        : 'border-[#10213b]/15 bg-white'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-semibold text-[#153352]">{control.label}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${
                          flags[control.key] ? 'bg-[#1f8a70] text-white' : 'bg-[#d7dee8] text-[#465f80]'
                        }`}
                      >
                        {flags[control.key] ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-[#3f5e7f]">{control.description}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4 rounded-3xl border border-[#10213b]/10 bg-[#fefaf2] p-5">
                {[
                  { label: 'Predicted 14-Day Retention Lift', value: retentionLift, kind: 'retention' as const, suffix: '%' },
                  { label: 'Perceived Trust Score', value: trustScore, kind: 'trust' as const, suffix: '/100' },
                  { label: 'Contribution Signal Quality', value: signalQuality, kind: 'signal' as const, suffix: '/100' },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <p className="font-medium text-[#1e3c5a]">{metric.label}</p>
                      <p className="font-mono text-xs text-[#2e4d6d]">
                        {metric.value}
                        {metric.suffix}
                      </p>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#dce4ef]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: metricBarColor(metric.kind) }}
                        animate={{ width: `${Math.min(metric.value, 100)}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-[#10213b]/10 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5c7697]">
                    Engineering Note
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#355474]">
                    Instrument these feature flags with event telemetry so we can A/B test behavior outcomes before
                    fully rolling out across the holder base.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-8">
          <div className="rounded-[2rem] border border-[#10213b]/10 bg-[#10213b] p-8 text-[#e8eef6] shadow-[0_18px_45px_rgba(16,33,59,0.25)] md:flex md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9bcfb8]">Launch Direction</p>
              <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
                Build a Community Worth Returning To
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#c4d3e6]">
                The system rewards contribution quality, preserves member dignity, and maps cleanly to your
                production stack: wallet auth, admin moderation, immutable ledger, and bracketed progression.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-0">
              <Link
                href="/submit"
                className="rounded-full bg-[#9bcfb8] px-5 py-2.5 text-sm font-semibold text-[#10213b] transition hover:bg-[#b8e0ce]"
              >
                Submit Contribution
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#10213b]/10 px-6 py-8 text-center text-xs uppercase tracking-[0.18em] text-[#546d8e]">
          Jito Cabal Experience Layer v2 | Humane Mechanics | Contribution Over Manipulation
        </footer>
      </div>
    </main>
  );
}
