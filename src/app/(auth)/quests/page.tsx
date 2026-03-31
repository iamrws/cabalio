'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import NeonCard from '@/components/shared/NeonCard';

interface SeasonRole {
  id: string;
  role_key: string;
  title: string;
  description: string;
}

interface SeasonSummary {
  id: string;
  name: string;
  theme: string;
  status: 'upcoming' | 'live' | 'ended';
  starts_at: string;
  ends_at: string;
  recap_ends_at: string;
}

interface MemberState {
  role_key: string | null;
  opt_out: boolean;
}

interface SeasonQuest {
  id: string;
  role_key: string | null;
  title: string;
  rules: Record<string, unknown>;
  points_reward: number;
  starts_at: string;
  ends_at: string;
  can_submit: boolean;
  submission_status: 'submitted' | 'approved' | 'rejected' | 'flagged' | null;
}

const evidenceTypeLabels: Record<string, string> = {
  submission_id: 'Submission ID',
  url: 'URL',
  text: 'Text',
  none: 'No Evidence',
};

export default function QuestsPage() {
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [roles, setRoles] = useState<SeasonRole[]>([]);
  const [memberState, setMemberState] = useState<MemberState | null>(null);
  const [quests, setQuests] = useState<SeasonQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyRole, setBusyRole] = useState(false);
  const [busyOptOut, setBusyOptOut] = useState(false);
  const [questSubmittingId, setQuestSubmittingId] = useState<string | null>(null);
  const [evidenceByQuest, setEvidenceByQuest] = useState<Record<string, { evidence_type: string; evidence_id: string }>>({});

  const loadSeasonData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const currentResponse = await fetch('/api/seasons/current', { cache: 'no-store' });
      const currentData = await currentResponse.json();

      if (!currentResponse.ok) {
        throw new Error(currentData.error || 'Failed to load season');
      }

      setSeason(currentData.season || null);
      setRoles(currentData.roles || []);
      setMemberState(currentData.member_state || null);

      if (currentData.season?.status === 'live') {
        const questResponse = await fetch('/api/seasons/current/quests', { cache: 'no-store' });
        const questData = await questResponse.json();

        if (!questResponse.ok) {
          throw new Error(questData.error || 'Failed to load season quests');
        }

        setQuests(questData.quests || []);
        if (questData.member_state) {
          setMemberState(questData.member_state);
        }
      } else {
        setQuests([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSeasonData();
  }, [loadSeasonData]);

  const daysRemaining = useMemo(() => {
    if (!season?.ends_at) return null;
    const diff = new Date(season.ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [season?.ends_at]);

  const handleRoleSelect = useCallback(async (roleKey: string) => {
    setBusyRole(true);
    setError('');

    try {
      const response = await fetch('/api/seasons/current/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleKey }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set role');
      }

      await loadSeasonData();
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Failed to set role');
    } finally {
      setBusyRole(false);
    }
  }, [loadSeasonData]);

  const handleOptOutToggle = useCallback(async (nextOptOut: boolean) => {
    setBusyOptOut(true);
    setError('');

    try {
      const response = await fetch('/api/seasons/current/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opt_out: nextOptOut }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update opt-out preference');
      }

      setMemberState(data.member_state || null);
    } catch (optError) {
      setError(optError instanceof Error ? optError.message : 'Failed to update opt-out');
    } finally {
      setBusyOptOut(false);
    }
  }, []);

  const handleQuestSubmit = useCallback(async (questId: string) => {
    const evidence = evidenceByQuest[questId] || { evidence_type: 'none', evidence_id: '' };
    setQuestSubmittingId(questId);
    setError('');

    try {
      const response = await fetch(`/api/seasons/current/quests/${questId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_type: evidence.evidence_type,
          evidence_id: evidence.evidence_id.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quest evidence');
      }

      await loadSeasonData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit quest evidence');
    } finally {
      setQuestSubmittingId(null);
    }
  }, [evidenceByQuest, loadSeasonData]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary font-display">Season Quests</h2>
          <p className="text-sm text-text-secondary">Live role-based quests and collaborative milestones</p>
        </div>
        {season ? (
          <div className="text-right text-sm text-text-muted font-mono">
            <div>{season.name}</div>
            <div>{season.theme}</div>
            {typeof daysRemaining === 'number' ? <div>{daysRemaining} days remaining</div> : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <NeonCard hover={false} className="p-4 border border-negative-border">
          <div className="text-sm text-negative">{error}</div>
        </NeonCard>
      ) : null}

      {loading ? (
        <NeonCard hover={false} className="p-4">
          <div className="text-sm text-text-muted">Loading season data...</div>
        </NeonCard>
      ) : null}

      {!loading && !season ? (
        <NeonCard hover={false} className="p-5">
          <div className="text-sm text-text-muted">No active or upcoming season found yet.</div>
        </NeonCard>
      ) : null}

      {season ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NeonCard hover={false} className="p-5">
            <h3 className="text-base font-semibold text-text-primary mb-3">Role Path</h3>
            <div className="space-y-2">
              {roles.map((role) => {
                const active = memberState?.role_key === role.role_key;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.role_key)}
                    disabled={busyRole || season.status !== 'live'}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                      active
                        ? 'border-accent-border bg-accent-muted text-accent-text'
                        : 'border-border-subtle bg-bg-raised text-text-secondary'
                    }`}
                  >
                    <div className="text-sm font-medium">{role.title}</div>
                    <div className="text-xs mt-1">{role.description}</div>
                  </button>
                );
              })}
            </div>
          </NeonCard>

          <NeonCard hover={false} className="p-5">
            <h3 className="text-base font-semibold text-text-primary mb-3">Season Preferences</h3>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-bg-raised border border-border-subtle p-3">
                <div className="text-text-primary">Current Role</div>
                <div className="text-text-secondary mt-1">{memberState?.role_key || 'No role selected yet'}</div>
              </div>
              <button
                type="button"
                onClick={() => handleOptOutToggle(!(memberState?.opt_out || false))}
                disabled={busyOptOut || season.status !== 'live'}
                className="rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-accent-text text-xs"
              >
                {memberState?.opt_out ? 'Disable calm mode (opt back in)' : 'Enable calm mode (opt out)'}
              </button>
              <div className="text-xs text-text-muted">
                Calm mode suppresses high-urgency prompts and surprise event pressure.
              </div>
            </div>
          </NeonCard>
        </div>
      ) : null}

      {season?.status === 'live' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quests.length === 0 ? (
            <NeonCard hover={false} className="p-5 md:col-span-2">
              <div className="text-sm text-text-muted">No live quests available for your current role yet.</div>
            </NeonCard>
          ) : null}

          {quests.map((quest) => {
            const evidence = evidenceByQuest[quest.id] || { evidence_type: 'none', evidence_id: '' };
            return (
              <div key={quest.id}>
                <NeonCard className="p-5 h-full flex flex-col" hover={false}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-text-primary">{quest.title}</div>
                    <div className="text-xs font-mono text-positive">+{quest.points_reward} pts</div>
                  </div>
                  <div className="text-xs text-text-muted mb-3">
                    {quest.role_key ? `Role: ${quest.role_key}` : 'Role-agnostic quest'}
                  </div>

                  <div className="text-xs text-text-secondary mb-4">
                    Window: {new Date(quest.starts_at).toLocaleString()} - {new Date(quest.ends_at).toLocaleString()}
                  </div>

                  <div className="space-y-2 mt-auto">
                    <select
                      aria-label="Evidence type"
                      value={evidence.evidence_type}
                      onChange={(event) =>
                        setEvidenceByQuest((prev) => ({
                          ...prev,
                          [quest.id]: {
                            ...evidence,
                            evidence_type: event.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-xs text-text-primary"
                    >
                      {Object.entries(evidenceTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input
                      aria-label="Evidence ID"
                      value={evidence.evidence_id}
                      onChange={(event) =>
                        setEvidenceByQuest((prev) => ({
                          ...prev,
                          [quest.id]: {
                            ...evidence,
                            evidence_id: event.target.value,
                          },
                        }))
                      }
                      placeholder="Evidence ID (optional for No Evidence)"
                      className="w-full rounded-lg bg-bg-raised border border-border-subtle px-3 py-2 text-xs text-text-primary"
                    />

                    <button
                      type="button"
                      onClick={() => handleQuestSubmit(quest.id)}
                      disabled={!quest.can_submit || questSubmittingId === quest.id}
                      className="w-full rounded-lg bg-accent-muted border border-accent-border px-3 py-2 text-xs text-accent-text disabled:opacity-50"
                    >
                      {questSubmittingId === quest.id
                        ? 'Submitting...'
                        : quest.can_submit
                          ? 'Submit Quest Evidence'
                          : `Status: ${quest.submission_status || 'locked'}`}
                    </button>
                  </div>
                </NeonCard>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
