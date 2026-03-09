'use client';

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold gradient-text">JITO CABAL</span>
            <span className="text-xs text-text-muted font-mono">v1.0</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-text-secondary">
            <a
              href="https://x.com/JitoCabalNFT"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neon-cyan transition-colors"
            >
              X / Twitter
            </a>
            <a
              href="https://jitocabal.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neon-cyan transition-colors"
            >
              Jito Cabal
            </a>
            <a
              href="https://jitocabal.factorylabs.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neon-cyan transition-colors"
            >
              Governance Forum
            </a>
          </div>

          <div className="text-xs text-text-muted font-mono">
            Backed by real yield. Built by believers.
          </div>
        </div>
      </div>
    </footer>
  );
}
