'use client';

export default function Footer() {
  return (
    <footer className="border-t border-stone-200/60 py-12 px-6 bg-[#faf7f2]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="h-card flex items-center gap-3">
            <span
              className="p-name text-xl font-bold text-[#1c1917]"
              style={{ fontFamily: '"Avenir Next", "Segoe UI", system-ui, sans-serif' }}
            >
              JITO CABAL
            </span>
            <span className="text-xs text-[#a8a29e] font-mono">v2</span>
          </div>

          <div
            className="flex items-center gap-6 text-sm text-[#57534e]"
            style={{ fontFamily: '"Avenir Next", "Segoe UI", system-ui, sans-serif' }}
          >
            <a
              href="https://x.com/JitoCabalNFT"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1c1917] transition-colors"
            >
              X / Twitter
            </a>
            <a
              href="https://jitocabal.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1c1917] transition-colors"
            >
              Jito Cabal
            </a>
            <a
              href="https://jitocabal.factorylabs.space/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1c1917] transition-colors"
            >
              Governance Forum
            </a>
          </div>

          <div className="text-xs text-[#a8a29e] font-mono">
            Backed by real yield. Built by humans.
          </div>
        </div>
      </div>
    </footer>
  );
}
