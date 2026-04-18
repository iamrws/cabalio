'use client';

/**
 * LandingDashboardGate — the wallet-adapter-dependent slice of the landing page.
 *
 * This module is loaded LAZILY (via next/dynamic with ssr: false) from
 * `LandingAuthGate.tsx` so the Solana wallet adapter chunks stay OFF the
 * landing page's critical path. The shared <LazyLandingWalletShell> in
 * the landing layout owns the wallet provider — this component just
 * renders the gate UI and calls useWallet(). LandingAuthGate requests
 * the shell to mount before swapping in this file.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Flame, Gift, Shield, Target, TrendingUp, Lock, ShieldCheck, Wallet } from 'lucide-react';
import WalletButton from '@/components/shared/WalletButton';
import AnimatedCounter from '@/components/shared/AnimatedCounter';

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

function Inner() {
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

  type Gate = 'loading' | 'connect' | 'verify' | 'ready';
  const gate: Gate = sessionLoading
    ? 'loading'
    : isVerifiedHolder
      ? 'ready'
      : connected
        ? 'verify'
        : 'connect';

  return (
    <div
      className="relative rounded-2xl border border-accent-border bg-bg-surface/60 backdrop-blur-md p-8 sm:p-10"
      style={{
        boxShadow:
          '0 0 0 1px rgba(212,168,83,0.08), 0 20px 60px -20px rgba(212,168,83,0.20), inset 0 1px 0 0 rgba(255,255,255,0.02)',
      }}
    >
      {gate === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-text-muted">Checking session…</p>
        </div>
      )}

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

      {gate === 'ready' && (
        <div className="space-y-6">
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
  );
}

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

export default function LandingDashboardGate() {
  // Wallet provider is mounted by LazyLandingWalletShell (landing layout).
  return <Inner />;
}
