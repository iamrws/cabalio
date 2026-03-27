'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import PointsBadge from '../shared/PointsBadge';
import { useAiOrNot } from '../game/AiOrNotPanel';

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  trophy: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.016 6.016 0 01-5.54 0" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  gift: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
};

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
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#f5f0e8] border-r border-stone-200/60 flex flex-col z-40 hidden lg:flex">
      <div className="p-6 border-b border-stone-200/60">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#b45309] flex items-center justify-center text-white font-bold text-sm" style={{ fontFamily: '"Charter", Georgia, serif' }}>
            JC
          </div>
          <span className="text-lg font-bold text-[#1c1917] tracking-tight" style={{ fontFamily: '"Charter", Georgia, serif' }}>JITO CABAL</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1" style={{ fontFamily: '"Avenir Next", "Segoe UI", system-ui, sans-serif' }}>
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
                  ? 'bg-white/80 text-[#92400e] border-l-[3px] border-[#b45309] shadow-[0_2px_8px_rgba(28,25,23,0.06)]'
                  : 'text-stone-600 hover:text-[#1c1917] hover:bg-white/50 border-l-[3px] border-transparent'
                }
              `}
            >
              <span className={isActive ? 'text-[#b45309]' : ''}>{icons[item.icon]}</span>
              {item.label}
              {item.icon === 'plus' && (
                <span className="ml-auto text-xs bg-[#0f766e]/10 text-[#0f766e] px-2 py-0.5 rounded-full border border-[#0f766e]/20">
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
              ? 'bg-violet-50 text-[#7c3aed] border border-violet-200'
              : 'bg-white/50 text-stone-500 hover:text-[#7c3aed] hover:bg-violet-50 border border-transparent hover:border-violet-200/60'
            }
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          AI or Not?
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            gameOpen ? 'bg-violet-100 text-[#7c3aed]' : 'bg-stone-100 text-stone-500 group-hover:bg-violet-100 group-hover:text-[#7c3aed]'
          }`}>
            {gameOpen ? 'On' : 'Play'}
          </span>
        </button>
      </div>

      <div className="p-4 border-t border-stone-200/60 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-stone-400 uppercase tracking-wider font-medium">This Week</span>
          <PointsBadge points={weeklyPoints} size="sm" />
        </div>
        <Link href="/profile/me" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-colors">
          <div className="h-8 w-8 rounded-full bg-stone-200 border border-stone-300/60" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-800 truncate">Your Profile</div>
            <div className="text-xs text-stone-400 font-mono">Level {level}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
