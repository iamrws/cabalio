'use client';

import { usePathname } from 'next/navigation';
import WalletButton from '../shared/WalletButton';
import PointsBadge from '../shared/PointsBadge';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/submit': 'Submit Content',
  '/leaderboard': 'Leaderboard',
  '/quests': 'Quests',
  '/rewards': 'Rewards',
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Jito Cabal';

  return (
    <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-4">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <span className="text-lg font-bold gradient-text">JC</span>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Streak indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-subtle">
            <span className="text-base">🔥</span>
            <span className="font-mono text-sm text-neon-orange font-bold">0</span>
            <span className="text-xs text-text-muted">day streak</span>
          </div>

          {/* Points */}
          <div className="hidden sm:block">
            <PointsBadge points={0} size="sm" />
          </div>

          {/* Wallet */}
          <WalletButton className="text-sm" />
        </div>
      </div>
    </header>
  );
}
