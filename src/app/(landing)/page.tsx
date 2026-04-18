'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Flame, Gift, Shield, Target, TrendingUp, Lock, ShieldCheck, Wallet } from 'lucide-react';
import WalletButton from '@/components/shared/WalletButton';
import { ScrollFadeUp } from '@/components/landing/ScrollFadeUp';

// Only shown in the 'ready' gate state — lazy-load to keep initial bundle lean.
const AnimatedCounter = dynamic(() => import('@/components/shared/AnimatedCounter'), {
  ssr: false,
  loading: () => <span className="font-mono tabular-nums text-accent-text">—</span>,
});

/* ─────────────── TYPES ─────────────── */

interface SessionInfo {
  walletAddress: string;
  isHolder: boolean;
  role: 'member' | 'admin';
}

interface CommandCenter {
  tier: { current: string; current_points: number; next_tier: string | null; points_to_next: number; progress: number };
  streak: { current_days: number; shields_available: number };
  bracket: { name: string; rank: number; members: number; points: number; points_to_next_rank: number };
}

interface Projections {
  avg_weekly_points: number;
  estimated_weekly_sol: number;
  trend: 'up' | 'down' | 'stable';
  trend_pct: number;
}

interface RewardSummary {
  rewards: { reward_amount_lamports: number; status: 'claimable' | 'claimed' | 'expired' }[];
}

interface SeasonQuest {
  id: string;
  title: string;
  points_reward: number;
  can_submit: boolean;
}

const FEATURE_HIGHLIGHTS = [
  {
    num: '01',
    title: 'Transparent Points',
    body: 'Every point has a reason. Every tier unlock is visible.',
  },
  {
    num: '02',
    title: 'Weekly Resets',
    body: 'Fair brackets. No runaway incumbents. Open to everyone.',
  },
  {
    num: '03',
    title: 'Holder-Gated',
    body: 'Sign with your Jito Cabal NFT wallet. Real members only.',
  },
];

/* ─────────────── HELPERS ─────────────── */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const TIER_COLOR: Record<string, string> = {
  'Cabal Elite': 'text-[var(--tier-elite)]',
  'Cabal Member': 'text-[var(--tier-member)]',
  'Cabal Initiate': 'text-[var(--tier-initiate)]',
};

/* ─────────────── PAGE ─────────────── */

