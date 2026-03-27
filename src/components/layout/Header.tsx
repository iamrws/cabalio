'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AuthControls from '../shared/AuthControls';
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
  const [streak, setStreak] = useState(0);
  const [weeklyPoints, setWeeklyPoints] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const response = await fetch('/api/me/summary', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || cancelled) return;
        setStreak(data.user?.current_streak || 0);
        setWeeklyPoints(data.stats?.weekly_points || 0);
      } catch {
        // No-op: header can gracefully show defaults.
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#faf7f2]/85 backdrop-blur-xl border-b border-stone-200/60">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
            <span className="text-lg font-bold text-[#b45309]" style={{ fontFamily: '"Charter", Georgia, serif' }}>JC</span>
          </div>
          <h1 className="text-lg font-semibold text-[#1c1917] tracking-tight" style={{ fontFamily: '"Charter", Georgia, serif' }}>{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/60">
            <span className="text-base leading-none">{'\uD83D\uDD25'}</span>
            <span className="font-mono text-sm text-[#b45309] font-bold">{streak}</span>
            <span className="text-xs text-stone-500">day streak</span>
          </div>

          <div className="hidden sm:block">
            <PointsBadge points={weeklyPoints} size="sm" />
          </div>

          <AuthControls compact />
        </div>
      </div>
    </header>
  );
}
