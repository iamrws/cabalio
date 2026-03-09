'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import WalletButton from '@/components/shared/WalletButton';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
            JC
          </div>
          <h1 className="text-2xl font-bold mb-3 text-text-primary">Connect to Enter</h1>
          <p className="text-text-secondary mb-2">
            Connect your Solana wallet to access the Jito Cabal engagement platform.
          </p>
          <p className="text-sm text-text-muted mb-8">
            You must hold a Jito Cabal NFT to participate.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="lg:ml-[260px]">
        <Header />
        <main className="p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
