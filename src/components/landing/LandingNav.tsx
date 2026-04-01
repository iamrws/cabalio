'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthControls from '@/components/shared/AuthControls';

const NAV_LINKS = [
  { label: 'Pillars', href: '/pillars' },
  { label: 'Engine', href: '/engine' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Simulator', href: '/simulator' },
] as const;

export function LandingNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-bg-base/90 border-b border-border-subtle/50">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 h-14">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            aria-label="Jito Cabal home"
          >
            <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center text-xs font-bold text-[#08080a] select-none">
              JC
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-text hidden sm:block">
              Jito Cabal
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.15em] text-text-muted"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'relative py-1 transition-[color] duration-200 focus-visible:outline-none focus-visible:text-accent-text active:opacity-70 group',
                    isActive ? 'text-accent-text' : 'hover:text-accent-text',
                  ].join(' ')}
                >
                  {label}
                  {/* Underline indicator */}
                  <span
                    className={[
                      'absolute bottom-0 left-0 h-px bg-accent transition-[width] duration-300',
                      isActive ? 'w-full' : 'w-0 group-hover:w-full',
                    ].join(' ')}
                  />
                  {/* focus-visible ring */}
                  <span className="absolute inset-0 rounded-sm ring-0 group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent)] group-focus-visible:ring-offset-1 group-focus-visible:ring-offset-bg-base pointer-events-none" />
                </Link>
              );
            })}
          </nav>

          {/* Desktop auth — hidden on mobile */}
          <div className="hidden sm:block">
            <AuthControls compact />
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 gap-[5px] rounded-md transition-[background-color] duration-150 hover:bg-bg-raised active:bg-bg-overlay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {/* Hamburger bars — animate to X when open */}
            <span
              className={[
                'block h-px w-5 bg-text-secondary transition-[transform,opacity] duration-200',
                menuOpen ? 'translate-y-[6px] rotate-45' : '',
              ].join(' ')}
            />
            <span
              className={[
                'block h-px w-5 bg-text-secondary transition-[opacity] duration-150',
                menuOpen ? 'opacity-0' : '',
              ].join(' ')}
            />
            <span
              className={[
                'block h-px w-5 bg-text-secondary transition-[transform,opacity] duration-200',
                menuOpen ? '-translate-y-[6px] -rotate-45' : '',
              ].join(' ')}
            />
          </button>
        </div>
      </header>

      {/* Mobile slide-down drawer */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          'fixed top-14 left-0 right-0 z-40 md:hidden',
          'bg-bg-surface/95 backdrop-blur-xl border-b border-border-subtle',
          'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
          menuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
        ].join(' ')}
      >
        <nav
          className="flex flex-col px-6 py-4 gap-1"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center h-11 px-3 rounded-md text-sm uppercase tracking-[0.15em]',
                  'transition-[color,background-color] duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                  'active:opacity-70',
                  isActive
                    ? 'text-accent-text bg-bg-raised border-l-2 border-accent'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-raised',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}

          {/* Auth section in mobile drawer */}
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <AuthControls />
          </div>
        </nav>
      </div>

      {/* Backdrop overlay to close menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
