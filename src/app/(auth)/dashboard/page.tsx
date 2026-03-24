'use client';

import { useEffect, useMemo, useState } from 'react';
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

const typeIcons: Record<string, { icon: string; label: string; color: string }> = {
  x_post: { icon: '📢', label: 'Jito Content', color: 'text-neon-cyan' },
  blog: { icon: '📝', label: 'Blog', color: 'text-neon-purple' },
  art: { icon: '🎨', label: 'Art', color: 'text-neon-orange' },
};

export default function DashboardPage() {
  const [communitySubmissions, setCommunitySubmissions] = useState<SubmissionRow[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionRow[]>([]);
  const [myWeeklyPoints, setMyWeeklyPoints] = useState(0);
  const [myTotalPoints, setMyTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [communityResponse, mineResponse, summaryResponse] = await Promise.all([
          fetch('/api/submissions?limit=15', { cache: 'no-store' }),
          fetch('/api/submissions?scope=mine&limit=50', { cache: 'no-store' }),
          fetch('/api/me/summary', { cache: 'no-store' }),
        ]);

        const communityData = await communityResponse.json();
        const mineData = await mineResponse.json();
        const summaryData = await summaryResponse.json();

        if (!communityResponse.ok) {
          throw new Error(communityData.error || 'Failed to load community feed');
        }
        if (!mineResponse.ok) {
          throw new Error(mineData.error || 'Failed to load your submissions');
        }
        if (!summaryResponse.ok) {
          throw new Error(summaryData.error || 'Failed to load your points summary');
        }

        if (!cancelled) {
          setCommunitySubmissions(communityData.submissions || []);
          setMySubmissions(mineData.submissions || []);
          setMyWeeklyPoints(summaryData.stats?.weekly_points || 0);
          setMyTotalPoints(summaryData.stats?.total_points || 0);
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

  const approvedCount = useMemo(
    () => mySubmissions.filter((submission) => submission.points_awarded > 0).length,
    [mySubmissions]
  );
  const pendingCount = useMemo(
    () => mySubmissions.filter((submission) => submission.points_awarded === 0).length,
    [mySubmissions]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Dashboard</h2>
          <p className="text-text-secondary text-sm">Holder-only community activity and review status</p>
        </div>
        <Link href="/submit">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="gradient-bg px-6 py-3 rounded-xl font-semibold text-white shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 transition-shadow"
          >
            + Submit Content
          </motion.button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-text-primary">{mySubmissions.length}</div>
          <div className="text-xs text-text-muted">Your Submissions</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-neon-green">{approvedCount}</div>
          <div className="text-xs text-text-muted">Approved</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-neon-orange">{pendingCount}</div>
          <div className="text-xs text-text-muted">In Review</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <PointsBadge points={myWeeklyPoints} size="sm" />
          <div className="text-xs text-text-muted mt-2">Points Earned</div>
        </NeonCard>
        <NeonCard hover={false} className="p-4 text-center">
          <div className="text-lg font-mono font-bold text-neon-cyan">{myTotalPoints}</div>
          <div className="text-xs text-text-muted mt-2">Total Points</div>
        </NeonCard>
      </div>

      {error ? (
        <NeonCard hover={false} className="p-4 border border-red-500/30">
          <div className="text-sm text-red-400">{error}</div>
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
                    {typeIcons[submission.type].label} · {new Date(submission.created_at).toLocaleDateString()} · {submission.normalized_score ? `Score ${Math.round(submission.normalized_score)}` : submission.points_awarded > 0 ? 'Scored' : 'In review'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-neon-cyan">{submission.points_awarded} pts</div>
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
                      <span className={typeIcons[submission.type].color}>{typeIcons[submission.type].icon}</span>
                      <span>{typeIcons[submission.type].label}</span>
                      <span>·</span>
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
