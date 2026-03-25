'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface VoteRecord {
  videoId: string;
  vote: 'ai' | 'human';
  timestamp: number;
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
      const check = setInterval(() => {
        if (window.YT?.Player) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    window.onYouTubeIframeAPIReady = () => resolve();
    document.body.appendChild(tag);
  });

  return ytApiPromise;
}

// ── Deterministic "community" consensus from videoId ──────────────────
function pseudoConsensus(videoId: string): { aiPct: number; totalVotes: number } {
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = ((hash << 5) - hash + videoId.charCodeAt(i)) | 0;
  }
  const aiPct = 20 + Math.abs(hash % 61); // 20-80%
  const totalVotes = 50 + Math.abs((hash >> 8) % 950); // 50-999
  return { aiPct, totalVotes };
}

// ── Get/set votes from localStorage ───────────────────────────────────
function getLocalVotes(): VoteRecord[] {
  try {
    return JSON.parse(localStorage.getItem('cabal-aion-votes') || '[]');
  } catch { return []; }
}

function saveLocalVote(record: VoteRecord) {
  const votes = getLocalVotes();
  votes.push(record);
  localStorage.setItem('cabal-aion-votes', JSON.stringify(votes.slice(-500)));
}

function getSessionStats(): { points: number; streak: number } {
  try {
    const data = JSON.parse(sessionStorage.getItem('cabal-aion-session') || '{}');
    return { points: data.points || 0, streak: data.streak || 0 };
  } catch { return { points: 0, streak: 0 }; }
}

