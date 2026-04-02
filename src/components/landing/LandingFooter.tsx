import Link from 'next/link';

const EXTERNAL_LINKS = [
  { label: 'X / Twitter', href: 'https://x.com/JitoCabalNFT' },
  { label: 'Jito Cabal', href: 'https://jitocabal.com/' },
  { label: 'Governance', href: 'https://jitocabal.factorylabs.space/' },
] as const;

const LEARN_LINKS = [
  { label: 'Pillars', href: '/pillars' },
  { label: 'Engine', href: '/engine' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Simulator', href: '/simulator' },
] as const;

const INTERNAL_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Submit', href: '/submit' },
  { label: 'Quests', href: '/quests' },
] as const;

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm';

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle/50 px-6 py-16 bg-bg-base">
      <div className="mx-auto max-w-7xl">
        {/* Top row: wordmark + link columns */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 mb-12">
          {/* Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center text-xs font-bold text-[#08080a] select-none">
              JC
            </div>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-primary">
              JITO CABAL
            </span>
            <span className="text-[10px] text-text-muted font-mono">v2</span>
          </div>

          {/* Link columns */}
          <div className="flex flex-col sm:flex-row gap-10">
            {/* External links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-4">
                Community
              </p>
              <ul className="flex flex-col gap-1" role="list">
                {EXTERNAL_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={[
                        'flex items-center min-h-[44px] lg:min-h-0 lg:h-auto py-0.5',
                        'text-sm text-text-secondary',
                        'transition-[color] duration-150 hover:text-accent-text active:opacity-70',
                        FOCUS_RING,
                      ].join(' ')}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Learn links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-4">
                Learn
              </p>
              <ul className="flex flex-col gap-1" role="list">
                {LEARN_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={[
                        'flex items-center min-h-[44px] lg:min-h-0 lg:h-auto py-0.5',
                        'text-sm text-text-secondary',
                        'transition-[color] duration-150 hover:text-accent-text active:opacity-70',
                        FOCUS_RING,
                      ].join(' ')}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Internal links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-4">
                Platform
              </p>
              <ul className="flex flex-col gap-1" role="list">
                {INTERNAL_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={[
                        'flex items-center min-h-[44px] lg:min-h-0 lg:h-auto py-0.5',
                        'text-sm text-text-secondary',
                        'transition-[color] duration-150 hover:text-accent-text active:opacity-70',
                        FOCUS_RING,
                      ].join(' ')}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row: tagline + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-border-subtle/50">
          <p className="text-[11px] text-text-muted font-mono tracking-wider">
            Contribution over manipulation.
          </p>
          <p className="text-[11px] text-text-muted font-mono">
            &copy; {year} Jito Cabal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
