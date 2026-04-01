'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import AuthControls from '@/components/shared/AuthControls';
import { UserProvider } from '@/components/shared/UserProvider';
import dynamic from 'next/dynamic';
import { AiOrNotProvider } from '@/components/game/AiOrNotPanel';

const AiOrNotPanel = dynamic(
  () => import('@/components/game/AiOrNotPanel').then(m => ({ default: m.default })),
  { ssr: false, loading: () => null }
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
    <AiOrNotProvider>
      <div className="min-h-screen bg-bg-base">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-accent focus:text-white focus:rounded-md">
          Skip to main content
        </a>
        <Sidebar />
        <div className="lg:ml-[var(--sidebar-width)]">
          <Header />
          <main id="main-content" className="px-4 sm:px-6 py-6 pb-20 lg:pb-6 space-y-6">
            <div className="lg:hidden">
              <AuthControls compact />
            </div>
            {children}
          </main>
        </div>
        <MobileNav />
        <AiOrNotPanel />
      </div>
    </AiOrNotProvider>
    </UserProvider>
  );
}
