'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Plus, FlaskConical } from 'lucide-react';
import { useAiOrNot } from '../game/AiOrNotPanel';
import { useSubmitDrawer } from '../shared/SubmitDrawerProvider';

const NAV = [
  { href: '/dashboard', icon: Home, label: 'Arena' },
  { href: '/leaderboard', icon: Trophy, label: 'Board' },
] as const;

export default function BottomBar() {
  const pathname = usePathname();
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();
  const { open: openSubmit } = useSubmitDrawer();

  return (
    <>
      <button
        onClick={toggleGame}
        aria-label={gameOpen ? 'Close AI or Not game' : 'Open AI or Not game'}
        className={`fixed bottom-[76px] right-4 z-[51] lg:hidden w-11 h-11 rounded-full flex items-center justify-center transition-[transform,box-shadow,background-color] duration-200 shadow-lg hover:shadow-[0_0_20px_rgba(212,168,83,0.2)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:ring-[var(--accent)] ${
          gameOpen ? 'bg-accent text-[var(--bg-base)]' : 'bg-bg-surface border border-accent-border text-accent-text'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
      </button>

      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-xl border-t border-border-subtle lg:hidden">
        <div className="flex items-center justify-around h-16 px-4 pb-safe">
          {(() => {
            const item = NAV[0];
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-6 py-1 rounded-lg transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-border)] active:scale-90 ${
                  isActive ? 'text-accent-text' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })()}

          <button
            type="button"
            onClick={openSubmit}
            className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-[var(--accent)] text-[var(--bg-base)] shadow-[var(--shadow-gold)] hover:bg-accent-dim active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:ring-[var(--accent)] transition-[background-color,transform] duration-150"
            aria-label="Submit content"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>

          {(() => {
            const item = NAV[1];
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-6 py-1 rounded-lg transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-border)] active:scale-90 ${
                  isActive ? 'text-accent-text' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })()}
        </div>
      </nav>
    </>
  );
}
