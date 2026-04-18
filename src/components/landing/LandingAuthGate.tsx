'use client';

/**
 * LandingAuthGate — keeps the Solana wallet adapter OFF the landing
 * page's critical path.
 *
 * On first paint: renders a static placeholder that looks identical to the
 * gate's "connect wallet" state, but imports ZERO wallet-adapter code.
 * The real `LandingDashboardGate` (which calls useWallet) is dynamically
 * imported only when the user shows intent — click, focus, or
 * pointer-enter on the Connect button. At that moment the shared
 * `LazyLandingWalletShell` also mounts its <WalletProviders>, so by the
 * time LandingDashboardGate runs its useWallet() the provider context
 * exists. One shell, one provider — no duplicate chunks across the
 * header's auth controls and the gate card.
 */

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Wallet } from 'lucide-react';
import { useLandingWalletMount } from './LazyLandingWalletShell';

const LandingDashboardGate = dynamic(
  () => import('./LandingDashboardGate'),
  {
    ssr: false,
    loading: () => <Placeholder loading />,
  },
);

function Placeholder({
  loading = false,
  onActivate,
  onPrefetch,
}: {
  loading?: boolean;
  onActivate?: () => void;
  onPrefetch?: () => void;
}) {
  return (
    <div
      className="relative rounded-2xl border border-accent-border bg-bg-surface/60 backdrop-blur-md p-8 sm:p-10"
      style={{
        boxShadow:
          '0 0 0 1px rgba(212,168,83,0.08), 0 20px 60px -20px rgba(212,168,83,0.20), inset 0 1px 0 0 rgba(255,255,255,0.02)',
      }}
    >
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
          <button
            type="button"
            onClick={onActivate}
            onPointerEnter={onPrefetch}
            onFocus={onPrefetch}
            aria-label="Connect Solana wallet"
            className="bg-bg-base border border-accent-border rounded-lg px-6 py-3 font-semibold text-text-primary shadow-sm transition-[box-shadow,background-color,transform,border-color] duration-150 hover:shadow-md hover:bg-bg-raised hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-70"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Connect Wallet'}
          </button>
        </div>
        <p className="text-xs text-text-muted font-mono tracking-wide">
          Read-only signature. We never request transaction approval.
        </p>
      </div>
    </div>
  );
}

export default function LandingAuthGate() {
  const shell = useLandingWalletMount();

  const handlePrefetch = useCallback(() => {
    shell.prefetch();
    // Warm the gate bundle too.
    void import('./LandingDashboardGate');
  }, [shell]);

  const handleActivate = useCallback(() => {
    shell.requestMount();
  }, [shell]);

  if (shell.mounted) {
    return <LandingDashboardGate />;
  }

  return <Placeholder onActivate={handleActivate} onPrefetch={handlePrefetch} />;
}
