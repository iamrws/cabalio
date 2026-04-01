'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { FlaskConical, X, VolumeX, Volume2, Check, Flame, Clapperboard, User, ChevronsRight } from 'lucide-react';

// ── Context for panel open/close ──────────────────────────────────────
interface AiOrNotContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const AiOrNotContext = createContext<AiOrNotContextType>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
});

export function useAiOrNot() {
  return useContext(AiOrNotContext);
}

export function AiOrNotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <AiOrNotContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(p => !p),
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </AiOrNotContext.Provider>
  );
}

// ── Types ─────────────────────────────────────────────────────────────
interface YouTubeShort {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  viewCount: number;
}

// ── YouTube IFrame types ──────────────────────────────────────────────
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: Record<string, (event: { target: YTPlayerInstance; data?: number }) => void>;
        }
      ) => YTPlayerInstance;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  seekTo: (s: number) => void;
  destroy: () => void;
  getPlayerState: () => number;
}

// ── Load YouTube IFrame API ───────────────────────────────────────────
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }

    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existing) {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max
      const check = setInterval(() => {
        attempts++;
        if (window.YT?.Player) { clearInterval(check); resolve(); }
        else if (attempts >= maxAttempts) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    // The YouTube IFrame API script is loaded from a Google CDN that does not
    // publish stable SRI hashes (content changes with deploys). Instead we
    // apply a strict Content-Security-Policy via next.config and constrain the
    // script origin. A nonce-based approach would require SSR support; for a
    // client-loaded third-party SDK this is the accepted secure pattern.
    // Additionally restrict cross-origin leakage:
    tag.crossOrigin = 'anonymous';
    tag.referrerPolicy = 'no-referrer';
    window.onYouTubeIframeAPIReady = () => resolve();
    document.body.appendChild(tag);
  });

  return ytApiPromise;
}

// ── Server vote API ───────────────────────────────────────────────────
async function submitVoteToServer(
  videoId: string,
  vote: 'ai' | 'human'
): Promise<{
  success: boolean;
  aiPct: number;
  totalVotes: number;
  matched: boolean;
  pointsEarned: number;
  points: number;
  streak: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, vote }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        aiPct: 50,
        totalVotes: 0,
        matched: false,
        pointsEarned: 0,
        points: 0,
        streak: 0,
        error: data.error || 'Vote failed',
      };
    }
    return {
      success: true,
      aiPct: data.aiPct,
      totalVotes: data.totalVotes,
      matched: data.matched,
      pointsEarned: data.pointsEarned,
      points: data.points,
      streak: data.streak,
    };
  } catch {
    return {
      success: false,
      aiPct: 50,
      totalVotes: 0,
      matched: false,
      pointsEarned: 0,
      points: 0,
      streak: 0,
      error: 'Network error',
    };
  }
}

