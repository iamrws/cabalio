'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import AuthControls from '@/components/shared/AuthControls';
import AiOrNotPanel, { AiOrNotProvider } from '@/components/game/AiOrNotPanel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AiOrNotProvider>
      <div className="min-h-screen bg-[#faf7f2]">
        <Sidebar />
        <div className="lg:ml-[260px]">
          <Header />
          <main className="px-4 sm:px-6 py-6 pb-24 lg:pb-6 space-y-4">
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
  );
}
