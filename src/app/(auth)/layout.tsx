'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import AuthControls from '@/components/shared/AuthControls';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="lg:ml-[260px]">
        <Header />
        <main className="p-6 pb-24 lg:pb-6 space-y-4">
          <div className="lg:hidden">
            <AuthControls compact />
          </div>
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