// ── Main Panel Component ──────────────────────────────────────────────
export default function AiOrNotPanel() {
  const { isOpen, close } = useAiOrNot();

  const [shorts, setShorts] = useState<YouTubeShort[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Game state
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showResult, setShowResult] = useState<{
    vote: 'ai' | 'human';
    aiPct: number;
    totalVotes: number;
    matched: boolean;
    pointsEarned: number;
  } | null>(null);

  // Auto-advance timer ref (to clear on unmount / panel close)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // YouTube player
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playerError, setPlayerError] = useState(false);

  const current = shorts[currentIndex] ?? null;

  // Server state is returned with each vote response; no local restore needed.
  // Points and streak start at 0 and update as the player votes.

  // Fetch shorts
  const fetchShorts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/shorts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.shorts?.length) {
        setShorts(prev => {
          const existing = new Set(prev.map(s => s.videoId));
          const newOnes = data.shorts.filter((s: YouTubeShort) => !existing.has(s.videoId));
          return [...prev, ...newOnes];
        });
      } else {
        setError('No shorts available');
      }
    } catch {
      setError('Could not load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load shorts when panel opens
  useEffect(() => {
    if (isOpen && shorts.length === 0) {
      fetchShorts();
    }
  }, [isOpen, shorts.length, fetchShorts]);

  // Initialize/update YouTube player
  useEffect(() => {
    if (!isOpen || !current) return;

    let mounted = true;
    setPlayerReady(false);
    setPlayerError(false);

    const init = async () => {
      await loadYouTubeAPI();
      if (!mounted) return;

      // Destroy old player
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      // Clear container
      const container = playerContainerRef.current;
      if (!container) return;
      container.innerHTML = '';

      const div = document.createElement('div');
      div.id = `yt-aion-${current.videoId}-${Date.now()}`;
      container.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        videoId: current.videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: current.videoId,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e) => {
            if (!mounted) return;
            setPlayerReady(true);
            e.target.mute();
            setIsMuted(true);
          },
          onStateChange: (e) => {
            if (!mounted) return;
            if (e.data === window.YT.PlayerState.ENDED) {
              e.target.seekTo(0);
              e.target.playVideo();
            }
          },
          onError: () => {
            if (mounted) setPlayerError(true);
          },
        },
      });
    };

    init();
    return () => {
      mounted = false;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [isOpen, current?.videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup player and timers when panel closes
  useEffect(() => {
    if (!isOpen) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      setPlayerReady(false);
    }
  }, [isOpen]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  // Submit vote via server API
  const [votePending, setVotePending] = useState(false);

  const submitVote = useCallback((vote: 'ai' | 'human') => {
    if (!current || showResult || votePending) return;

    setVotePending(true);

    // Pause the video while waiting for response
    if (playerRef.current) {
      try { playerRef.current.pauseVideo(); } catch {}
    }

    submitVoteToServer(current.videoId, vote).then((result) => {
      setVotePending(false);

      if (!result.success) {
        // On error (e.g. duplicate vote), just skip to next
        setCurrentIndex(i => {
          const next = i + 1;
          if (next >= shorts.length - 3) fetchShorts();
          return next;
        });
        return;
      }

      // Update local display state from server-authoritative values
      setPoints(result.points);
      setStreak(result.streak);

      setShowResult({
        vote,
        aiPct: result.aiPct,
        totalVotes: result.totalVotes,
        matched: result.matched,
        pointsEarned: result.pointsEarned,
      });

      // Auto-advance after 2s
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setShowResult(null);
        setCurrentIndex(i => {
          const next = i + 1;
          if (next >= shorts.length - 3) fetchShorts();
          return next;
        });
      }, 2000);
    });
  }, [current, showResult, votePending, shorts.length, fetchShorts]);

  // Skip
  const skipVideo = useCallback(() => {
    if (showResult) return;
    setCurrentIndex(i => {
      const next = i + 1;
      if (next >= shorts.length - 3) fetchShorts();
      return next;
    });
  }, [showResult, shorts.length, fetchShorts]);

  // Panel mount/visible state for CSS exit transitions
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPanelMounted(true);
      // Trigger enter animation on next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelVisible(true)));
    } else {
      setPanelVisible(false);
      const timer = setTimeout(() => setPanelMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Result overlay mount/visible state for CSS exit transitions
  const [resultMounted, setResultMounted] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    if (showResult) {
      setResultMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setResultVisible(true)));
    } else {
      setResultVisible(false);
      const timer = setTimeout(() => setResultMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showResult]);

  // Keyboard shortcuts when panel is open
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (showResult) return;
      if (e.key === 'ArrowLeft') submitVote('human');
      if (e.key === 'ArrowRight') submitVote('ai');
      if (e.key === 'ArrowDown') skipVideo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, close, showResult, submitVote, skipVideo]);

  return (
    <>
      {panelMounted && (
        <>
          {/* Backdrop (mobile) */}
          <div
            onClick={close}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300 ${
              panelVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Panel */}
          <div
            className={`fixed right-0 top-0 bottom-0 z-[56] w-full sm:w-[420px] bg-bg-base border-l border-border-default flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
              panelVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent-muted border border-accent-border flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-accent-text" />
                </div>
                <h2 className="text-lg font-bold text-accent-text font-display">AI or NOT?</h2>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3">
                {streak >= 2 && (
                  <span className="text-sm font-bold text-caution flex items-center gap-1">
                    <Flame className="w-4 h-4" aria-hidden="true" />{streak}
                  </span>
                )}
                <span className="text-sm font-mono font-bold text-accent-text">{points} pts</span>
                <button onClick={close} className="w-8 h-8 rounded-lg bg-bg-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Game Area ─── */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Loading state */}
              {loading && shorts.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-text-secondary text-sm">Loading shorts...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && shorts.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <p className="text-text-secondary mb-3">{error}</p>
                    <button
                      onClick={fetchShorts}
                      className="px-4 py-2 rounded-lg bg-accent-muted text-accent-text border border-accent-border hover:bg-accent-muted/80 transition-colors text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* No more shorts */}
              {!loading && !error && shorts.length > 0 && currentIndex >= shorts.length && (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <p className="mb-2 flex justify-center"><Clapperboard className="w-6 h-6" /></p>
                    <p className="text-text-primary font-bold mb-1">All caught up!</p>
                    <p className="text-text-secondary text-sm mb-4">You scored {points} points with a best streak of {streak}</p>
                    <button
                      onClick={() => { setCurrentIndex(0); fetchShorts(); }}
                      className="px-4 py-2 rounded-lg bg-accent text-white font-medium text-sm"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}

              {/* Video card */}
              {current && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Video container */}
                  <div className="relative flex-1 min-h-0 bg-black">
                    {/* YouTube player */}
                    <div
                      ref={playerContainerRef}
                      className="absolute inset-0 [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
                      style={{ transform: 'scale(1.8)', transformOrigin: 'center center' }}
                    />

                    {/* Loading overlay */}
                    {!playerReady && !playerError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-base z-10">
                        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Error overlay */}
                    {playerError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-base z-10">
                        <div className="text-center text-text-secondary text-sm">
                          <p className="mb-2">Video unavailable</p>
                          <button onClick={skipVideo} className="text-accent-text hover:underline">Skip to next</button>
                        </div>
                      </div>
                    )}

                    {/* Top gradient + controls */}
                    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent z-20 pointer-events-none" />
                    <div className="absolute top-3 right-3 z-30">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                        className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Bottom gradient + info */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none" />
                    <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none">
                      <p className="text-white/90 text-xs font-semibold truncate">@{current.channelTitle}</p>
                      <p className="text-white/60 text-xs truncate mt-0.5">{current.title}</p>
                    </div>

                    {/* Counter badge */}
                    <div className="absolute top-3 left-3 z-30">
                      <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-[10px] text-white/60 font-mono">
                        {currentIndex + 1}/{shorts.length}
                      </span>
                    </div>

                    {/* ─── Vote Result Overlay ─── */}
                    {resultMounted && showResult && (
                      <div
                        className={`absolute inset-0 z-40 flex flex-col items-center justify-center transition-opacity duration-300 ${
                          resultVisible ? 'opacity-100' : 'opacity-0'
                        } ${
                          showResult.matched
                            ? 'bg-[rgba(34,197,94,0.1)] backdrop-brightness-110'
                            : 'bg-[rgba(239,68,68,0.1)] backdrop-brightness-75'
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform duration-500 ease-out ${
                            resultVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'
                          } ${
                            showResult.matched
                              ? 'bg-positive-muted border-2 border-positive'
                              : 'bg-negative-muted border-2 border-negative'
                          }`}
                        >
                          {showResult.matched ? (
                            <Check className="w-10 h-10 text-positive" />
                          ) : (
                            <X className="w-10 h-10 text-negative" />
                          )}
                        </div>

                        {/* Text */}
                        <p
                          className={`text-xl font-black text-white mb-1 transition-all duration-300 delay-100 ${
                            resultVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'
                          }`}
                        >
                          {showResult.matched ? 'Matches Consensus!' : 'Against Consensus'}
                        </p>

                        {/* Community breakdown */}
                        <div
                          className={`flex items-center gap-3 text-sm mb-3 transition-opacity duration-300 delay-200 ${
                            resultVisible ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <span className="text-positive font-bold">{100 - showResult.aiPct}% Human</span>
                          <span className="text-white/40">|</span>
                          <span className="text-accent-text font-bold">{showResult.aiPct}% AI</span>
                        </div>

                        {/* Vote bar */}
                        <div
                          className={`w-48 h-2 rounded-full bg-bg-raised overflow-hidden origin-left transition-transform duration-500 delay-[250ms] ${
                            resultVisible ? 'scale-x-100' : 'scale-x-0'
                          }`}
                        >
                          <div
                            className="h-full bg-[var(--accent)] rounded-full"
                            style={{ width: `${showResult.aiPct}%`, marginLeft: `${100 - showResult.aiPct}%` }}
                          />
                        </div>

                        {/* Points */}
                        <p
                          className={`text-3xl font-black text-accent-text mt-4 transition-all duration-300 delay-300 ${
                            resultVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                          }`}
                        >
                          +{showResult.pointsEarned}
                        </p>

                        <p
                          className={`text-xs text-white/50 mt-1 transition-opacity duration-300 delay-[400ms] ${
                            resultVisible ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          {showResult.totalVotes.toLocaleString()} community votes
                        </p>

                        {/* Streak celebration */}
                        {showResult.matched && streak >= 3 && (
                          <div
                            className={`mt-3 px-4 py-1.5 rounded-full border border-caution-border bg-caution-muted transition-all duration-300 delay-500 ${
                              resultVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                            }`}
                          >
                            <span className="text-caution font-bold text-sm flex items-center gap-1">
                              <Flame className="w-5 h-5" aria-hidden="true" /> {streak} Streak!
                              {streak >= 10 && ' LEGENDARY!'}
                              {streak >= 5 && streak < 10 && ' On Fire!'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ─── Vote Buttons ─── */}
                  <div className="px-4 py-4 bg-bg-surface border-t border-border-subtle">
                    <div className="flex items-center gap-3">
                      {/* HUMAN button */}
                      <button
                        onClick={() => submitVote('human')}
                        disabled={!!showResult}
                        className="flex-1 group relative py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 disabled:opacity-40
                          bg-positive-muted text-positive border border-positive-border
                          hover:bg-positive-muted/80 hover:border-positive/50 active:scale-[0.97]"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <User className="w-5 h-5" />
                          Human
                        </span>
                      </button>

                      {/* Skip button */}
                      <button
                        onClick={skipVideo}
                        disabled={!!showResult}
                        className="w-12 h-12 rounded-xl bg-bg-raised border border-border-subtle text-text-muted
                          hover:text-text-primary hover:bg-bg-elevated transition-all disabled:opacity-40 flex items-center justify-center"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>

                      {/* AI button */}
                      <button
                        onClick={() => submitVote('ai')}
                        disabled={!!showResult}
                        className="flex-1 group relative py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 disabled:opacity-40
                          bg-accent-muted text-accent-text border border-accent-border
                          hover:bg-accent-muted/80 hover:border-accent/50 active:scale-[0.97]"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <FlaskConical className="w-5 h-5" />
                          AI
                        </span>
                      </button>
                    </div>

                    {/* Keyboard hints */}
                    <div className="hidden lg:flex items-center justify-center gap-4 mt-3 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-raised rounded font-mono border border-border-subtle">←</kbd> Human
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-raised rounded font-mono border border-border-subtle">↓</kbd> Skip
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-raised rounded font-mono border border-border-subtle">→</kbd> AI
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-raised rounded font-mono border border-border-subtle">Esc</kbd> Close
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
