'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import NeonCard from '@/components/shared/NeonCard';
import { CardSkeleton } from '@/components/shared/LoadingSkeleton';
import PointsBadge from '@/components/shared/PointsBadge';
import { useUser } from '@/components/shared/UserProvider';

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

export default function DashboardPage() {
  const { summary: userSummary, refresh: refreshUser } = useUser();
  const [mySubmissions, setMySubmissions] = useState<SubmissionRow[]>([]);
  const [commandCenter, setCommandCenter] = useState<CommandCenterResponse | null>(null);
  const [pointsFeed, setPointsFeed] = useState<PointsFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const myWeeklyPoints = userSummary?.stats?.weekly_points ?? 0;
  const myTotalPoints = userSummary?.stats?.total_points ?? 0;

  const actionImpressionRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          fetch('/api/submissions?scope=mine&limit=50', { cache: 'no-store' }).then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load your submissions');
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

        const mineData = results[0].status === 'fulfilled' ? results[0].value : null;
        const commandCenterData = results[1].status === 'fulfilled' ? results[1].value : null;
        const pointsFeedData = results[2].status === 'fulfilled' ? results[2].value : null;

        if (!cancelled) {
          setMySubmissions(mineData?.submissions || []);
          setCommandCenter(commandCenterData || null);
          setPointsFeed(pointsFeedData?.items || []);
          refreshUser(); // sync UserContext with latest data
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
  }, [refreshUser]);

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

      {/* --- Command Center + Points Feed --- */}
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

            {/* Tier progress bar */}
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

            {/* Next Best Action */}
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
                  <div className="text-xl mb-1">{'\u{1D54F}'}</div>
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

      {/* --- Community Feed Link --- */}
      <Link href="/feed" className="block">
        <NeonCard className="p-5 group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary font-display group-hover:text-accent-text transition-colors">
                Community Feed
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                See what the community is building, react to submissions, and discover new content
              </p>
            </div>
            <svg className="w-5 h-5 text-text-muted group-hover:text-accent-text transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </NeonCard>
      </Link>
    </div>
  );
}
