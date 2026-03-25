'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAiOrNot } from '../game/AiOrNotPanel';

const items = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/submit', label: 'Submit', icon: '✍️' },
  { href: '/leaderboard', label: 'Ranks', icon: '🏆' },
  { href: '/quests', label: 'Quests', icon: '🎯' },
  { href: '/rewards', label: 'Rewards', icon: '🎁' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();

  return (
    <>
      {/* Floating game toggle button */}
      <button
        onClick={toggleGame}
        className={`fixed bottom-20 right-4 z-[51] lg:hidden w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          gameOpen
            ? 'bg-neon-purple text-white scale-110'
            : 'bg-bg-secondary border border-neon-purple/30 text-neon-purple'
        }`}
        style={{
          boxShadow: gameOpen
            ? '0 0 30px rgba(179,71,217,0.5)'
            : '0 0 15px rgba(179,71,217,0.2)',
        }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </button>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary/95 backdrop-blur-xl border-t border-border-subtle lg:hidden">
        <div className="flex items-center justify-around h-16">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-neon-cyan' : 'text-text-muted'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
