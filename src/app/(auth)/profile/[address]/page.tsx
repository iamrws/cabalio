'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import PointsBadge from '@/components/shared/PointsBadge';
import { CardSkeleton } from '@/components/shared/LoadingSkeleton';
import { BADGE_DEFINITIONS } from '@/lib/types';
import { getLevelInfo } from '@/lib/points';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContributionRow {
  id: string;
  type: 'x_post' | 'blog' | 'art';
  title: string;
  url: string | null;
  points_awarded: number;
  normalized_score: number | null;
  scoring_breakdown: ScoringBreakdown | null;
  status: string;
  created_at: string;
}

interface ScoringBreakdown {
  relevance: { score: number; rationale: string };
  originality: { score: number; rationale: string };
  effort: { score: number; rationale: string };
  engagement_potential: { score: number; rationale: string };
  accuracy: { score: number; rationale: string };
  weighted_total: number;
  summary: string;
}

interface PointsEntry {
  id: string;
  entry_type: string;
  points_delta: number;
  created_at: string;
}

interface RewardEntry {
  id: string;
  week_number: number;
  points_earned: number;
  reward_amount_lamports: number;
  status: 'claimable' | 'claimed' | 'expired';
  claimed_at: string | null;
  created_at: string;
}

interface ProfileResponse {
  wallet_address: string;
  user: {
    display_name: string | null;
    wallet_address: string;
    avatar_url: string | null;
    level: number;
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    is_holder?: boolean;
    holder_verified_at?: string | null;
    badges: Array<{ id: string; earned_at: string }>;
    created_at: string;
  };
  rewards: RewardEntry[];
  contributions: ContributionRow[];
  points_history: PointsEntry[];
  stats: {
    total_submissions: number;
    approved_submissions: number;
    pending_submissions: number;
    total_points: number;
    weekly_points: number;
    avg_score: number;
  };
  viewer: {
    is_self: boolean;
    is_admin: boolean;
  };
}

type TabKey = 'overview' | 'contributions' | 'points' | 'badges';
type ContribFilter = 'all' | 'x_post' | 'blog' | 'art';

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  contributions: 'Contributions',
  points: 'Points',
  badges: 'Badges',
};

const contributionTypeLabel: Record<string, string> = {
  x_post: 'X Post',
  blog: 'Blog',
  art: 'Art',
};

const FILTER_OPTIONS: { key: ContribFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'x_post', label: 'X Post' },
  { key: 'blog', label: 'Blog' },
  { key: 'art', label: 'Art' },
];

