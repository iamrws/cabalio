'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NeonCard from '@/components/shared/NeonCard';
import PointsBadge from '@/components/shared/PointsBadge';

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

const typeIcons: Record<string, { label: string; color: string }> = {
  x_post: { label: 'Jito Content', color: 'text-accent-text' },
  blog: { label: 'Blog', color: 'text-accent-text' },
  art: { label: 'Art', color: 'text-caution' },
};

const fallbackTypeIcon = { label: 'Other', color: 'text-text-secondary' };

export default function DashboardPage() {
  const [communitySubmissions, setCommunitySubmissions] = useState<SubmissionRow[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionRow[]>([]);
  const [myWeeklyPoints, setMyWeeklyPoints] = useState(0);
  const [myTotalPoints, setMyTotalPoints] = useState(0);
  const [commandCenter, setCommandCenter] = useState<CommandCenterResponse | null>(null);
  const [pointsFeed, setPointsFeed] = useState<PointsFeedItem[]>([]);
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

  const approvedCount = useMemo(
    () => mySubmissions.filter((submission) => submission.points_awarded > 0).length,
    [mySubmissions]
  );
  const pendingCount = useMemo(
    () => mySubmissions.filter((submission) => submission.points_awarded === 0).length,
    [mySubmissions]
  );

  const tierProgressPercent = Math.round((commandCenter?.tier.progress || 0) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Dashboard</h2>
          <p className="text-text-secondary text-sm">Holder-only community activity and review status</p>
        </div>
        <Link href="/submit" className="inline-block bg-accent px-6 py-3 rounded-[var(--radius-xs)] font-semibold text-white transition-colors hover:bg-accent-dim">
          + Submit Content
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-text-primary">{mySubmissions.length}</div>
          <div className="text-xs text-text-muted">Your Submissions</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-positive">{approvedCount}</div>
          <div className="text-xs text-text-muted">Approved</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-caution">{pendingCount}</div>
          <div className="text-xs text-text-muted">In Review</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <PointsBadge points={myWeeklyPoints} size="sm" />
          <div className="text-xs text-text-muted mt-2">Weekly Points</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-accent-text">{myTotalPoints}</div>
          <div className="text-xs text-text-muted mt-2">Total Points</div>
        </NeonCard>
      </div>

      {commandCenter ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NeonCard hover={false} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">Command Center</h3>
              <span className="text-xs font-mono text-accent-text">{commandCenter.tier.current}</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Tier Progress</span>
                <span>{tierProgressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-bg-raised">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
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

            <div className="rounded-lg bg-accent-muted border border-accent-border p-3">
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
          </NeonCard>

          <NeonCard hover={false} className="p-5">
            <h3 className="text-base font-semibold text-text-primary mb-3">Why You Earned Points</h3>
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

      {loading ? (
        <NeonCard hover={false} className="p-4">
          <div className="text-sm text-text-muted">Loading activity feed...</div>
        </NeonCard>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Your Recent Contributions</h3>
        {!loading && mySubmissions.length === 0 ? (
          <NeonCard hover={false} className="p-4">
            <div className="text-sm text-text-muted">No submissions yet. Start with your first contribution.</div>
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

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Community Feed</h3>
        <div className="space-y-4">
          {!loading && communitySubmissions.length === 0 ? (
            <NeonCard hover={false} className="p-4">
              <div className="text-sm text-text-muted">No approved submissions yet.</div>
            </NeonCard>
          ) : null}

          {communitySubmissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <NeonCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {submission.users?.display_name || submission.wallet_address}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className={(typeIcons[submission.type] || fallbackTypeIcon).color}>{(typeIcons[submission.type] || fallbackTypeIcon).label}</span>
                      <span>|</span>
                      <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <PointsBadge points={submission.points_awarded} size="sm" showLabel={false} />
                </div>

                <h4 className="text-base font-semibold text-text-primary mb-1">{submission.title}</h4>
                <p className="text-sm text-text-secondary line-clamp-2">{submission.content_text}</p>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
