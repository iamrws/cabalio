'use client';

/**
 * LazyLandingWalletShell — a single lazy wallet-provider root for the
 * entire landing route tree.
 *
 * Architecture:
 *   - Exposes `useLandingWalletMount()` so any descendant (the header's
 *     Connect button, the dashboard gate's Connect button) can request
 *     the wallet provider to mount.
 *   - On mount-request, dynamically imports `@solana/wallet-adapter-*`
 *     once and wraps its children in `<WalletProviders>`. After mount,
 *     all consumers share the SAME provider context — no duplicate
 *     chunks, no duplicate state.
 *   - Until mount-request, renders children with a `null` mount context;
 *     children render lightweight placeholders that don't call
 *     `useWallet()` and don't import wallet-adapter code.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const WalletProviders = dynamic(
  () => import('@/components/shared/Providers'),
  { ssr: false },
);

interface Ctx {
  mounted: boolean;
  requestMount: () => void;
  prefetch: () => void;
}

const LandingWalletMountContext = createContext<Ctx>({
  mounted: false,
  requestMount: () => {},
  prefetch: () => {},
});

export function useLandingWalletMount(): Ctx {
  return useContext(LandingWalletMountContext);
}

export default function LazyLandingWalletShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  const requestMount = useCallback(() => setMounted(true), []);
  const prefetch = useCallback(() => {
    // Warm the dynamic chunk ahead of the click so provider mount feels instant.
    void import('@/components/shared/Providers');
  }, []);

  const ctx = useMemo<Ctx>(
    () => ({ mounted, requestMount, prefetch }),
    [mounted, requestMount, prefetch],
  );

  // Before mount-request: render children directly with the context so
  // descendants can render their interaction-gated placeholders without
  // importing wallet-adapter code.
  //
  // After mount-request: wrap the same children tree in the dynamically-
  // loaded <WalletProviders>. Descendants that consume `mounted === true`
  // then render their `useWallet()` branches inside the live provider.
  return (
    <LandingWalletMountContext.Provider value={ctx}>
      {mounted ? <WalletProviders>{children}</WalletProviders> : children}
    </LandingWalletMountContext.Provider>
  );
}
