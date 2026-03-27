'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAiOrNot } from '../game/AiOrNotPanel';

const items = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/submit', label: 'Submit', icon: 'plus' },
  { href: '/leaderboard', label: 'Ranks', icon: 'trophy' },
  { href: '/quests', label: 'Quests', icon: 'target' },
  { href: '/rewards', label: 'Rewards', icon: 'gift' },
];

const mobileIcons: Record<string, React.ReactNode> = {
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  gift: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21" />
    </svg>
  ),
};

export default function MobileNav() {
  const pathname = usePathname();
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();

  return (
    <>
      <button
        onClick={toggleGame}
        aria-label={gameOpen ? 'Close AI or Not game' : 'Open AI or Not game'}
        className={`fixed bottom-20 right-4 z-[51] lg:hidden w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          gameOpen ? 'bg-accent text-white' : 'bg-bg-surface border border-accent-border text-accent-text'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-xl border-t border-border-subtle lg:hidden">
        <div className="flex items-center justify-around h-16">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-accent-text' : 'text-text-muted'
                }`}
              >
                <span>{mobileIcons[item.icon]}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-accent-text' : ''}`}>{item.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
