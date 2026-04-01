'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import NeonCard from '@/components/shared/NeonCard';
import PointsBadge from '@/components/shared/PointsBadge';
import { CardSkeleton } from '@/components/shared/LoadingSkeleton';
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

const typeIcons: Record<string, { label: string; color: string; dotColor: string }> = {
  x_post: { label: 'Jito Content', color: 'text-accent-text', dotColor: 'bg-[var(--accent)]' },
  blog: { label: 'Blog', color: 'text-accent-text', dotColor: 'bg-[var(--positive)]' },
  art: { label: 'Art', color: 'text-caution', dotColor: 'bg-[var(--caution)]' },
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

export default function FeedPage() {
  const [communitySubmissions, setCommunitySubmissions] = useState<SubmissionRow[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/submissions?limit=25', { cache: 'no-store' });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load community feed');
        if (!cancelled) {
          setCommunitySubmissions(d.submissions || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load feed');
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

  // Fetch reactions for community submissions in a single batch request
  useEffect(() => {
    if (communitySubmissions.length === 0) return;
    let cancelled = false;

    const fetchReactions = async () => {
      const ids = communitySubmissions.map((s) => s.id).join(',');
      try {
        const res = await fetch(`/api/submissions/reactions/batch?ids=${ids}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const body = await res.json();
        if (cancelled) return;
        setReactions(body.reactions || {});
      } catch {
        // Silently fail — reaction counts are non-critical
      }
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* --- Page Header --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display">Community Feed</h2>
          <p className="text-text-secondary text-sm">Discover what the community is building</p>
        </div>
        <Link href="/submit" className="inline-block bg-accent px-6 py-3 rounded-[var(--radius-sm)] font-semibold text-[#08080a] transition-colors hover:bg-accent-dim">
          + Submit Content
        </Link>
      </div>

      {/* --- Search --- */}
      <SearchBar />

      {/* --- Error State --- */}
      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      {/* --- Loading State --- */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}

      {/* --- Community Feed with Reactions --- */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4 font-display">Community Feed</h3>
        <div className="space-y-4">
          {!loading && communitySubmissions.length === 0 ? (
            <NeonCard hover={false} className="p-4">
              <div className="text-sm text-text-muted">No approved submissions yet.</div>
            </NeonCard>
          ) : null}

          {communitySubmissions.map((submission) => {
            const typeInfo = typeIcons[submission.type] || fallbackTypeIcon;
            return (
              <div key={submission.id}>
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

                  <h4 className="text-base font-semibold text-text-primary mb-1 font-display">{submission.title}</h4>
                  <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">{submission.content_text}</p>

                  <ReactionBar
                    submissionId={submission.id}
                    data={reactions[submission.id]}
                    onToggle={handleReactionToggle}
                  />
                </NeonCard>
              </div>
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
