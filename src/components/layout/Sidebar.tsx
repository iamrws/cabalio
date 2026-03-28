'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { NAV_ICONS } from '@/lib/nav-icons';
import PointsBadge from '../shared/PointsBadge';
import { useAiOrNot } from '../game/AiOrNotPanel';

export default function Sidebar() {
  const pathname = usePathname();
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();

  useEffect(() => {
    let cancelled = false;
    const loadSummary = async () => {
      try {
        const response = await fetch('/api/me/summary', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || cancelled) return;
        setWeeklyPoints(data.stats?.weekly_points || 0);
        setLevel(data.user?.level || 1);
      } catch { /* keep defaults */ }
    };
    void loadSummary();
    return () => { cancelled = true; };
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-bg-surface border-r border-border-subtle flex flex-col z-40 hidden lg:flex">
      <div className="p-6 border-b border-border-subtle">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent-text flex items-center justify-center text-bg-base font-bold text-sm">
            JC
          </div>
          <span className="text-lg font-display font-bold text-text-primary tracking-tight">JITO CABAL</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-accent-muted text-accent-text border-l-[3px] border-accent shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-raised border-l-[3px] border-transparent'
                }
              `}
            >
              <span className={isActive ? 'text-accent-text' : ''}>{NAV_ICONS[item.icon]}</span>
              {item.label}
              {item.icon === 'plus' && (
                <span className="ml-auto text-xs bg-positive-muted text-positive px-2 py-0.5 rounded-full border border-positive/20">
                  New
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-2">
        <button
          onClick={toggleGame}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold
            transition-all duration-200 group
            ${gameOpen
              ? 'bg-accent-muted text-accent-text border border-accent-border'
              : 'bg-bg-raised text-text-secondary hover:text-accent-text hover:bg-accent-muted border border-transparent hover:border-accent-border'
            }
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          AI or Not?
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            gameOpen ? 'bg-accent-muted text-accent-text' : 'bg-bg-raised text-text-secondary group-hover:bg-accent-muted group-hover:text-accent-text'
          }`}>
            {gameOpen ? 'On' : 'Play'}
          </span>
        </button>
      </div>

      <div className="p-4 border-t border-border-subtle space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-text-muted uppercase tracking-wider font-medium">This Week</span>
          <PointsBadge points={weeklyPoints} size="sm" />
        </div>
        <Link href="/profile/me" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-raised transition-colors">
          <div className="h-8 w-8 rounded-full bg-border-default border border-border-subtle" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">Your Profile</div>
            <div className="text-xs text-text-muted font-mono">Level {level}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