function formatEntryType(type: string): string {
  if (type === 'submission_approved') return 'Approved Submission';
  if (type === 'manual_adjustment') return 'Manual Adjustment';
  if (type === 'quest_bonus') return 'Quest Bonus';
  if (type === 'penalty') return 'Penalty';
  return type;
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const params = useParams<{ address: string }>();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // Clipboard feedback
  const [copied, setCopied] = useState(false);

  // Contribution filter
  const [contribFilter, setContribFilter] = useState<ContribFilter>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const address = params.address;
        const response = await fetch(`/api/profile/${address}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }
        if (!cancelled) {
          setProfile(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.address]);

  const levelInfo = useMemo(
    () => getLevelInfo(profile?.user.total_xp || 0),
    [profile?.user.total_xp]
  );

  const isSelf = profile?.viewer.is_self ?? false;

  /* ---- Edit handlers ---- */
  const handleEditStart = useCallback(() => {
    setEditName(profile?.user.display_name || '');
    setIsEditing(true);
    setEditError('');
    setEditSuccess(false);
  }, [profile?.user.display_name]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditError('');
    setEditSuccess(false);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editName.trim()) return;
    setEditSaving(true);
    setEditError('');
    setEditSuccess(false);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      // Update local state
      setProfile((prev) =>
        prev
          ? { ...prev, user: { ...prev.user, display_name: data.user.display_name } }
          : prev
      );
      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2500);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  }, [editName]);

  const handleCopyAddress = useCallback(() => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.wallet_address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [profile]);

  /* ---- Computed values ---- */
  const displayName =
    profile?.user.display_name ||
    (profile
      ? `${profile.wallet_address.slice(0, 4)}...${profile.wallet_address.slice(-4)}`
      : '');
  const earnedBadgeIds = new Set(profile?.user.badges?.map((b) => b.id) || []);
  const earnedBadgeMap = new Map(
    (profile?.user.badges || []).map((b) => [b.id, b.earned_at])
  );

  const filteredContributions = useMemo(() => {
    if (!profile) return [];
    if (contribFilter === 'all') return profile.contributions;
    return profile.contributions.filter((c) => c.type === contribFilter);
  }, [profile, contribFilter]);

  // Rewards stats
  const totalClaimableLamports = useMemo(
    () =>
      (profile?.rewards || [])
        .filter((r) => r.status === 'claimable')
        .reduce((sum, r) => sum + r.reward_amount_lamports, 0),
    [profile?.rewards]
  );

  // Points running total for chart-like display
  const pointsWithRunning = useMemo(() => {
    if (!profile) return [];
    const sorted = [...profile.points_history].reverse();
    let running = 0;
    return sorted.map((entry) => {
      running += entry.points_delta;
      return { ...entry, running_total: running };
    });
  }, [profile]);
  const maxRunning = useMemo(
    () => Math.max(...pointsWithRunning.map((e) => e.running_total), 1),
    [pointsWithRunning]
  );

  /* ---- Loading State ---- */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-5xl mx-auto">
        <NeonCard hover={false} className="p-6 border border-negative-border">
          <div className="text-sm text-negative">{error || 'Profile unavailable'}</div>
        </NeonCard>
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ============ HEADER CARD ============ */}
      <NeonCard hover={false} className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-24 w-24 rounded-2xl bg-bg-raised border-[3px] border-accent-border ring-4 ring-accent/20 flex items-center justify-center text-3xl font-mono font-bold text-accent-text shadow-[0_0_20px_rgba(212,168,83,0.15)]">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            {profile.user.is_holder && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent flex items-center justify-center border-2 border-bg-surface" title="NFT Holder Verified">
                <svg className="h-3.5 w-3.5 text-[#08080a]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            {/* Display Name + Edit */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={30}
                    className="bg-bg-raised border border-accent-border rounded-lg px-3 py-1.5 text-xl font-display text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 w-56"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleEditSave();
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                  />
                  <button
                    onClick={() => void handleEditSave()}
                    disabled={editSaving || !editName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-accent text-[#08080a] text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    {editSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="px-3 py-1.5 rounded-lg border border-border-subtle text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  {editError && (
                    <span className="text-xs text-negative">{editError}</span>
                  )}
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-text-primary font-display truncate">
                    {displayName}
                  </h1>
                  {isSelf && (
                    <button
                      onClick={handleEditStart}
                      className="text-text-muted hover:text-accent-text transition-colors flex-shrink-0"
                      title="Edit display name"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  {editSuccess && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-positive font-medium"
                    >
                      Saved
                    </motion.span>
                  )}
                </>
              )}
            </div>

            {/* Wallet address — click to copy */}
            <button
              onClick={handleCopyAddress}
              className="text-sm text-text-muted font-mono mb-3 hover:text-text-secondary transition-colors inline-flex items-center gap-1.5 group"
              title="Click to copy address"
            >
              {profile.wallet_address}
              {copied ? (
                <svg className="h-3.5 w-3.5 text-positive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>

            {/* Badges row */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {/* Level badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent-border">
                <span className="text-sm font-mono text-accent-text font-bold">Lv.{levelInfo.level}</span>
                <span className="text-xs text-accent-text/70 font-medium">{levelInfo.name}</span>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-caution-muted border border-caution-border">
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-caution" fill="currentColor" aria-hidden="true">
                  <path d="M8 1c-.6 0-1 .5-1.3 1L4 7c-.8 1.5-.2 3 1 4 .8.7 1.8 1.2 3 1.2s2.2-.5 3-1.2c1.2-1 1.8-2.5 1-4L9.3 2C9 1.5 8.6 1 8 1zm0 2.5L9.8 7c.4.8.1 1.5-.5 2-.4.3-1 .5-1.3.5s-.9-.2-1.3-.5c-.6-.5-.9-1.2-.5-2L8 3.5z" />
                </svg>
                <span className="text-xs font-mono text-caution font-bold">
                  {profile.user.current_streak}d streak
                </span>
              </div>

              {/* Weekly points */}
              <PointsBadge points={profile.stats.weekly_points} size="sm" />

              {/* NFT Holder badge */}
              {profile.user.is_holder && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent-border">
                  <svg className="h-3.5 w-3.5 text-accent-text" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-mono text-accent-text font-bold">Holder Verified</span>
                  {profile.user.holder_verified_at && (
                    <span className="text-[10px] text-accent-text/50">
                      {new Date(profile.user.holder_verified_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Level progress bar */}
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">
              Level {levelInfo.level} &rarr; {levelInfo.level + 1}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {profile.user.total_xp.toLocaleString()} / {levelInfo.max_xp.toLocaleString()} XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-bg-raised overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(levelInfo.progress * 100, 2)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent"
            />
          </div>
        </div>
      </NeonCard>

      {/* ============ STATS GRID ============ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Submissions', value: profile.stats.total_submissions, color: 'text-accent-text' },
          { label: 'Approved', value: profile.stats.approved_submissions, color: 'text-positive' },
          { label: 'Total Points', value: profile.stats.total_points.toLocaleString(), color: 'text-accent-text' },
          { label: 'Avg Score', value: profile.stats.avg_score, color: 'text-accent-text' },
          { label: 'Best Streak', value: `${profile.user.longest_streak}d`, color: 'text-caution' },
        ].map((stat) => (
          <NeonCard key={stat.label} hover={false} className="p-4 text-center">
            <div className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-1">{stat.label}</div>
          </NeonCard>
        ))}
      </div>

      {/* ============ REWARDS (self only) ============ */}
      {isSelf && profile.rewards.length > 0 && (
        <NeonCard hover={false} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary font-display">Rewards</h3>
            {totalClaimableLamports > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent-border">
                <span className="text-xs text-accent-text/70">Claimable</span>
                <span className="text-sm font-mono font-bold text-accent-text">
                  {(totalClaimableLamports / 1e9).toFixed(4)} SOL
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {profile.rewards.map((reward) => {
              const isClaimable = reward.status === 'claimable';
              const isClaimed = reward.status === 'claimed';
              return (
                <div
                  key={reward.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                    isClaimable
                      ? 'border-accent-border bg-accent/5'
                      : 'border-border-subtle bg-bg-raised/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted font-mono">Week {reward.week_number}</span>
                    <span className="text-xs text-text-secondary">{reward.points_earned} pts earned</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold ${isClaimable ? 'text-accent-text' : 'text-text-muted'}`}>
                      {(reward.reward_amount_lamports / 1e9).toFixed(4)} SOL
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        isClaimable
                          ? 'bg-accent/20 text-accent-text'
                          : isClaimed
                          ? 'bg-positive-muted text-positive'
                          : 'bg-bg-raised text-text-muted'
                      }`}
                    >
                      {reward.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </NeonCard>
      )}

      {/* ============ TAB NAVIGATION ============ */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab
                ? 'text-accent-text'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {TAB_LABELS[tab]}
            {activeTab === tab && (
              <motion.div
                layoutId="profile-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* ============ TAB CONTENT ============ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              profile={profile}
              levelInfo={levelInfo}
              earnedBadgeIds={earnedBadgeIds}
            />
          )}
          {activeTab === 'contributions' && (
            <ContributionsTab
              contributions={filteredContributions}
              totalCount={profile.contributions.length}
              filter={contribFilter}
              onFilterChange={setContribFilter}
              isSelf={isSelf}
            />
          )}
          {activeTab === 'points' && (
            <PointsTab
              pointsHistory={profile.points_history}
              pointsWithRunning={pointsWithRunning}
              maxRunning={maxRunning}
            />
          )}
          {activeTab === 'badges' && (
            <BadgesTab
              earnedBadgeIds={earnedBadgeIds}
              earnedBadgeMap={earnedBadgeMap}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  TAB: Overview                                                      */
/* ================================================================== */

function OverviewTab({
  profile,
  levelInfo,
  earnedBadgeIds,
}: {
  profile: ProfileResponse;
  levelInfo: ReturnType<typeof getLevelInfo>;
  earnedBadgeIds: Set<string>;
}) {
  const recentContributions = profile.contributions.slice(0, 5);
  const recentPoints = profile.points_history.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Recent activity in 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent contributions */}
        <NeonCard hover={false} className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
            Recent Contributions
          </h3>
          {recentContributions.length === 0 ? (
            <div className="text-sm text-text-muted">No contributions yet.</div>
          ) : (
            <div className="space-y-3">
              {recentContributions.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-border-subtle bg-bg-raised/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{c.title}</div>
                      <div className="text-xs text-text-muted">
                        {contributionTypeLabel[c.type]} &middot;{' '}
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold text-accent-text flex-shrink-0">
                      {c.points_awarded} pts
                    </div>
                  </div>
                  {c.normalized_score !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-raised overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${c.normalized_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-accent-text">{c.normalized_score}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </NeonCard>

        {/* Recent point events */}
        <NeonCard hover={false} className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
            Recent Points
          </h3>
          {recentPoints.length === 0 ? (
            <div className="text-sm text-text-muted">No point entries yet.</div>
          ) : (
            <div className="space-y-2">
              {recentPoints.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-raised/40 px-3 py-2"
                >
                  <div>
                    <div className="text-sm text-text-primary">
                      {formatEntryType(entry.entry_type)}
                    </div>
                    <div className="text-xs text-text-muted">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      entry.points_delta >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {entry.points_delta >= 0 ? '+' : ''}
                    {entry.points_delta}
                  </div>
                </div>
              ))}
            </div>
          )}
        </NeonCard>
      </div>

      {/* Earned badges preview */}
      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
          Badges ({earnedBadgeIds.size}/{BADGE_DEFINITIONS.length})
        </h3>
        <div className="flex flex-wrap gap-3">
          {BADGE_DEFINITIONS.filter((b) => earnedBadgeIds.has(b.id)).map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-muted border border-accent-border"
            >
              <span className="text-lg">{badge.icon}</span>
              <span className="text-xs font-medium text-text-primary">{badge.name}</span>
            </div>
          ))}
          {earnedBadgeIds.size === 0 && (
            <div className="text-sm text-text-muted">No badges earned yet.</div>
          )}
        </div>
      </NeonCard>
    </div>
  );
}

/* ================================================================== */
/*  TAB: Contributions                                                 */
/* ================================================================== */

function ContributionsTab({
  contributions,
  totalCount,
  filter,
  onFilterChange,
  isSelf,
}: {
  contributions: ContributionRow[];
  totalCount: number;
  filter: ContribFilter;
  onFilterChange: (f: ContribFilter) => void;
  isSelf: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Appeal state
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealError, setAppealError] = useState('');
  // Track which submissions have pending/reviewed appeals: submissionId -> status
  const [appealStatuses, setAppealStatuses] = useState<Record<string, string>>({});

  // Load appeal statuses for rejected/flagged submissions on mount
  useEffect(() => {
    if (!isSelf) return;
    const appealable = contributions.filter((c) => ['rejected', 'flagged'].includes(c.status));
    if (appealable.length === 0) return;

    const loadAppeals = async () => {
      const statuses: Record<string, string> = {};
      await Promise.all(
        appealable.map(async (c) => {
          try {
            const res = await fetch(`/api/submissions/${c.id}/appeal`, { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              statuses[c.id] = data.appeal.status;
            }
          } catch {
            // No appeal exists — that's fine
          }
        })
      );
      setAppealStatuses(statuses);
    };
    void loadAppeals();
  }, [contributions, isSelf]);

  const handleAppealSubmit = useCallback(async (submissionId: string) => {
    if (appealReason.length < 10 || appealReason.length > 500) {
      setAppealError('Reason must be between 10 and 500 characters.');
      return;
    }
    setAppealSubmitting(true);
    setAppealError('');
    try {
      const res = await fetch(`/api/submissions/${submissionId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: appealReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(data.error) ? data.error[0]?.message : data.error || 'Failed to submit appeal');
      }
      setAppealStatuses((prev) => ({ ...prev, [submissionId]: 'pending' }));
      setAppealingId(null);
      setAppealReason('');
    } catch (err) {
      setAppealError(err instanceof Error ? err.message : 'Failed to submit appeal');
    } finally {
      setAppealSubmitting(false);
    }
  }, [appealReason]);

  return (
    <NeonCard hover={false} className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-text-primary font-display">
          Contributions ({totalCount})
        </h3>
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onFilterChange(opt.key)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === opt.key
                  ? 'bg-accent text-[#08080a] font-bold'
                  : 'bg-bg-raised text-text-muted hover:text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {contributions.length === 0 ? (
        <div className="text-sm text-text-muted py-8 text-center">
          No contributions match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {contributions.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className="rounded-lg border border-border-subtle bg-bg-raised/40 overflow-hidden"
              >
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {c.title}
                      </div>
                      <div className="text-xs text-text-muted">
                        {contributionTypeLabel[c.type]} &middot;{' '}
                        {new Date(c.created_at).toLocaleDateString()} &middot;{' '}
                        <span
                          className={
                            c.status === 'approved'
                              ? 'text-positive'
                              : c.status === 'rejected'
                              ? 'text-negative'
                              : 'text-caution'
                          }
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {c.normalized_score !== null && (
                        <span className="text-xs font-mono text-accent-text/70">
                          Score: {c.normalized_score}
                        </span>
                      )}
                      <span className="text-sm font-mono font-bold text-accent-text">
                        {c.points_awarded} pts
                      </span>
                      <svg
                        className={`h-4 w-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-border-subtle space-y-3">
                        {c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent-text underline hover:text-accent-text/80"
                          >
                            View Link &rarr;
                          </a>
                        )}
                        {/* Scoring breakdown for own submissions */}
                        {isSelf && c.normalized_score !== null && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-text-muted">Quality Score</span>
                              <span className="text-lg font-mono font-bold text-accent-text">
                                {c.normalized_score}
                              </span>
                            </div>
                            {c.scoring_breakdown && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {(
                                  ['relevance', 'originality', 'effort', 'engagement_potential', 'accuracy'] as const
                                ).map((dim) => {
                                  const d = c.scoring_breakdown?.[dim];
                                  if (!d) return null;
                                  return (
                                    <div
                                      key={dim}
                                      className="text-center p-2 rounded-lg bg-bg-base border border-border-subtle"
                                    >
                                      <div className="text-sm font-mono font-bold text-accent-text">
                                        {d.score}
                                      </div>
                                      <div className="text-[10px] text-text-muted capitalize">
                                        {dim.replace('_', ' ')}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {c.scoring_breakdown?.summary && (
                              <p className="text-xs text-text-secondary mt-2 italic">
                                {c.scoring_breakdown.summary}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Appeal section for rejected/flagged submissions (self only) */}
                        {isSelf && ['rejected', 'flagged'].includes(c.status) && (
                          <div className="pt-2 border-t border-border-subtle">
                            {appealStatuses[c.id] === 'pending' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-caution-muted text-caution">
                                  Appeal Pending
                                </span>
                              </div>
                            )}
                            {appealStatuses[c.id] === 'accepted' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-positive-muted text-positive">
                                  Appeal Accepted
                                </span>
                              </div>
                            )}
                            {appealStatuses[c.id] === 'denied' && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-negative-muted text-negative">
                                  Appeal Denied
                                </span>
                              </div>
                            )}
                            {!appealStatuses[c.id] && appealingId !== c.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAppealingId(c.id);
                                  setAppealReason('');
                                  setAppealError('');
                                }}
                                className="rounded-lg bg-caution-muted border border-caution-border text-caution px-3 py-1.5 text-xs font-medium hover:bg-caution-muted/80 transition-colors"
                              >
                                Appeal Decision
                              </button>
                            )}
                            {!appealStatuses[c.id] && appealingId === c.id && (
                              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  value={appealReason}
                                  onChange={(e) => setAppealReason(e.target.value)}
                                  placeholder="Explain why this submission should be reconsidered (10-500 characters)..."
                                  maxLength={500}
                                  rows={3}
                                  className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => void handleAppealSubmit(c.id)}
                                    disabled={appealSubmitting || appealReason.length < 10}
                                    className="rounded-lg bg-accent-muted border border-accent-border text-accent-text px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                                  >
                                    {appealSubmitting ? 'Submitting...' : 'Submit Appeal'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAppealingId(null);
                                      setAppealReason('');
                                      setAppealError('');
                                    }}
                                    className="rounded-lg border border-border-subtle text-text-secondary px-3 py-1.5 text-xs hover:text-text-primary"
                                  >
                                    Cancel
                                  </button>
                                  <span className="text-[10px] text-text-muted ml-auto">
                                    {appealReason.length}/500
                                  </span>
                                </div>
                                {appealError && (
                                  <div className="text-xs text-negative">{appealError}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </NeonCard>
  );
}

/* ================================================================== */
/*  TAB: Points                                                        */
/* ================================================================== */

function PointsTab({
  pointsHistory,
  pointsWithRunning,
  maxRunning,
}: {
  pointsHistory: PointsEntry[];
  pointsWithRunning: Array<PointsEntry & { running_total: number }>;
  maxRunning: number;
}) {
  return (
    <div className="space-y-6">
      {/* Running total visualization */}
      {pointsWithRunning.length > 0 && (
        <NeonCard hover={false} className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
            Points Growth
          </h3>
          <div className="flex items-end gap-px h-32 overflow-hidden">
            {pointsWithRunning.map((entry, i) => {
              const height = Math.max((entry.running_total / maxRunning) * 100, 2);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                  className="flex-1 min-w-[3px] max-w-3 bg-accent/60 hover:bg-accent rounded-t transition-colors"
                  title={`${entry.running_total} pts — ${new Date(entry.created_at).toLocaleDateString()}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-text-muted">
              {pointsWithRunning.length > 0
                ? new Date(pointsWithRunning[0].created_at).toLocaleDateString()
                : ''}
            </span>
            <span className="text-[10px] text-text-muted">
              {pointsWithRunning.length > 0
                ? new Date(
                    pointsWithRunning[pointsWithRunning.length - 1].created_at
                  ).toLocaleDateString()
                : ''}
            </span>
          </div>
        </NeonCard>
      )}

      {/* Full history list */}
      <NeonCard hover={false} className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
          Points History ({pointsHistory.length})
        </h3>
        {pointsHistory.length === 0 ? (
          <div className="text-sm text-text-muted py-8 text-center">No point entries yet.</div>
        ) : (
          <div className="space-y-2">
            {pointsHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-raised/40 px-3 py-2"
              >
                <div>
                  <div className="text-sm text-text-primary">
                    {formatEntryType(entry.entry_type)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
                <div
                  className={`font-mono font-bold ${
                    entry.points_delta >= 0 ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {entry.points_delta >= 0 ? '+' : ''}
                  {entry.points_delta}
                </div>
              </div>
            ))}
          </div>
        )}
      </NeonCard>
    </div>
  );
}

/* ================================================================== */
/*  TAB: Badges                                                        */
/* ================================================================== */

function BadgesTab({
  earnedBadgeIds,
  earnedBadgeMap,
}: {
  earnedBadgeIds: Set<string>;
  earnedBadgeMap: Map<string, string>;
}) {
  return (
    <NeonCard hover={false} className="p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
        Badges ({earnedBadgeIds.size}/{BADGE_DEFINITIONS.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {BADGE_DEFINITIONS.map((badge) => {
          const earned = earnedBadgeIds.has(badge.id);
          const earnedAt = earnedBadgeMap.get(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative text-center p-5 rounded-xl border transition-all ${
                earned
                  ? 'bg-accent/10 border-accent-border shadow-[0_0_16px_rgba(212,168,83,0.08)]'
                  : 'bg-bg-raised/50 border-border-subtle opacity-40'
              }`}
            >
              <div className={`text-4xl mb-2 ${earned ? '' : 'grayscale'}`}>{badge.icon}</div>
              <div className="text-sm font-medium text-text-primary mb-0.5">{badge.name}</div>
              <div className="text-xs text-text-muted leading-tight">{badge.description}</div>
              {earned && earnedAt && (
                <div className="text-[10px] text-accent-text/60 mt-2">
                  Earned {new Date(earnedAt).toLocaleDateString()}
                </div>
              )}
              {!earned && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-bg-raised overflow-hidden">
                    <div className="h-full rounded-full bg-text-muted w-0" />
                  </div>
                  <div className="text-[10px] text-text-muted mt-1">Locked</div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </NeonCard>
  );
}
