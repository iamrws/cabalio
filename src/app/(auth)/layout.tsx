'use client';

import TopNav from '@/components/layout/TopNav';
import BottomBar from '@/components/layout/BottomBar';
import { UserProvider } from '@/components/shared/UserProvider';
import { SubmitDrawerProvider } from '@/components/shared/SubmitDrawerProvider';
import SubmitDrawer from '@/components/shared/SubmitDrawer';
import WalletProviders from '@/components/shared/Providers';
import dynamic from 'next/dynamic';
import { AiOrNotProvider } from '@/components/game/AiOrNotPanel';

const AiOrNotPanel = dynamic(
  () => import('@/components/game/AiOrNotPanel').then(m => ({ default: m.default })),
  { ssr: false, loading: () => null }
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProviders>
    <UserProvider>
    <AiOrNotProvider>
    <SubmitDrawerProvider>
      <div className="min-h-screen bg-bg-base">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-accent focus:text-[var(--bg-base)] focus:rounded-md">
          Skip to main content
        </a>
        <TopNav />
        <main id="main-content" className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20 lg:pb-6 space-y-6">
          {children}
        </main>
        <BottomBar />
        <SubmitDrawer />
        <AiOrNotPanel />
      </div>
    </SubmitDrawerProvider>
    </AiOrNotProvider>
    </UserProvider>
    </WalletProviders>
  );
}
