'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { NAV_ICONS } from '@/lib/nav-icons';
import { useAiOrNot } from '../game/AiOrNotPanel';

export default function MobileNav() {
  const pathname = usePathname();
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();

  return (
    <>
      <button
        onClick={toggleGame}
        aria-label={gameOpen ? 'Close AI or Not game' : 'Open AI or Not game'}
        className={`fixed bottom-[72px] right-4 z-[51] lg:hidden w-12 h-12 rounded-full flex items-center justify-center transition-[transform,box-shadow,background-color] duration-200 shadow-lg hover:shadow-[0_0_20px_rgba(212,168,83,0.2)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:ring-[var(--accent)] ${
          gameOpen ? 'bg-accent text-[var(--bg-base)]' : 'bg-bg-surface border border-accent-border text-accent-text'
        }`}
      >
        <FlaskConical className="w-5 h-5" />
      </button>

      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-xl border-t border-border-subtle lg:hidden">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-border)] active:scale-90 ${
                  isActive ? 'text-accent-text' : 'text-text-muted hover:text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]/50'
                }`}
              >
                <span>{NAV_ICONS[item.icon]}</span>
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
