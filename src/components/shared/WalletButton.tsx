'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';

export default function WalletButton({ className = '' }: { className?: string }) {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  if (connected && publicKey) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 border border-stone-200/60">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono text-sm text-[#1c1917]">{truncatedAddress}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => disconnect()}
          aria-label="Disconnect wallet"
          className="rounded-xl px-3 py-2 text-sm text-stone-500 hover:text-[#1c1917] transition-colors"
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setVisible(true)}
      aria-label="Connect Solana wallet"
      className={`
        bg-[#1c1917] rounded-xl px-6 py-3 font-semibold text-[#faf7f2]
        shadow-[0_4px_20px_rgba(28,25,23,0.15)]
        transition-all duration-200
        hover:shadow-[0_8px_30px_rgba(28,25,23,0.2)] hover:bg-[#292524]
        ${className}
      `}
    >
      Connect Wallet
    </motion.button>
  );
}
