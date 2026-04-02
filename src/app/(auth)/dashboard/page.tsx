'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Gift, Shield, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import NeonCard from '@/components/shared/NeonCard';
import { CardSkeleton } from '@/components/shared/LoadingSkeleton';
import AnimatedCounter from '@/components/shared/AnimatedCounter';
import { useUser } from '@/components/shared/UserProvider';
import { useSubmitDrawer } from '@/components/shared/SubmitDrawerProvider';
import type { LeaderboardEntry } from '@/lib/types';

/* ── Types ── */
interface SubmissionRow {
  id: string;
  wallet_address: string;
  type: 'x_post' | 'blog' | 'art';
  title: string;
  content_text: string;
  points_awarded: number;
  normalized_score: number | null;
  created_at: string;
  users?: { display_name: string | null } | null;
}

interface CommandCenterResponse {
  tier: { current: string; current_points: number; next_tier: string | null; points_to_next: number; progress: number; unlocks_preview: string[] };
  streak: { current_days: number; shield_available: boolean; shields_available: number; comeback_bonus_ready: boolean; last_meaningful_activity_at: string | null };
  bracket: { name: string; rank: number; members: number; points: number; points_to_next_rank: number };
  next_best_action: { action_id: string; title: string; reason: string; estimated_points: number; expires_at: string };
}

interface PointsFeedItem {
  ledger_id: string;
  created_at: string;
  points: number;
  reason_label: string;
  explanation: string;
}

interface Projections {
  avg_weekly_points: number;
  current_week_points: number;
  projected_week_points: number;
  estimated_weekly_sol: number;
  estimated_monthly_sol: number;
  trend: 'up' | 'down' | 'stable';
  trend_pct: number;
}

interface SeasonQuest {
  id: string;
  role_key: string | null;
  title: string;
  points_reward: number;
  starts_at: string;
  ends_at: string;
  can_submit: boolean;
  submission_status: 'submitted' | 'approved' | 'rejected' | 'flagged' | null;
}

interface Reward {
  id: string;
  week_number: number;
  points_earned: number;
  reward_amount_lamports: number;
  status: 'claimable' | 'claimed' | 'expired';
}

const typeLabels: Record<string, { label: string; dotColor: string }> = {
  x_post: { label: 'Jito Content', dotColor: 'bg-[var(--accent)]' },
  blog: { label: 'Blog', dotColor: 'bg-[var(--positive)]' },
  art: { label: 'Art', dotColor: 'bg-[var(--caution)]' },
};

const TIER_GLOW: Record<string, string> = {
  'Cabal Elite': 'shadow-[0_0_20px_rgba(212,168,83,0.15)]',
  'Cabal Member': 'shadow-[0_0_20px_rgba(74,222,128,0.12)]',
  'Cabal Initiate': 'shadow-[0_0_20px_rgba(155,150,137,0.10)]',
};

const TIER_COLOR: Record<string, string> = {
  'Cabal Elite': 'text-[var(--tier-elite)]',
  'Cabal Member': 'text-[var(--tier-member)]',
  'Cabal Initiate': 'text-[var(--tier-initiate)]',
};

