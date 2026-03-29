'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import { CardSkeleton } from '@/components/shared/LoadingSkeleton';
import PointsBadge from '@/components/shared/PointsBadge';
import ActivityFeed from '@/components/shared/ActivityFeed';
import SearchBar from '@/components/shared/SearchBar';

interface SubmissionRow {
  id: string;
  wallet_address: string;
  type: 'x_post' | 'blog' | 'art';
  title: string;
  content_text: string;
  points_awarded: number;
  normalized_score: number | null;
  created_at: string;
  users?: {
    display_name: string | null;
  } | null;
}

interface CommandCenterResponse {
  tier: {
    current: string;
    current_points: number;
    next_tier: string | null;
    points_to_next: number;
    progress: number;
    unlocks_preview: string[];
  };
  streak: {
    current_days: number;
    shield_available: boolean;
    shields_available: number;
    comeback_bonus_ready: boolean;
    last_meaningful_activity_at: string | null;
  };
  bracket: {
    name: string;
    rank: number;
    members: number;
    points: number;
    points_to_next_rank: number;
  };
  next_best_action: {
    action_id: string;
    title: string;
    reason: string;
    estimated_points: number;
    expires_at: string;
  };
}

interface PointsFeedItem {
  ledger_id: string;
  created_at: string;
  points: number;
  reason_label: string;
  explanation: string;
}

const typeIcons: Record<string, { label: string; color: string; dotColor: string }> = {
  x_post: { label: 'Jito Content', color: 'text-accent-text', dotColor: 'bg-[var(--accent)]' },
  blog: { label: 'Blog', color: 'text-accent-text', dotColor: 'bg-emerald-500' },
  art: { label: 'Art', color: 'text-caution', dotColor: 'bg-amber-500' },
};

const fallbackTypeIcon = { label: 'Other', color: 'text-text-secondary', dotColor: 'bg-text-secondary' };

const REACTION_TYPES = [
  { type: 'fire', emoji: '\u{1F525}' },
  { type: 'hundred', emoji: '\u{1F4AF}' },
  { type: 'brain', emoji: '\u{1F9E0}' },
  { type: 'art', emoji: '\u{1F3A8}' },
  { type: 'clap', emoji: '\u{1F44F}' },
] as const;

type ReactionType = (typeof REACTION_TYPES)[number]['type'];

interface ReactionData {
  counts: Record<ReactionType, number>;
  user_reactions: ReactionType[];
}

