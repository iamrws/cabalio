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

interface SeasonRow {
  id: string;
  name: string;
  theme: string;
  status: 'upcoming' | 'live' | 'ended';
  starts_at: string;
  ends_at: string;
  recap_ends_at: string;
  created_at: string;
}

type ReviewAction = 'approve' | 'reject' | 'flag';

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CabalCorePage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const [walletAddressInput, setWalletAddressInput] = useState('');
  const [pointsDeltaInput, setPointsDeltaInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');

  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [seasonMessage, setSeasonMessage] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [seasonTheme, setSeasonTheme] = useState('');
  const [seasonStatus, setSeasonStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [seasonStartsAt, setSeasonStartsAt] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [seasonEndsAt, setSeasonEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [seasonRecapEndsAt, setSeasonRecapEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 33 * 24 * 60 * 60 * 1000)));

  const [signalSeasonId, setSignalSeasonId] = useState('');
  const [signalActive, setSignalActive] = useState(true);
  const [signalStartsAt, setSignalStartsAt] = useState(toLocalInputValue(new Date()));
  const [signalEndsAt, setSignalEndsAt] = useState(toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [signalMultiplier, setSignalMultiplier] = useState('2');
  const [signalNote, setSignalNote] = useState('');
  const [signalBusy, setSignalBusy] = useState(false);
  const [signalMessage, setSignalMessage] = useState('');

  const [bossSeasonId, setBossSeasonId] = useState('');
  const [bossMetricKey, setBossMetricKey] = useState('helpful_actions');
  const [bossDelta, setBossDelta] = useState('10');
  const [bossCurrent, setBossCurrent] = useState('');
  const [bossTarget, setBossTarget] = useState('1000');
  const [bossIdempotency, setBossIdempotency] = useState(`boss-${Date.now()}`);
  const [bossBusy, setBossBusy] = useState(false);
  const [bossMessage, setBossMessage] = useState('');

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

  const loadSeasons = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/seasons', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load seasons');
      }
      const nextSeasons = data.seasons || [];
      setSeasons(nextSeasons);
      if (!signalSeasonId && nextSeasons.length > 0) {
        setSignalSeasonId(nextSeasons[0].id);
      }
      if (!bossSeasonId && nextSeasons.length > 0) {
        setBossSeasonId(nextSeasons[0].id);
      }
    } catch (seasonError) {
      setSeasonMessage(seasonError instanceof Error ? seasonError.message : 'Failed to load seasons');
    }
  }, [bossSeasonId, signalSeasonId]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    void loadSeasons();
  }, [loadSeasons]);

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

  const handleManualAdjustment = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdjustmentMessage('');

    const parsedDelta = Number(pointsDeltaInput);
    if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
      setAdjustmentMessage('Points delta must be a non-zero number.');
      return;
    }

    setAdjusting(true);
    try {
      const response = await fetch('/api/admin/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddressInput.trim(),
          points_delta: parsedDelta,
          note: noteInput.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Manual adjustment failed');
      }

      setWalletAddressInput('');
      setPointsDeltaInput('');
      setNoteInput('');
      setAdjustmentMessage(`Applied ${parsedDelta >= 0 ? '+' : ''}${parsedDelta} points.`);
    } catch (adjustError) {
      setAdjustmentMessage(adjustError instanceof Error ? adjustError.message : 'Manual adjustment failed');
    } finally {
      setAdjusting(false);
    }
  }, [noteInput, pointsDeltaInput, walletAddressInput]);

  const handleCreateSeason = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSeasonMessage('');
    setCreatingSeason(true);

    try {
      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: seasonName,
          theme: seasonTheme,
          status: seasonStatus,
          starts_at: new Date(seasonStartsAt).toISOString(),
          ends_at: new Date(seasonEndsAt).toISOString(),
          recap_ends_at: new Date(seasonRecapEndsAt).toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create season');
      }

      setSeasonMessage(`Season created: ${data.season.name}`);
      setSeasonName('');
      setSeasonTheme('');
      await loadSeasons();
    } catch (createError) {
      setSeasonMessage(createError instanceof Error ? createError.message : 'Failed to create season');
    } finally {
      setCreatingSeason(false);
    }
  }, [loadSeasons, seasonEndsAt, seasonName, seasonRecapEndsAt, seasonStartsAt, seasonStatus, seasonTheme]);

  const handleSignalStorm = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignalMessage('');

    if (!signalSeasonId) {
      setSignalMessage('Select a season first.');
      return;
    }

    setSignalBusy(true);
    try {
      const response = await fetch(`/api/admin/seasons/${signalSeasonId}/signal-storm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: signalActive,
          starts_at: signalActive ? new Date(signalStartsAt).toISOString() : undefined,
          ends_at: signalActive ? new Date(signalEndsAt).toISOString() : undefined,
          multiplier: signalActive ? Number(signalMultiplier) : undefined,
          note: signalNote || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update signal storm');
      }

      setSignalMessage(signalActive ? 'Signal storm opened.' : `Signal storm closed (${data.closed_count || 0} event(s)).`);
    } catch (stormError) {
      setSignalMessage(stormError instanceof Error ? stormError.message : 'Failed to update signal storm');
    } finally {
      setSignalBusy(false);
    }
  }, [signalActive, signalEndsAt, signalMultiplier, signalNote, signalSeasonId, signalStartsAt]);

  const handleBossProgress = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBossMessage('');

    if (!bossSeasonId) {
      setBossMessage('Select a season first.');
      return;
    }

    setBossBusy(true);
    try {
      const payload: Record<string, unknown> = {
        metric_key: bossMetricKey,
        idempotency_key: bossIdempotency,
      };

      if (bossDelta.trim()) payload.delta_value = Number(bossDelta);
      if (bossCurrent.trim()) payload.current_value = Number(bossCurrent);
      if (bossTarget.trim()) payload.target_value = Number(bossTarget);

      const response = await fetch(`/api/admin/seasons/${bossSeasonId}/world-boss/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update world boss progress');
      }

      setBossMessage(`World boss updated. Current value: ${data.progress?.current_value ?? 'n/a'}`);
      setBossIdempotency(`boss-${Date.now()}`);
    } catch (bossError) {
      setBossMessage(bossError instanceof Error ? bossError.message : 'Failed to update world boss progress');
    } finally {
      setBossBusy(false);
    }
  }, [bossCurrent, bossDelta, bossIdempotency, bossMetricKey, bossSeasonId, bossTarget]);

  const statusCount = useMemo(() => submissions.length, [submissions]);

  return (
    <main className="min-h-screen bg-bg-base p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cabal Core</h1>
            <p className="text-sm text-text-secondary">Private moderation and points operations portal</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:text-text-primary"
            >
              Back to App
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-lg border border-[rgba(59,130,246,0.15)] bg-accent-muted px-3 py-2 text-xs text-accent-text"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        <NeonCard hover={false} className="p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Manual Points Distribution</h2>
          <form onSubmit={handleManualAdjustment} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={walletAddressInput}
              onChange={(event) => setWalletAddressInput(event.target.value)}
              placeholder="Wallet address"
              required
              className="md:col-span-2 rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <input
              value={pointsDeltaInput}
              onChange={(event) => setPointsDeltaInput(event.target.value)}
              placeholder="Points (+/-)"
              required
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <input
              value={noteInput}
              onChange={(event) => setNoteInput(event.target.value)}
              placeholder="Reason / note"
              required
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="submit"
              disabled={adjusting}
              className="md:col-span-4 rounded-lg bg-accent-muted border border-[rgba(59,130,246,0.15)] px-3 py-2 text-sm text-accent-text font-medium disabled:opacity-60"
            >
              {adjusting ? 'Applying points...' : 'Apply Manual Adjustment'}
            </button>
          </form>
          {adjustmentMessage ? <div className="mt-3 text-xs text-text-secondary">{adjustmentMessage}</div> : null}
        </NeonCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NeonCard hover={false} className="p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Create Season</h2>
            <form onSubmit={handleCreateSeason} className="space-y-3">
              <input
                value={seasonName}
                onChange={(event) => setSeasonName(event.target.value)}
                placeholder="Season name"
                required
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              />
              <input
                value={seasonTheme}
                onChange={(event) => setSeasonTheme(event.target.value)}
                placeholder="Theme"
                required
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              />
              <select
                value={seasonStatus}
                onChange={(event) => setSeasonStatus(event.target.value as 'upcoming' | 'live' | 'ended')}
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              >
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="ended">ended</option>
              </select>
              <label className="text-xs text-text-muted block">
                Starts At
                <input
                  type="datetime-local"
                  value={seasonStartsAt}
                  onChange={(event) => setSeasonStartsAt(event.target.value)}
                  className="w-full mt-1 rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
                />
              </label>
              <label className="text-xs text-text-muted block">
                Ends At
                <input
                  type="datetime-local"
                  value={seasonEndsAt}
                  onChange={(event) => setSeasonEndsAt(event.target.value)}
                  className="w-full mt-1 rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
                />
              </label>
              <label className="text-xs text-text-muted block">
                Recap Ends At
                <input
                  type="datetime-local"
                  value={seasonRecapEndsAt}
                  onChange={(event) => setSeasonRecapEndsAt(event.target.value)}
                  className="w-full mt-1 rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
                />
              </label>
              <button
                type="submit"
                disabled={creatingSeason}
                className="w-full rounded-lg bg-accent-muted border border-[rgba(59,130,246,0.15)] px-3 py-2 text-sm text-accent-text disabled:opacity-60"
              >
                {creatingSeason ? 'Creating season...' : 'Create Season'}
              </button>
            </form>
            {seasonMessage ? <div className="mt-3 text-xs text-text-secondary">{seasonMessage}</div> : null}
          </NeonCard>

          <NeonCard hover={false} className="p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Signal Storm Control</h2>
            <form onSubmit={handleSignalStorm} className="space-y-3">
              <select
                value={signalSeasonId}
                onChange={(event) => setSignalSeasonId(event.target.value)}
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              >
                <option value="">Select season</option>
                {seasons.map((seasonRow) => (
                  <option key={seasonRow.id} value={seasonRow.id}>
                    {seasonRow.name} ({seasonRow.status})
                  </option>
                ))}
              </select>
              <select
                value={signalActive ? 'open' : 'close'}
                onChange={(event) => setSignalActive(event.target.value === 'open')}
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              >
                <option value="open">Open signal storm</option>
                <option value="close">Close signal storm</option>
              </select>
              <label className="text-xs text-text-muted block">
                Starts At
                <input
                  type="datetime-local"
                  value={signalStartsAt}
                  onChange={(event) => setSignalStartsAt(event.target.value)}
                  className="w-full mt-1 rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
                  disabled={!signalActive}
                />
              </label>
              <label className="text-xs text-text-muted block">
                Ends At
                <input
                  type="datetime-local"
                  value={signalEndsAt}
                  onChange={(event) => setSignalEndsAt(event.target.value)}
                  className="w-full mt-1 rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
                  disabled={!signalActive}
                />
              </label>
              <input
                value={signalMultiplier}
                onChange={(event) => setSignalMultiplier(event.target.value)}
                placeholder="Multiplier (e.g. 2)"
                disabled={!signalActive}
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              />
              <input
                value={signalNote}
                onChange={(event) => setSignalNote(event.target.value)}
                placeholder="Optional note"
                className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
              />
              <button
                type="submit"
                disabled={signalBusy}
                className="w-full rounded-lg bg-caution-muted border border-[rgba(234,179,8,0.12)] px-3 py-2 text-sm text-caution disabled:opacity-60"
              >
                {signalBusy ? 'Updating...' : 'Apply Signal Storm Action'}
              </button>
            </form>
            {signalMessage ? <div className="mt-3 text-xs text-text-secondary">{signalMessage}</div> : null}
          </NeonCard>
        </div>

        <NeonCard hover={false} className="p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3">World Boss Progress</h2>
          <form onSubmit={handleBossProgress} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={bossSeasonId}
              onChange={(event) => setBossSeasonId(event.target.value)}
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select season</option>
              {seasons.map((seasonRow) => (
                <option key={seasonRow.id} value={seasonRow.id}>
                  {seasonRow.name} ({seasonRow.status})
                </option>
              ))}
            </select>
            <input
              value={bossMetricKey}
              onChange={(event) => setBossMetricKey(event.target.value)}
              placeholder="Metric key"
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <input
              value={bossIdempotency}
              onChange={(event) => setBossIdempotency(event.target.value)}
              placeholder="Idempotency key"
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <input
              value={bossDelta}
              onChange={(event) => setBossDelta(event.target.value)}
              placeholder="Delta value"
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <input
              value={bossCurrent}
              onChange={(event) => setBossCurrent(event.target.value)}
              placeholder="Current value (optional)"
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <input
              value={bossTarget}
              onChange={(event) => setBossTarget(event.target.value)}
              placeholder="Target value"
              className="rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="submit"
              disabled={bossBusy}
              className="md:col-span-3 rounded-lg bg-positive-muted border border-[rgba(34,197,94,0.12)] px-3 py-2 text-sm text-positive disabled:opacity-60"
            >
              {bossBusy ? 'Updating boss progress...' : 'Apply Boss Progress Update'}
            </button>
          </form>
          {bossMessage ? <div className="mt-3 text-xs text-text-secondary">{bossMessage}</div> : null}
        </NeonCard>

        <NeonCard hover={false} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {['submitted', 'approved', 'rejected', 'flagged', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  statusFilter === status
                    ? 'bg-accent-muted border-[rgba(59,130,246,0.15)] text-accent-text'
                    : 'bg-bg-raised border-border-subtle text-text-secondary'
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
                    {submission.type} | {new Date(submission.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-wider text-accent-text font-mono">
                  {submission.status}
                </div>
              </div>

              {submission.url ? (
                <a
                  href={submission.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent-text underline"
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
                    className="rounded-lg bg-positive-muted border border-[rgba(34,197,94,0.12)] text-positive px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    Approve + Score
                  </button>
                  <button
                    onClick={() => handleReview(submission.id, 'flag')}
                    disabled={processingId === submission.id}
                    className="rounded-lg bg-caution-muted border border-[rgba(234,179,8,0.12)] text-caution px-3 py-1.5 text-xs disabled:opacity-60"
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
