'use client';

/**
 * LandingAuthControls — the wallet-adapter-bound auth control used in the
 * landing header. Relies on the shared `<LazyLandingWalletShell>` (mounted
 * in the landing layout) for its wallet provider; this component itself
 * does NOT wrap anything. It is loaded lazily (via next/dynamic from
 * LazyAuthControls) only after the shell's provider is mounted.
 */

import AuthControls from '@/components/shared/AuthControls';

export default function LandingAuthControls({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return <AuthControls className={className} compact={compact} />;
}
