'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from './WalletButton';

interface SessionInfo {
  walletAddress: string;
  isHolder: boolean;
  role: 'member' | 'admin';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export default function AuthControls({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { connected, publicKey, signMessage } = useWallet();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');

  const walletAddress = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session', { method: 'GET', cache: 'no-store' });
      const data = await response.json();
      setSession(data.session ?? null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleVerify = useCallback(async () => {
    if (!walletAddress || !signMessage) {
      setError('Connected wallet does not support signing messages.');
      return;
    }

    setAuthenticating(true);
    setError('');

    try {
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const nonceData = await nonceResponse.json();
      if (!nonceResponse.ok) {
        throw new Error(nonceData.error || 'Failed to initialize authentication');
      }

      const message = nonceData.message as string;
      const signatureBytes = await signMessage(new TextEncoder().encode(message));
      const signature = bytesToBase64(signatureBytes);

      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Authentication failed');
      }

      setSession(verifyData.session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed');
      setSession(null);
    } finally {
      setAuthenticating(false);
    }
  }, [signMessage, walletAddress]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    setSession(null);
  }, []);

  if (loading) {
    return <div className={`text-sm text-stone-400 ${className}`}>Checking access...</div>;
  }

  if (!session) {
    return (
      <div className={`space-y-3 ${className}`}>
        {!connected ? (
          <WalletButton />
        ) : (
          <button
            onClick={handleVerify}
            disabled={authenticating}
            aria-label="Verify NFT ownership and log in"
            className="bg-[#1c1917] rounded-xl px-5 py-2.5 font-semibold text-[#faf7f2] disabled:opacity-60 transition-colors hover:bg-[#292524]"
          >
            {authenticating ? 'Verifying...' : 'Verify NFT & Login'}
          </button>
        )}
        {error ? <div role="alert" className="text-xs text-red-600">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className={`flex ${compact ? 'items-center gap-2' : 'flex-col gap-3'} ${className}`}>
      <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-mono">
        Holder verified: {session.walletAddress.slice(0, 4)}...{session.walletAddress.slice(-4)}
      </div>
      <div className={`flex ${compact ? 'items-center gap-2' : 'items-center gap-3'}`}>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-2 text-xs text-[#0f766e] font-medium hover:bg-[#0f766e]/15 transition-colors"
        >
          Enter Dashboard
        </Link>
        {session.role === 'admin' ? (
          <Link
            href="/cabal-core"
            className="rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3 py-2 text-xs text-[#7c3aed] font-medium hover:bg-[#7c3aed]/15 transition-colors"
          >
            Admin
          </Link>
        ) : null}
        <button
          onClick={handleLogout}
          aria-label="Log out of current session"
          className="rounded-xl border border-stone-200/60 px-3 py-2 text-xs text-stone-500 hover:text-[#1c1917] transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