export default function DashboardPage() {
  useUser();
  const { open: openSubmit } = useSubmitDrawer();
  const [mySubmissions, setMySubmissions] = useState<SubmissionRow[]>([]);
  const [commandCenter, setCommandCenter] = useState<CommandCenterResponse | null>(null);
  const [pointsFeed, setPointsFeed] = useState<PointsFeedItem[]>([]);
  const [projections, setProjections] = useState<Projections | null>(null);
  const [quests, setQuests] = useState<SeasonQuest[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rival, setRival] = useState<{ name: string; gap: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          fetch('/api/submissions?scope=mine&limit=5', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
          fetch('/api/me/command-center', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
          fetch('/api/me/points-feed?limit=4', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
          fetch('/api/me/reward-projections', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
          fetch('/api/seasons/current/quests', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
          fetch('/api/me/summary', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
          fetch('/api/leaderboard?range=week', { cache: 'no-store' }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),
        ]);

        if (!cancelled) {
          const submissions = results[0].status === 'fulfilled' ? results[0].value : null;
          const cc = results[1].status === 'fulfilled' ? results[1].value : null;
          const pf = results[2].status === 'fulfilled' ? results[2].value : null;
          const proj = results[3].status === 'fulfilled' ? results[3].value : null;
          const q = results[4].status === 'fulfilled' ? results[4].value : null;
          const summary = results[5].status === 'fulfilled' ? results[5].value : null;
          const lb = results[6].status === 'fulfilled' ? results[6].value : null;

          setMySubmissions(submissions?.submissions || []);
          setCommandCenter(cc);
          setPointsFeed(pf?.items || []);
          setProjections(proj);
          setQuests((q?.quests || []).slice(0, 3));
          setRewards(summary?.rewards || []);

          // Find rival (one rank above)
          if (lb?.leaderboard && cc?.bracket) {
            const sorted = (lb.leaderboard as LeaderboardEntry[]).sort((a: LeaderboardEntry, b: LeaderboardEntry) => a.rank - b.rank);
            const myRank = cc.bracket.rank;
            const above = sorted.find((e: LeaderboardEntry) => e.rank === myRank - 1);
            if (above) {
              setRival({ name: above.display_name || above.wallet_address.slice(0, 4) + '...' + above.wallet_address.slice(-4), gap: above.total_points - cc.bracket.points });
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const tierProgress = Math.round((commandCenter?.tier.progress || 0) * 100);
  const claimableRewards = useMemo(() => rewards.filter((r) => r.status === 'claimable'), [rewards]);
  const totalClaimableSol = useMemo(() => claimableRewards.reduce((s, r) => s + r.reward_amount_lamports, 0) / 1e9, [claimableRewards]);

  const TrendIcon = projections?.trend === 'up' ? TrendingUp : projections?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = projections?.trend === 'up' ? 'text-positive' : projections?.trend === 'down' ? 'text-negative' : 'text-text-muted';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      {/* ── Section 1: Rank Trajectory Hero ── */}
      {commandCenter ? (
        <NeonCard hover={false} className={`p-6 ${TIER_GLOW[commandCenter.tier.current] || ''}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left — Rank + Tier */}
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-display font-bold ${TIER_COLOR[commandCenter.tier.current] || 'text-accent-text'}`} style={{ letterSpacing: '-0.03em' }}>
                #{commandCenter.bracket.rank}
              </div>
              <div>
                <div className="text-lg font-display font-semibold text-text-primary">{commandCenter.tier.current}</div>
                <div className="text-xs text-text-muted font-mono">of {commandCenter.bracket.members} members</div>
              </div>
            </div>

            {/* Right — Delta + Rival */}
            <div className="text-right space-y-1">
              {commandCenter.bracket.points_to_next_rank > 0 ? (
                <div className="text-sm text-text-secondary">
                  <span className="font-mono text-accent-text">{commandCenter.bracket.points_to_next_rank}</span> pts to next rank
                </div>
              ) : (
                <div className="text-sm text-positive font-medium">Top rank!</div>
              )}
              {rival ? (
                <div className="text-xs text-text-muted">
                  {rival.gap} pts behind <span className="text-text-secondary font-medium">{rival.name}</span>
                </div>
              ) : commandCenter.bracket.rank === 1 ? (
                <div className="text-xs text-accent-text font-medium">You&apos;re on top</div>
              ) : null}
            </div>
          </div>

          {/* Tier Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Tier Progress</span>
              <span>{tierProgress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-bg-raised overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-transform duration-500"
                style={{ transform: `scaleX(${tierProgress / 100})`, transformOrigin: 'left' }}
              />
            </div>
            <div className="text-xs text-text-muted mt-1">
              {commandCenter.tier.next_tier
                ? `${commandCenter.tier.points_to_next} pts to ${commandCenter.tier.next_tier}`
                : 'Top tier reached'}
            </div>
          </div>
        </NeonCard>
      ) : null}

      {/* ── Section 2: Streak & Momentum Strip ── */}
      {commandCenter ? (
        <NeonCard hover={false} className="p-5">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Streak */}
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent-text" />
              <span className="font-mono text-lg font-bold text-text-primary">{commandCenter.streak.current_days}</span>
              <span className="text-xs text-text-muted">day streak</span>
            </div>

            <div className="h-6 w-px bg-border-subtle hidden sm:block" />

            {/* Shields */}
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">{commandCenter.streak.shields_available} shields</span>
            </div>

            <div className="h-6 w-px bg-border-subtle hidden sm:block" />

            {/* Velocity */}
            {projections ? (
              <div className="flex items-center gap-2">
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                <span className="text-sm font-mono text-text-secondary">{projections.avg_weekly_points} pts/week</span>
                <span className={`text-xs font-mono ${trendColor}`}>
                  {projections.trend === 'stable' ? '' : projections.trend === 'up' ? '+' : '-'}{Math.abs(projections.trend_pct)}%
                </span>
              </div>
            ) : null}

            {/* Submit CTA */}
            <button
              type="button"
              onClick={openSubmit}
              className="ml-auto px-4 py-2 rounded-lg bg-accent text-[var(--bg-base)] text-sm font-semibold hover:bg-accent-dim active:scale-[0.97] transition-[color,background-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              + Submit
            </button>
          </div>
        </NeonCard>
      ) : null}

      {/* ── Section 3: Missions & Power-Ups ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Missions */}
        <NeonCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-accent-text" />
            <h3 className="text-base font-semibold text-text-primary font-display">Active Missions</h3>
          </div>
          {quests.length === 0 ? (
            <div className="text-sm text-text-muted py-4">No active missions right now.</div>
          ) : (
            <div className="space-y-3">
              {quests.map((quest) => (
                <div key={quest.id} className="rounded-lg bg-bg-raised border border-border-default p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{quest.title}</span>
                    <span className="text-xs font-mono text-positive">+{quest.points_reward}</span>
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {quest.submission_status ? `Status: ${quest.submission_status}` : quest.can_submit ? 'Ready to complete' : 'Locked'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/quests" className="inline-block mt-3 text-xs text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
            View All Missions
          </Link>
        </NeonCard>

        {/* Power-Ups (Rewards) */}
        <NeonCard hover={false} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-4 h-4 text-accent-text" />
            <h3 className="text-base font-semibold text-text-primary font-display">Power-Ups</h3>
            {claimableRewards.length > 0 && (
              <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-[#08080a] text-[10px] font-bold">
                {claimableRewards.length}
              </span>
            )}
          </div>

          <div className="text-center py-3">
            <div className={`text-3xl font-mono font-bold ${totalClaimableSol > 0 ? 'text-positive' : 'text-text-tertiary'}`}>
              <AnimatedCounter value={totalClaimableSol} decimals={4} className={totalClaimableSol > 0 ? 'text-positive' : 'text-text-tertiary'} />
            </div>
            <div className="text-sm text-text-secondary mt-1">SOL claimable</div>
          </div>

          {projections ? (
            <div className="text-xs text-text-muted text-center mt-1">
              ~{projections.estimated_weekly_sol.toFixed(4)} SOL/week projected
            </div>
          ) : null}

          <Link href="/rewards" className="inline-block mt-3 text-xs text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
            View Reward History
          </Link>
        </NeonCard>
      </div>

      {/* ── Section 4: Recent Activity ── */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Your Recent Activity</h3>

        {mySubmissions.length === 0 ? (
          <NeonCard hover={false} className="p-8 border border-accent-border">
            <div className="text-center max-w-md mx-auto space-y-4">
              <p className="text-lg text-text-primary font-display">Your journey begins with a single contribution</p>
              <p className="text-sm text-text-secondary">Share your work with the community and start climbing the ranks.</p>
              <button
                type="button"
                onClick={openSubmit}
                className="inline-block bg-accent px-8 py-3 rounded-[var(--radius-sm)] font-semibold text-[var(--bg-base)] hover:bg-accent-dim active:scale-[0.97] transition-[color,background-color,transform,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Make Your First Submission
              </button>
            </div>
          </NeonCard>
        ) : (
          <div className="space-y-3">
            {mySubmissions.map((s) => {
              const t = typeLabels[s.type] || { label: 'Other', dotColor: 'bg-text-secondary' };
              return (
                <NeonCard key={s.id} hover={false} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{s.title}</div>
                      <div className="text-xs text-text-muted">
                        <span className={`inline-block w-2 h-2 rounded-full ${t.dotColor} mr-1.5 align-middle`} />
                        {t.label} | {new Date(s.created_at).toLocaleDateString()} |{' '}
                        {s.normalized_score ? `Score ${Math.round(s.normalized_score)}` : s.points_awarded > 0 ? 'Scored' : 'In review'}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold text-accent-text">{s.points_awarded} pts</div>
                  </div>
                </NeonCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Points Feed */}
      {pointsFeed.length > 0 ? (
        <NeonCard hover={false} className="p-5">
          <h3 className="text-base font-semibold text-text-primary mb-3 font-display">Why You Earned Points</h3>
          <div className="space-y-2.5">
            {pointsFeed.map((item) => (
              <div key={item.ledger_id} className="rounded-lg bg-bg-raised border border-border-default p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary font-medium">{item.reason_label}</span>
                  <span className="text-xs font-mono text-accent-text">{item.points >= 0 ? '+' : ''}{item.points}</span>
                </div>
                <div className="text-xs text-text-secondary mt-1">{item.explanation}</div>
              </div>
            ))}
          </div>
        </NeonCard>
      ) : null}

      {/* Community Feed CTA */}
      <Link href="/feed" className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
        <NeonCard className="p-5 group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary font-display group-hover:text-accent-text transition-[color]">Community Feed</h3>
              <p className="text-xs text-text-secondary mt-1">See what the community is building</p>
            </div>
            <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent-text transition-[color]" />
          </div>
        </NeonCard>
      </Link>
    </div>
  );
}
