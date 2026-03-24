'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import NeonCard from '@/components/shared/NeonCard';

interface SubmissionRow {
  id: string;
  wallet_address: string;
  type: string;
  title: string;
  content_text: string;
  url: string | null;
  status: string;
  created_at: string;
  users?: {
    display_name: string | null;
  } | null;
}

type ReviewAction = 'approve' | 'reject' | 'flag';

export default function CabalCorePage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/submissions?status=${statusFilter}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load submissions');
      }
      setSubmissions(data.submissions || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const handleReview = useCallback(async (submissionId: string, action: ReviewAction) => {
    setProcessingId(submissionId);
    setError('');
    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Review action failed');
      }
      await loadSubmissions();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Action failed');
    } finally {
      setProcessingId(null);
    }
  }, [loadSubmissions]);

  const statusCount = useMemo(() => submissions.length, [submissions]);

  return (
    <main className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cabal Core</h1>
            <p className="text-sm text-text-secondary">Private moderation and points review portal</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:text-text-primary"
            >
              Back to App
            </Link>
          </div>
        </div>

        <NeonCard hover={false} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {['submitted', 'approved', 'rejected', 'flagged', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  statusFilter === status
                    ? 'bg-neon-cyan/15 border-neon-cyan/40 text-neon-cyan'
                    : 'bg-bg-tertiary border-border-subtle text-text-secondary'
                }`}
              >
                {status}
              </button>
            ))}
            <span className="ml-auto text-xs text-text-muted font-mono">{statusCount} items</span>
          </div>
        </NeonCard>

        {error ? (
          <NeonCard hover={false} className="p-4 border border-red-500/30">
            <div className="text-sm text-red-400">{error}</div>
          </NeonCard>
        ) : null}

        {loading ? (
          <NeonCard hover={false} className="p-5">
            <div className="text-sm text-text-muted">Loading moderation queue...</div>
          </NeonCard>
        ) : null}

        {!loading && submissions.length === 0 ? (
          <NeonCard hover={false} className="p-5">
            <div className="text-sm text-text-muted">No submissions in this queue.</div>
          </NeonCard>
        ) : null}

        <div className="space-y-4">
          {submissions.map((submission) => (
            <NeonCard key={submission.id} hover={false} className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="text-xs text-text-muted font-mono mb-1">
                    {submission.users?.display_name || submission.wallet_address}
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">{submission.title}</h2>
                  <div className="text-xs text-text-muted mt-1">
                    {submission.type} · {new Date(submission.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-wider text-neon-cyan font-mono">
                  {submission.status}
                </div>
              </div>

              {submission.url ? (
                <a
                  href={submission.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neon-cyan underline"
                >
                  {submission.url}
                </a>
              ) : null}

              <p className="text-sm text-text-secondary whitespace-pre-wrap">{submission.content_text}</p>

              {submission.status === 'submitted' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleReview(submission.id, 'approve')}
                    disabled={processingId === submission.id}
                    className="rounded-lg bg-neon-green/15 border border-neon-green/40 text-neon-green px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    Approve + Score
                  </button>
                  <button
                    onClick={() => handleReview(submission.id, 'flag')}
                    disabled={processingId === submission.id}
                    className="rounded-lg bg-neon-orange/15 border border-neon-orange/40 text-neon-orange px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    Flag
                  </button>
                  <button
                    onClick={() => handleReview(submission.id, 'reject')}
                    disabled={processingId === submission.id}
                    className="rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </NeonCard>
          ))}
        </div>
      </div>
    </main>
  );
}
