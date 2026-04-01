'use client';

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle py-12 px-6 bg-bg-base">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="h-card flex items-center gap-3">
            <span className="p-name text-xl font-bold text-text-primary">
              JITO CABAL
            </span>
            <span className="text-xs text-text-tertiary font-mono">v2</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <a
              href="https://x.com/JitoCabalNFT"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-[color] duration-150 hover:text-accent-text active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm"
            >
              X / Twitter
            </a>
            <a
              href="https://jitocabal.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-[color] duration-150 hover:text-accent-text active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm"
            >
              Jito Cabal
            </a>
            <a
              href="https://jitocabal.factorylabs.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-[color] duration-150 hover:text-accent-text active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm"
            >
              Governance Forum
            </a>
          </div>

          <div className="text-xs text-text-tertiary font-mono">
            Backed by real yield. Built by humans.
          </div>
        </div>
      </div>
    </footer>
  );
}
