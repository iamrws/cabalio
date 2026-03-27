'use client';

export default function Footer() {
  return (
    <footer className="border-t border-border-light py-12 px-6 bg-bg-light">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="h-card flex items-center gap-3">
            <span className="p-name text-xl font-bold text-text-light-primary">
              JITO CABAL
            </span>
            <span className="text-xs text-text-light-tertiary font-mono">v2</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-text-light-secondary">
            <a
              href="https://x.com/JitoCabalNFT"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-light-primary transition-colors"
            >
              X / Twitter
            </a>
            <a
              href="https://jitocabal.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-light-primary transition-colors"
            >
              Jito Cabal
            </a>
            <a
              href="https://jitocabal.factorylabs.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-light-primary transition-colors"
            >
              Governance Forum
            </a>
          </div>

          <div className="text-xs text-text-light-tertiary font-mono">
            Backed by real yield. Built by humans.
          </div>
        </div>
      </div>
    </footer>
  );
}
