'use client';

/**
 * LazyAuthControls — defers loading the wallet-adapter-bound AuthControls
 * on the landing header. Renders a lightweight "Connect" placeholder on
 * first paint and only dynamically imports the real controls when the
 * user shows intent (click, focus, or pointer-enter). On intent we ALSO
 * ask the shared `LazyLandingWalletShell` to mount its <WalletProviders>,
 * so the real AuthControls render inside a live wallet context. Both this
 * component and <LandingAuthGate /> share the same shell, so the wallet
 * adapter chunks are loaded exactly once per page visit.
 */

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLandingWalletMount } from './LazyLandingWalletShell';

const LandingAuthControls = dynamic(
  () => import('./LandingAuthControls'),
  { ssr: false, loading: () => <Placeholder compact /> },
);

function Placeholder({
  compact = false,
  onActivate,
  onPrefetch,
}: {
  compact?: boolean;
  onActivate?: () => void;
  onPrefetch?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      aria-label="Connect wallet"
      className={
        compact
          ? 'bg-bg-base border border-accent-border rounded-lg px-4 py-2 text-xs font-semibold text-text-primary transition-[background-color,border-color,transform] duration-150 hover:bg-bg-raised hover:border-[var(--accent)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
          : 'bg-bg-base border border-accent-border rounded-lg px-6 py-3 font-semibold text-text-primary transition-[background-color,border-color,transform] duration-150 hover:bg-bg-raised hover:border-[var(--accent)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]'
      }
    >
      Connect
    </button>
  );
}

export default function LazyAuthControls({ compact = false }: { compact?: boolean }) {
  const shell = useLandingWalletMount();

  const handlePrefetch = useCallback(() => {
    shell.prefetch();
    void import('./LandingAuthControls');
  }, [shell]);

  const handleActivate = useCallback(() => {
    shell.requestMount();
  }, [shell]);

  if (shell.mounted) return <LandingAuthControls compact={compact} />;
  return <Placeholder compact={compact} onActivate={handleActivate} onPrefetch={handlePrefetch} />;
}
