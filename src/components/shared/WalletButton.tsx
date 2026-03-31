'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';


export default function WalletButton({ className = '' }: { className?: string }) {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  if (connected && publicKey) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 rounded-lg bg-bg-raised px-3 py-2 border border-border-subtle">
          <div className="h-2 w-2 rounded-full bg-positive" />
          <span className="font-mono text-sm text-text-primary">{truncatedAddress}</span>
        </div>
        <button
          onClick={() => disconnect()}
          aria-label="Disconnect wallet"
          className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      aria-label="Connect Solana wallet"
      className={`
        bg-bg-base border border-accent-border rounded-lg px-6 py-3 font-semibold text-text-primary
        shadow-sm
        transition-all duration-200
        hover:shadow-md hover:bg-bg-raised hover:scale-[1.02] active:scale-[0.98]
        ${className}
      `}
    >
      Connect Wallet
    </button>
  );
}