function saveSessionStats(points: number, streak: number) {
  sessionStorage.setItem('cabal-aion-session', JSON.stringify({ points, streak }));
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

  // YouTube player
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playerError, setPlayerError] = useState(false);

  const current = shorts[currentIndex] ?? null;

  // Restore session stats
  useEffect(() => {
    const s = getSessionStats();
    setPoints(s.points);
    setStreak(s.streak);
  }, []);

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

  // Cleanup player when panel closes
  useEffect(() => {
    if (!isOpen && playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
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

  // Submit vote
  const submitVote = useCallback((vote: 'ai' | 'human') => {
    if (!current || showResult) return;

    const { aiPct, totalVotes } = pseudoConsensus(current.videoId);
    const communityThinks = aiPct > 50 ? 'ai' : 'human';
    const matched = vote === communityThinks;

    // Points: base 10, streak bonus, random multiplier
    const base = matched ? 10 : 2;
    const streakBonus = matched ? Math.min(streak * 0.5, 5) : 0;
    const multiplier = Math.random() < 0.05 ? 5 : Math.random() < 0.15 ? 2 : 1;
    const earned = Math.round((base + streakBonus) * multiplier);

    const newStreak = matched ? streak + 1 : 0;
    const newPoints = points + earned;

    setPoints(newPoints);
    setStreak(newStreak);
    saveSessionStats(newPoints, newStreak);
    saveLocalVote({ videoId: current.videoId, vote, timestamp: Date.now() });

    // Pause the video during result
    if (playerRef.current) {
      try { playerRef.current.pauseVideo(); } catch {}
    }

    setShowResult({ vote, aiPct, totalVotes, matched, pointsEarned: earned });

    // Auto-advance after 2s
    setTimeout(() => {
      setShowResult(null);
      setCurrentIndex(i => {
        const next = i + 1;
        // Fetch more if running low
        if (next >= shorts.length - 3) fetchShorts();
        return next;
      });
    }, 2000);
  }, [current, showResult, streak, points, shorts.length, fetchShorts]);

  // Skip
  const skipVideo = useCallback(() => {
    if (showResult) return;
    setCurrentIndex(i => {
      const next = i + 1;
      if (next >= shorts.length - 3) fetchShorts();
      return next;
    });
  }, [showResult, shorts.length, fetchShorts]);

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[56] w-full sm:w-[420px] bg-bg-primary border-l border-border-neon flex flex-col overflow-hidden"
          >
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-neon-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold gradient-text">AI or NOT?</h2>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3">
                {streak >= 2 && (
                  <span className="text-sm font-bold text-neon-orange flex items-center gap-1">
                    <span className="text-base">🔥</span>{streak}
                  </span>
                )}
                <span className="text-sm font-mono font-bold text-neon-cyan">{points} pts</span>
                <button onClick={close} className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ─── Game Area ─── */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Loading state */}
              {loading && shorts.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-3" />
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
                      className="px-4 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 transition-colors text-sm"
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
                    <p className="text-2xl mb-2">🎬</p>
                    <p className="text-text-primary font-bold mb-1">All caught up!</p>
                    <p className="text-text-secondary text-sm mb-4">You scored {points} points with a best streak of {streak}</p>
                    <button
                      onClick={() => { setCurrentIndex(0); fetchShorts(); }}
                      className="px-4 py-2 rounded-lg gradient-bg text-white font-medium text-sm"
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
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-primary z-10">
                        <div className="w-8 h-8 border-2 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Error overlay */}
                    {playerError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-primary z-10">
                        <div className="text-center text-text-secondary text-sm">
                          <p className="mb-2">Video unavailable</p>
                          <button onClick={skipVideo} className="text-neon-cyan hover:underline">Skip to next</button>
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
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
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
                    <AnimatePresence>
                      {showResult && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`absolute inset-0 z-40 flex flex-col items-center justify-center ${
                            showResult.matched
                              ? 'bg-[#39ff14]/10 backdrop-brightness-110'
                              : 'bg-[#ff2d95]/10 backdrop-brightness-75'
                          }`}
                        >
                          {/* Icon */}
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                              showResult.matched
                                ? 'bg-neon-green/30 border-2 border-neon-green'
                                : 'bg-neon-pink/30 border-2 border-neon-pink'
                            }`}
                            style={{
                              boxShadow: showResult.matched
                                ? '0 0 40px rgba(57,255,20,0.4)'
                                : '0 0 40px rgba(255,45,149,0.4)',
                            }}
                          >
                            {showResult.matched ? (
                              <svg className="w-10 h-10 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-10 h-10 text-neon-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </motion.div>

                          {/* Text */}
                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl font-black text-white mb-1"
                          >
                            {showResult.matched ? 'Matches Consensus!' : 'Against Consensus'}
                          </motion.p>

                          {/* Community breakdown */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 text-sm mb-3"
                          >
                            <span className="text-neon-green font-bold">{100 - showResult.aiPct}% Human</span>
                            <span className="text-white/40">|</span>
                            <span className="text-neon-purple font-bold">{showResult.aiPct}% AI</span>
                          </motion.div>

                          {/* Vote bar */}
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.25, duration: 0.5 }}
                            className="w-48 h-2 rounded-full bg-bg-tertiary overflow-hidden origin-left"
                          >
                            <div
                              className="h-full bg-gradient-to-r from-neon-green to-neon-purple rounded-full"
                              style={{ width: `${showResult.aiPct}%`, marginLeft: `${100 - showResult.aiPct}%` }}
                            />
                          </motion.div>

                          {/* Points */}
                          <motion.p
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                            className="text-3xl font-black text-neon-cyan mt-4"
                            style={{ textShadow: '0 0 20px rgba(0,240,255,0.5)' }}
                          >
                            +{showResult.pointsEarned}
                          </motion.p>

                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-xs text-white/50 mt-1"
                          >
                            {showResult.totalVotes.toLocaleString()} community votes
                          </motion.p>

                          {/* Streak celebration */}
                          {showResult.matched && streak >= 3 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.5, type: 'spring' }}
                              className="mt-3 px-4 py-1.5 rounded-full border border-neon-orange/40 bg-neon-orange/10"
                              style={{ boxShadow: '0 0 20px rgba(255,107,53,0.3)' }}
                            >
                              <span className="text-neon-orange font-bold text-sm">
                                🔥 {streak} Streak!
                                {streak >= 10 && ' LEGENDARY!'}
                                {streak >= 5 && streak < 10 && ' On Fire!'}
                              </span>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ─── Vote Buttons ─── */}
                  <div className="px-4 py-4 bg-bg-secondary border-t border-border-subtle">
                    <div className="flex items-center gap-3">
                      {/* HUMAN button */}
                      <button
                        onClick={() => submitVote('human')}
                        disabled={!!showResult}
                        className="flex-1 group relative py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 disabled:opacity-40
                          bg-neon-green/10 text-neon-green border border-neon-green/30
                          hover:bg-neon-green/20 hover:border-neon-green/50 active:scale-[0.97]"
                        style={{ boxShadow: '0 0 15px rgba(57,255,20,0.1)' }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Human
                        </span>
                      </button>

                      {/* Skip button */}
                      <button
                        onClick={skipVideo}
                        disabled={!!showResult}
                        className="w-12 h-12 rounded-xl bg-bg-tertiary border border-border-subtle text-text-muted
                          hover:text-text-primary hover:bg-bg-elevated transition-all disabled:opacity-40 flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* AI button */}
                      <button
                        onClick={() => submitVote('ai')}
                        disabled={!!showResult}
                        className="flex-1 group relative py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-200 disabled:opacity-40
                          bg-neon-purple/10 text-neon-purple border border-neon-purple/30
                          hover:bg-neon-purple/20 hover:border-neon-purple/50 active:scale-[0.97]"
                        style={{ boxShadow: '0 0 15px rgba(179,71,217,0.1)' }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                          </svg>
                          AI
                        </span>
                      </button>
                    </div>

                    {/* Keyboard hints */}
                    <div className="hidden lg:flex items-center justify-center gap-4 mt-3 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded font-mono border border-border-subtle">←</kbd> Human
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded font-mono border border-border-subtle">↓</kbd> Skip
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded font-mono border border-border-subtle">→</kbd> AI
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded font-mono border border-border-subtle">Esc</kbd> Close
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
