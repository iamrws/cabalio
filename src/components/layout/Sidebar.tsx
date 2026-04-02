'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { NAV_ICONS } from '@/lib/nav-icons';
import PointsBadge from '../shared/PointsBadge';
import { useAiOrNot } from '../game/AiOrNotPanel';
import { useUser } from '../shared/UserProvider';

export default function Sidebar() {
  const pathname = usePathname();
  const { summary } = useUser();
  const weeklyPoints = summary?.stats?.weekly_points ?? 0;
  const level = summary?.user?.level ?? 1;
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();

  return (
    <aside className="fixed left-0 top-0 h-full w-[var(--sidebar-width)] bg-bg-surface border-r border-border-subtle flex flex-col z-40 hidden lg:flex">
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
                transition-[color,background-color,box-shadow,border-color] duration-150
                ${isActive
                  ? 'bg-accent-muted text-accent-text border-l-[3px] border-accent shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-raised border-l-[3px] border-transparent active:bg-[var(--bg-overlay)] active:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/50'
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

      <div className="px-4 pb-4">
        <button
          onClick={toggleGame}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold
            transition-[color,background-color,border-color,box-shadow] duration-150 group
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 active:scale-[0.98] active:opacity-90
            ${gameOpen
              ? 'bg-accent-muted text-accent-text border border-accent-border'
              : 'bg-bg-raised text-text-secondary hover:text-accent-text hover:bg-accent-muted border border-transparent hover:border-accent-border'
            }
          `}
        >
          <FlaskConical className="w-5 h-5" />
          AI or Not?
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            gameOpen ? 'bg-accent-muted text-accent-text' : 'bg-bg-raised text-text-secondary group-hover:bg-accent-muted group-hover:text-accent-text'
          }`}>
            {gameOpen ? 'On' : 'Play'}
          </span>
        </button>
      </div>

      <div className="p-4 border-t border-border-subtle space-y-3">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-text-muted uppercase tracking-wider font-medium">This Week</span>
          <PointsBadge points={weeklyPoints} size="sm" />
        </div>
        <Link href="/profile/me" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-bg-raised transition-[background-color] active:bg-[var(--bg-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40">
          <div className="h-8 w-8 rounded-full bg-border-default flex items-center justify-center text-xs font-medium text-text-secondary">
              {summary?.user?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">Your Profile</div>
            <div className="text-xs text-text-muted font-mono">Level {level}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