export default function HomePage() {
  const { connected, publicKey, signMessage } = useWallet();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');

  const [commandCenter, setCommandCenter] = useState<CommandCenter | null>(null);
  const [projections, setProjections] = useState<Projections | null>(null);
  const [rewards, setRewards] = useState<RewardSummary['rewards']>([]);
  const [quests, setQuests] = useState<SeasonQuest[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const walletAddress = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);
  const isVerifiedHolder = !!session?.isHolder;

  /* ── Load session on mount ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/session', { method: 'GET', cache: 'no-store' });
        const data = await r.json();
        if (!cancelled) setSession(data.session ?? null);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Verify NFT & sign in ── */
  const handleVerify = useCallback(async () => {
    if (!walletAddress || !signMessage) {
      setAuthError('Connected wallet does not support message signing.');
      return;
    }
    setAuthenticating(true);
    setAuthError('');
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.error || 'Failed to start authentication');

      const message = nonceData.message as string;
      const sigBytes = await signMessage(new TextEncoder().encode(message));
      const signature = bytesToBase64(sigBytes);

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'NFT verification failed');

      setSession(verifyData.session);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Authentication failed');
      setSession(null);
    } finally {
      setAuthenticating(false);
    }
  }, [signMessage, walletAddress]);

  /* ── Once verified, hydrate the dashboard preview ── */
  useEffect(() => {
    if (!isVerifiedHolder) return;
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const results = await Promise.allSettled([
          fetch('/api/me/command-center', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/me/reward-projections', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/me/summary', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/seasons/current/quests', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (results[0].status === 'fulfilled') setCommandCenter(results[0].value);
        if (results[1].status === 'fulfilled') setProjections(results[1].value);
        if (results[2].status === 'fulfilled') setRewards(results[2].value?.rewards || []);
        if (results[3].status === 'fulfilled') setQuests((results[3].value?.quests || []).slice(0, 3));
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isVerifiedHolder]);

  const claimableSol = useMemo(
    () => rewards.filter((r) => r.status === 'claimable').reduce((s, r) => s + r.reward_amount_lamports, 0) / 1e9,
    [rewards],
  );
  const tierProgress = Math.round((commandCenter?.tier.progress || 0) * 100);

  /* ── Gate state for the CTA ── */
  type Gate = 'loading' | 'connect' | 'verify' | 'ready';
  const gate: Gate = sessionLoading
    ? 'loading'
    : isVerifiedHolder
      ? 'ready'
      : connected
        ? 'verify'
        : 'connect';

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* ═══════ ATMOSPHERIC BACKGROUND ═══════ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 25%, rgba(212,168,83,0.10), transparent 70%),
              var(--bg-base)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* ═══════════════════ HERO + GATE ═══════════════════ */}
      <section
        aria-label="Jito Cabal — holder dashboard"
        className="relative z-10 w-full"
      >
        <div className="mx-auto w-full max-w-4xl px-6 sm:px-10 pt-10 sm:pt-16 pb-20 text-center">

          {/* Overline */}
          <ScrollFadeUp>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-muted/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Holder Dashboard
            </span>
          </ScrollFadeUp>

          {/* Headline */}
          <ScrollFadeUp delay={0.05}>
            <h1
              className="mt-8 mx-auto max-w-3xl font-display font-semibold leading-[1.05] tracking-[-0.03em] text-text-primary"
              style={{ fontSize: 'clamp(2.5rem, 6.5vw, 5rem)' }}
            >
              Your Cabal,{' '}
              <span
                className="text-accent-text"
                style={{ textShadow: '0 0 60px rgba(212,168,83,0.3)' }}
              >
                front and center.
              </span>
            </h1>
          </ScrollFadeUp>

          {/* Subhead */}
          <ScrollFadeUp delay={0.1}>
            <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-[1.7] text-text-secondary">
              Sign in with the Solana wallet that holds your Jito Cabal NFT. We verify on-chain — then your
              live dashboard appears below.
            </p>
          </ScrollFadeUp>

          {/* ═════════ DASHBOARD GATE CARD ═════════ */}
          <ScrollFadeUp delay={0.15}>
            <div className="mt-12 mx-auto w-full max-w-3xl">
              <div
                className="relative rounded-2xl border border-accent-border bg-bg-surface/60 backdrop-blur-md p-8 sm:p-10"
                style={{
                  boxShadow:
                    '0 0 0 1px rgba(212,168,83,0.08), 0 20px 60px -20px rgba(212,168,83,0.20), inset 0 1px 0 0 rgba(255,255,255,0.02)',
                }}
              >
                {/* ── State: loading session ── */}
                {gate === 'loading' && (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                    <p className="text-sm text-text-muted">Checking session…</p>
                  </div>
                )}

                {/* ── State: not connected — prompt wallet connect ── */}
                {gate === 'connect' && (
                  <div className="flex flex-col items-center text-center gap-6">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                      <Wallet className="w-6 h-6 text-accent-text" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="font-display text-2xl sm:text-3xl text-text-primary">
                        Connect your Solana wallet
                      </h2>
                      <p className="mx-auto max-w-md text-sm sm:text-base text-text-secondary leading-[1.7]">
                        Phantom or Solflare. Your wallet must hold a Jito Cabal NFT to access the dashboard.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <WalletButton />
                    </div>
                    <p className="text-xs text-text-muted font-mono tracking-wide">
                      Read-only signature. We never request transaction approval.
                    </p>
                  </div>
                )}

                {/* ── State: connected, needs verification ── */}
                {gate === 'verify' && (
                  <div className="flex flex-col items-center text-center gap-6">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                      <Lock className="w-6 h-6 text-accent-text" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="font-display text-2xl sm:text-3xl text-text-primary">
                        Verify your Jito Cabal NFT
                      </h2>
                      <p className="mx-auto max-w-md text-sm sm:text-base text-text-secondary leading-[1.7]">
                        Sign a one-time message to prove ownership. We&apos;ll check your wallet on-chain
                        via Helius and unlock the dashboard.
                      </p>
                      {walletAddress && (
                        <p className="text-xs text-text-muted font-mono">
                          Wallet: {walletAddress.slice(0, 6)}…{walletAddress.slice(-6)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={authenticating}
                      className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-[var(--bg-base)] disabled:opacity-60 disabled:cursor-not-allowed transition-[box-shadow,transform,background-color] duration-200 hover:bg-accent-dim hover:shadow-[0_0_40px_rgba(212,168,83,0.30)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      {authenticating ? 'Verifying NFT…' : 'Verify NFT & Login'}
                    </button>
                    {authError && (
                      <p role="alert" className="text-xs text-negative max-w-md">
                        {authError}
                      </p>
                    )}
                  </div>
                )}

                {/* ── State: verified — show dashboard preview ── */}
                {gate === 'ready' && (
                  <div className="space-y-6">
                    {/* Verified banner */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
                      <span className="inline-flex items-center gap-2 rounded-full border border-positive-border bg-positive-muted px-3 py-1 text-xs text-positive font-mono">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Holder verified
                      </span>
                      {session && (
                        <span className="text-xs text-text-muted font-mono">
                          {session.walletAddress.slice(0, 4)}…{session.walletAddress.slice(-4)}
                        </span>
                      )}
                    </div>

                    {previewLoading && !commandCenter ? (
                      <div className="flex flex-col items-center gap-3 py-10">
                        <div className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                        <p className="text-sm text-text-muted">Loading your dashboard…</p>
                      </div>
                    ) : (
                      <>
                        {/* Rank + Tier hero */}
                        {commandCenter && (
                          <div className="text-center space-y-3">
                            <div
                              className={`font-display font-bold leading-none ${TIER_COLOR[commandCenter.tier.current] || 'text-accent-text'}`}
                              style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)', letterSpacing: '-0.03em' }}
                            >
                              #{commandCenter.bracket.rank}
                            </div>
                            <div className="text-base sm:text-lg font-display text-text-primary">
                              {commandCenter.tier.current}
                            </div>
                            <p className="text-xs text-text-muted font-mono">
                              of {commandCenter.bracket.members} members in {commandCenter.bracket.name}
                            </p>

                            {/* Tier progress */}
                            <div className="mx-auto max-w-md pt-2">
                              <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                                <span>Tier progress</span>
                                <span className="font-mono">{tierProgress}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-bg-raised overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--accent)] transition-transform duration-500"
                                  style={{ transform: `scaleX(${tierProgress / 100})`, transformOrigin: 'left' }}
                                />
                              </div>
                              {commandCenter.tier.next_tier && (
                                <p className="text-xs text-text-muted mt-1.5">
                                  {commandCenter.tier.points_to_next} pts to {commandCenter.tier.next_tier}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stat strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                          <PreviewStat
                            icon={<Flame className="w-4 h-4" />}
                            label="Day streak"
                            value={commandCenter ? String(commandCenter.streak.current_days) : '—'}
                          />
                          <PreviewStat
                            icon={<Shield className="w-4 h-4" />}
                            label="Shields"
                            value={commandCenter ? String(commandCenter.streak.shields_available) : '—'}
                          />
                          <PreviewStat
                            icon={<TrendingUp className="w-4 h-4" />}
                            label="Pts/week"
                            value={projections ? String(projections.avg_weekly_points) : '—'}
                          />
                          <PreviewStat
                            icon={<Gift className="w-4 h-4" />}
                            label="SOL claimable"
                            valueNode={
                              <AnimatedCounter
                                value={claimableSol}
                                decimals={3}
                                className={claimableSol > 0 ? 'text-positive' : 'text-text-tertiary'}
                              />
                            }
                          />
                        </div>

                        {/* Active quests preview */}
                        {quests.length > 0 && (
                          <div className="rounded-lg border border-border-subtle bg-bg-raised/50 p-4">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <Target className="w-4 h-4 text-accent-text" />
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
                                Active missions
                              </p>
                            </div>
                            <ul className="space-y-2 text-center" role="list">
                              {quests.map((q) => (
                                <li key={q.id} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-text-primary truncate">{q.title}</span>
                                  <span className="font-mono text-xs text-positive flex-shrink-0">+{q.points_reward}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Enter dashboard CTA */}
                        <div className="flex justify-center pt-2">
                          <Link
                            href="/dashboard"
                            className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-[var(--bg-base)] transition-[box-shadow,transform,background-color] duration-200 hover:bg-accent-dim hover:shadow-[0_0_40px_rgba(212,168,83,0.30)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                          >
                            Enter Full Dashboard →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollFadeUp>

          {/* Quick links to the other 3 pages — centered */}
          <ScrollFadeUp delay={0.2}>
            <nav
              aria-label="Explore Jito Cabal"
              className="mt-12 flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.15em] text-text-muted"
            >
              <Link
                href="/how-it-works"
                className="rounded-md border border-border-subtle px-4 py-2 transition-[color,border-color] duration-150 hover:text-accent-text hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                How It Works
              </Link>
              <Link
                href="/roadmap"
                className="rounded-md border border-border-subtle px-4 py-2 transition-[color,border-color] duration-150 hover:text-accent-text hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Roadmap
              </Link>
              <Link
                href="/engine"
                className="rounded-md border border-border-subtle px-4 py-2 transition-[color,border-color] duration-150 hover:text-accent-text hover:border-accent-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                The Engine
              </Link>
            </nav>
          </ScrollFadeUp>
        </div>
      </section>

      {/* ═══════════════════ FEATURE HIGHLIGHTS ═══════════════════ */}
      <section
        aria-label="Why Jito Cabal"
        className="relative z-10 w-full bg-bg-surface/20 py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 text-center">
          <ScrollFadeUp className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-text mb-4">
              The Platform
            </p>
            <h2 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.03em] text-text-primary">
              Built for holders who build
            </h2>
          </ScrollFadeUp>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            {FEATURE_HIGHLIGHTS.map((f, idx) => (
              <ScrollFadeUp key={f.num} delay={idx * 0.08}>
                <div className="group h-full rounded-xl border border-border-subtle bg-bg-surface/40 p-6 sm:p-7 text-center transition-[border-color,background-color] duration-200 hover:border-accent-border hover:bg-bg-surface/60">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-display text-sm font-bold tracking-wider text-accent-text mb-4 mx-auto transition-[background-color,border-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/20">
                    {f.num}
                  </span>
                  <h3 className="text-lg font-semibold text-text-primary mb-2 leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-[1.7] text-text-secondary">
                    {f.body}
                  </p>
                </div>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── SUBCOMPONENTS ─────────────── */

function PreviewStat({
  icon,
  label,
  value,
  valueNode,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-raised/40 px-3 py-3">
      <span className="text-accent-text">{icon}</span>
      <span className="font-mono text-base sm:text-lg font-bold text-text-primary leading-none">
        {valueNode ?? value}
      </span>
      <span className="text-[10px] uppercase tracking-[0.12em] text-text-muted">{label}</span>
    </div>
  );
}