function ReactionBar({
  submissionId,
  data,
  onToggle,
}: {
  submissionId: string;
  data: ReactionData | undefined;
  onToggle: (submissionId: string, type: ReactionType) => void;
}) {
  if (!data) return null;
  return (
    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-subtle">
      {REACTION_TYPES.map(({ type, emoji }) => {
        const count = data.counts[type] || 0;
        const isActive = data.user_reactions.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggle(submissionId, type)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border transition-colors duration-150 ${
              isActive
                ? 'bg-accent-muted border-accent-border text-accent-text'
                : 'bg-bg-raised border-border-subtle text-text-secondary hover:border-text-muted'
            }`}
          >
            <span className="text-xs leading-none">{emoji}</span>
            {count > 0 && (
              <span className="text-[10px] font-mono leading-none">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [communitySubmissions, setCommunitySubmissions] = useState<SubmissionRow[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionRow[]>([]);
  const [myWeeklyPoints, setMyWeeklyPoints] = useState(0);
  const [myTotalPoints, setMyTotalPoints] = useState(0);
  const [commandCenter, setCommandCenter] = useState<CommandCenterResponse | null>(null);
  const [pointsFeed, setPointsFeed] = useState<PointsFeedItem[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const actionImpressionRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          fetch('/api/submissions?limit=15', { cache: 'no-store' }).then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load community feed');
            return d;
          }),
          fetch('/api/submissions?scope=mine&limit=50', { cache: 'no-store' }).then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load your submissions');
            return d;
          }),
          fetch('/api/me/summary', { cache: 'no-store' }).then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load your points summary');
            return d;
          }),
          fetch('/api/me/command-center', { cache: 'no-store' }).then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load command center');
            return d;
          }),
          fetch('/api/me/points-feed?limit=8', { cache: 'no-store' }).then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load points feed');
            return d;
          }),
        ]);

        const communityData = results[0].status === 'fulfilled' ? results[0].value : null;
        const mineData = results[1].status === 'fulfilled' ? results[1].value : null;
        const summaryData = results[2].status === 'fulfilled' ? results[2].value : null;
        const commandCenterData = results[3].status === 'fulfilled' ? results[3].value : null;
        const pointsFeedData = results[4].status === 'fulfilled' ? results[4].value : null;

        if (!cancelled) {
          setCommunitySubmissions(communityData?.submissions || []);
          setMySubmissions(mineData?.submissions || []);
          setMyWeeklyPoints(summaryData?.stats?.weekly_points || 0);
          setMyTotalPoints(summaryData?.stats?.total_points || 0);
          setCommandCenter(commandCenterData || null);
          setPointsFeed(pointsFeedData?.items || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const actionId = commandCenter?.next_best_action?.action_id;
    if (!actionId) return;
    if (actionImpressionRef.current === actionId) return;

    actionImpressionRef.current = actionId;
    void fetch('/api/me/next-action/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_id: actionId,
        placement: 'dashboard_command_center',
      }),
    });
  }, [commandCenter?.next_best_action?.action_id]);

  // Fetch reactions for community submissions
  useEffect(() => {
    if (communitySubmissions.length === 0) return;
    let cancelled = false;

    const fetchReactions = async () => {
      const results = await Promise.allSettled(
        communitySubmissions.map((s) =>
          fetch(`/api/submissions/${s.id}/react`, { cache: 'no-store' }).then(async (r) => {
            if (!r.ok) return null;
            const d = await r.json();
            return { id: s.id, data: d as ReactionData };
          })
        )
      );

      if (cancelled) return;

      const next: Record<string, ReactionData> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          next[result.value.id] = result.value.data;
        }
      }
      setReactions(next);
    };

    void fetchReactions();
    return () => {
      cancelled = true;
    };
  }, [communitySubmissions]);

  // Optimistic reaction toggle
  const handleReactionToggle = useCallback(
    async (submissionId: string, type: ReactionType) => {
      const prev = reactions[submissionId];
      if (!prev) return;

      // Optimistic update
      const isActive = prev.user_reactions.includes(type);
      const optimistic: ReactionData = {
        counts: {
          ...prev.counts,
          [type]: isActive
            ? Math.max((prev.counts[type] || 0) - 1, 0)
            : (prev.counts[type] || 0) + 1,
        },
        user_reactions: isActive
          ? prev.user_reactions.filter((r) => r !== type)
          : [...prev.user_reactions, type],
      };
      setReactions((r) => ({ ...r, [submissionId]: optimistic }));

      try {
        const res = await fetch(`/api/submissions/${submissionId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) throw new Error('Failed');
        const body = await res.json();
        // Reconcile with server counts
        setReactions((r) => ({
          ...r,
          [submissionId]: {
            counts: body.counts,
            user_reactions:
              body.toggled === 'on'
                ? [...(r[submissionId]?.user_reactions.filter((rt) => rt !== type) || []), type]
                : (r[submissionId]?.user_reactions.filter((rt) => rt !== type) || []),
          },
        }));
      } catch {
        // Revert on failure
        setReactions((r) => ({ ...r, [submissionId]: prev }));
      }
    },
    [reactions]
  );

  const approvedCount = useMemo(
    () => mySubmissions.filter((submission) => submission.points_awarded > 0).length,
    [mySubmissions]
  );
  const pendingCount = useMemo(
    () => mySubmissions.filter((submission) => submission.points_awarded === 0).length,
    [mySubmissions]
  );

  const tierProgressPercent = Math.round((commandCenter?.tier.progress || 0) * 100);

  /* Determine which stat has the highest value for the highlight gradient */
  const statValues = [mySubmissions.length, approvedCount, pendingCount, myWeeklyPoints, myTotalPoints];
  const maxStatIndex = statValues.reduce((maxIdx, val, idx, arr) => (val > arr[maxIdx] ? idx : maxIdx), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display">Dashboard</h2>
          <p className="text-text-secondary text-sm">Holder-only community activity and review status</p>
        </div>
        <Link href="/submit" className="inline-block bg-accent px-6 py-3 rounded-[var(--radius-sm)] font-semibold text-[#08080a] transition-colors hover:bg-accent-dim">
          + Submit Content
        </Link>
      </div>

      {/* --- Search --- */}
      <SearchBar />

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { value: mySubmissions.length, label: 'Your Submissions', colorClass: 'text-text-primary' },
          { value: approvedCount, label: 'Approved', colorClass: 'text-positive' },
          { value: pendingCount, label: 'In Review', colorClass: 'text-caution' },
          { value: null, label: 'Weekly Points', colorClass: '', isWeeklyPoints: true },
          { value: myTotalPoints, label: 'Total Points', colorClass: 'text-accent-text' },
        ].map((stat, idx) => (
          <NeonCard
            key={stat.label}
            hover={false}
            className={`p-4 text-center group relative overflow-hidden border-t-2 border-t-transparent hover:border-t-[var(--accent)] transition-all duration-300 ${
              idx === maxStatIndex && statValues[idx] > 0
                ? 'bg-gradient-to-b from-[var(--accent-muted)] to-transparent'
                : ''
            }`}
          >
            {stat.isWeeklyPoints ? (
              <>
                <PointsBadge points={myWeeklyPoints} size="sm" />
                <div className="text-xs text-text-muted mt-2">{stat.label}</div>
              </>
            ) : (
              <>
                <div className={`text-2xl font-display font-bold ${stat.colorClass}`}>
                  {stat.value}
                </div>
                <div className="text-xs text-text-muted mt-1">{stat.label}</div>
              </>
            )}
          </NeonCard>
        ))}
      </div>

      {/* --- Command Center --- */}
      {commandCenter ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NeonCard hover={false} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary font-display">Command Center</h3>
            </div>

            {/* Tier name as large heading */}
            <div className="text-center py-1">
              <div className="text-2xl font-display font-bold text-accent-text tracking-wide">
                {commandCenter.tier.current}
              </div>
            </div>

            {/* Tier progress bar - thicker with gold gradient */}
            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Tier Progress</span>
                <span>{tierProgressPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-bg-raised overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-[#e8c96a] to-[var(--accent)] transition-all duration-500"
                  style={{ width: `${tierProgressPercent}%` }}
                />
              </div>
              <div className="text-xs text-text-muted mt-1">
                {commandCenter.tier.next_tier
                  ? `${commandCenter.tier.points_to_next} pts to ${commandCenter.tier.next_tier}`
                  : 'Top tier reached'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-bg-raised border border-border-subtle p-3">
                <div className="text-text-muted">Streak</div>
                <div className="text-text-primary font-semibold mt-1">
                  {commandCenter.streak.current_days} days
                </div>
                <div className="text-text-muted mt-1">
                  Shields: {commandCenter.streak.shields_available}
                </div>
              </div>
              <div className="rounded-lg bg-bg-raised border border-border-subtle p-3">
                <div className="text-text-muted">Bracket</div>
                <div className="text-text-primary font-semibold mt-1">
                  #{commandCenter.bracket.rank} / {commandCenter.bracket.members}
                </div>
                <div className="text-text-muted mt-1">{commandCenter.bracket.name}</div>
              </div>
            </div>

            {/* Next Best Action with gold shimmer */}
            <div className="rounded-lg bg-accent-muted border border-accent-border p-3 relative overflow-hidden">
              <div className="gold-shimmer absolute inset-0 pointer-events-none opacity-30" />
              <div className="relative z-10">
                <div className="text-xs text-accent-text font-mono uppercase tracking-wide">Next Best Action</div>
                <div className="text-sm text-text-primary font-medium mt-1">
                  {commandCenter.next_best_action.title}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {commandCenter.next_best_action.reason}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-positive font-mono">
                    +{commandCenter.next_best_action.estimated_points} est.
                  </span>
                  <Link href="/submit" className="text-xs text-accent-text hover:underline">
                    Do it now
                  </Link>
                </div>
              </div>
            </div>
          </NeonCard>

          <NeonCard hover={false} className="p-5">
            <h3 className="text-base font-semibold text-text-primary mb-3 font-display">Why You Earned Points</h3>
            <div className="space-y-3 max-h-72 overflow-auto pr-1">
              {pointsFeed.length === 0 ? (
                <div className="text-sm text-text-muted">No point events yet.</div>
              ) : (
                pointsFeed.map((item) => (
                  <div key={item.ledger_id} className="rounded-lg bg-bg-raised border border-border-subtle p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-text-primary font-medium">{item.reason_label}</div>
                      <div className="text-xs font-mono text-accent-text">
                        {item.points >= 0 ? '+' : ''}
                        {item.points}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">{item.explanation}</div>
                    <div className="text-[11px] text-text-muted mt-2">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </NeonCard>
        </div>
      ) : null}

      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      {/* --- Loading State with Skeleton Cards --- */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}

      {/* --- Your Recent Contributions --- */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Your Recent Contributions</h3>

        {/* Empty state */}
        {!loading && mySubmissions.length === 0 ? (
          <NeonCard hover={false} className="p-8 border border-accent-border">
            <div className="text-center max-w-md mx-auto space-y-5">
              <p className="text-lg text-text-primary font-display">
                Your journey begins with a single contribution
              </p>
              <p className="text-sm text-text-secondary">
                Share your work with the community and start earning points. Pick a content type to get started.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-bg-raised border border-border-subtle p-3 text-center">
                  <div className="text-xl mb-1">𝕏</div>
                  <div className="text-xs text-text-secondary">X Post</div>
                </div>
                <div className="rounded-lg bg-bg-raised border border-border-subtle p-3 text-center">
                  <div className="text-xl mb-1">&#9998;</div>
                  <div className="text-xs text-text-secondary">Blog</div>
                </div>
                <div className="rounded-lg bg-bg-raised border border-border-subtle p-3 text-center">
                  <div className="text-xl mb-1">&#9670;</div>
                  <div className="text-xs text-text-secondary">Artwork</div>
                </div>
              </div>
              <Link
                href="/submit"
                className="inline-block bg-accent px-8 py-3 rounded-[var(--radius-sm)] font-semibold text-[#08080a] transition-colors hover:bg-accent-dim"
              >
                Make Your First Submission
              </Link>
            </div>
          </NeonCard>
        ) : null}

        <div className="space-y-3">
          {mySubmissions.slice(0, 6).map((submission) => (
            <NeonCard key={submission.id} hover={false} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text-primary">{submission.title}</div>
                  <div className="text-xs text-text-muted">
                    {(typeIcons[submission.type] || fallbackTypeIcon).label} | {new Date(submission.created_at).toLocaleDateString()} |{' '}
                    {submission.normalized_score
                      ? `Score ${Math.round(submission.normalized_score)}`
                      : submission.points_awarded > 0
                        ? 'Scored'
                        : 'In review'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-accent-text">{submission.points_awarded} pts</div>
                </div>
              </div>
            </NeonCard>
          ))}
        </div>
      </div>

      {/* --- Community Feed --- */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Community Feed</h3>
        <div className="space-y-4">
          {!loading && communitySubmissions.length === 0 ? (
            <NeonCard hover={false} className="p-4">
              <div className="text-sm text-text-muted">No approved submissions yet.</div>
            </NeonCard>
          ) : null}

          {communitySubmissions.map((submission, index) => {
            const typeInfo = typeIcons[submission.type] || fallbackTypeIcon;
            return (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <NeonCard className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">
                        {submission.users?.display_name || submission.wallet_address}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${typeInfo.dotColor}`} />
                        <span className={typeInfo.color}>{typeInfo.label}</span>
                        <span className="text-text-muted/50">|</span>
                        <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <PointsBadge points={submission.points_awarded} size="sm" showLabel={false} />
                  </div>

                  <h4 className="text-base font-semibold text-text-primary mb-1">{submission.title}</h4>
                  <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">{submission.content_text}</p>

                  <ReactionBar
                    submissionId={submission.id}
                    data={reactions[submission.id]}
                    onToggle={handleReactionToggle}
                  />
                </NeonCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* --- Recent Activity Feed --- */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Recent Activity</h3>
        <NeonCard hover={false} className="p-5">
          <ActivityFeed />
        </NeonCard>
      </div>
    </div>
  );
}
