'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, CircleCheckBig } from 'lucide-react';

import NeonCard from '@/components/shared/NeonCard';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Preferences {
  notifications: {
    submissions: boolean;
    points: boolean;
    quests: boolean;
    system: boolean;
  };
  privacy: {
    public_profile: boolean;
  };
  theme: 'dark' | 'light';
}

interface UserProfile {
  wallet_address: string;
  display_name: string | null;
  is_holder: boolean;
  holder_verified_at: string | null;
  level: number;
  total_xp: number;
  created_at?: string;
}

interface AccountStats {
  total_submissions: number;
  total_points: number;
}

const DEFAULT_PREFS: Preferences = {
  notifications: { submissions: true, points: true, quests: true, system: true },
  privacy: { public_profile: true },
  theme: 'dark',
};

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                     */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-text-primary text-sm font-medium block">{label}</span>
        {description && (
          <span className="text-text-secondary text-xs mt-0.5 block">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
          transition-[background-color] duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
          ${checked ? 'bg-accent' : 'bg-bg-raised'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-[var(--text-primary)] shadow-lg
            transform transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Feedback                                                   */
/* ------------------------------------------------------------------ */

function InlineFeedback({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <p
      className={`text-xs mt-1 animate-in fade-in ${type === 'success' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}
    >
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-bg-surface rounded-2xl border border-border-default p-6 h-40" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<AccountStats>({ total_submissions: 0, total_points: 0 });
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [nameFeedback, setNameFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const nameTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settingsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---------- Fetch all data on mount ---------- */

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, profileRes, summaryRes] = await Promise.all([
          fetch('/api/me/settings'),
          fetch('/api/me/profile'),
          fetch('/api/me/summary'),
        ]);

        if (settingsRes.ok) {
          const { preferences } = await settingsRes.json();
          setPrefs(preferences);
        }

        if (profileRes.ok) {
          const { user } = await profileRes.json();
          setProfile(user);
          setDisplayName(user.display_name || '');
        }

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setStats({
            total_submissions: data.total_submissions ?? data.submissions_count ?? 0,
            total_points: data.total_points ?? data.points_earned ?? 0,
          });
        }
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ---------- Save preferences (optimistic) ---------- */

  const savePrefs = useCallback(
    async (updated: Preferences) => {
      // Optimistic: apply immediately
      setPrefs(updated);
      clearTimeout(settingsTimeout.current);

      try {
        const res = await fetch('/api/me/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });

        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'Save failed' }));
          setSettingsFeedback({ msg: error, type: 'error' });
          // Revert would require storing old state; for now show error
        } else {
          setSettingsFeedback({ msg: 'Saved', type: 'success' });
        }
      } catch {
        setSettingsFeedback({ msg: 'Network error', type: 'error' });
      }

      settingsTimeout.current = setTimeout(() => setSettingsFeedback(null), 2500);
    },
    []
  );

  const toggleNotification = useCallback(
    (key: keyof Preferences['notifications']) => {
      const updated = {
        ...prefs,
        notifications: { ...prefs.notifications, [key]: !prefs.notifications[key] },
      };
      savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  const togglePrivacy = useCallback(
    (key: keyof Preferences['privacy']) => {
      const updated = {
        ...prefs,
        privacy: { ...prefs.privacy, [key]: !prefs.privacy[key] },
      };
      savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  /* ---------- Save display name ---------- */

  const saveDisplayName = useCallback(async () => {
    clearTimeout(nameTimeout.current);
    setNameFeedback(null);

    const trimmed = displayName.trim();
    if (!trimmed || trimmed === profile?.display_name) return;

    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: trimmed }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Save failed' }));
        setNameFeedback({ msg: error, type: 'error' });
      } else {
        const { user } = await res.json();
        setProfile(user);
        setNameFeedback({ msg: 'Name updated', type: 'success' });
      }
    } catch {
      setNameFeedback({ msg: 'Network error', type: 'error' });
    }

    nameTimeout.current = setTimeout(() => setNameFeedback(null), 3000);
  }, [displayName, profile]);

  /* ---------- Copy wallet ---------- */

  const copyWallet = useCallback(() => {
    if (!profile?.wallet_address) return;
    navigator.clipboard.writeText(profile.wallet_address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [profile]);

  /* ---------- Format helpers ---------- */

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const shortWallet = profile?.wallet_address
    ? `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`
    : '';

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl text-text-primary mb-6">Settings</h1>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl text-text-primary mb-6">Settings</h1>

      <div className="space-y-6">
        {/* ============ Profile ============ */}
        <NeonCard hover={false} className="p-6">
          <h2 className="font-display text-lg text-text-primary mb-4">Profile</h2>

          {/* Display name */}
          <div className="mb-4">
            <label htmlFor="display-name" className="text-text-secondary text-xs uppercase tracking-wider mb-1.5 block">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                id="display-name"
                type="text"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={saveDisplayName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveDisplayName();
                }}
                className="flex-1 bg-bg-raised border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent transition-[border-color]"
                placeholder="Enter display name"
              />
              <button
                onClick={saveDisplayName}
                className="px-4 py-2 bg-accent/20 text-accent-text text-sm font-medium rounded-lg border border-accent-border hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.97] transition-[background-color,border-color]"
              >
                Save
              </button>
            </div>
            {nameFeedback && <InlineFeedback message={nameFeedback.msg} type={nameFeedback.type} />}
          </div>

          {/* Wallet address */}
          <div className="mb-4">
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-1.5 block">
              Wallet Address
            </label>
            <div className="flex items-center gap-2">
              <span className="bg-bg-raised border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-secondary font-mono flex-1 truncate">
                {shortWallet}
              </span>
              <button
                onClick={copyWallet}
                className="px-3 py-2 bg-bg-raised border border-border-subtle rounded-lg text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.97] transition-[color]"
                title="Copy wallet address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[var(--positive)]" />
                ) : (
                  <ClipboardCopy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Holder status */}
          <div>
            <label className="text-text-secondary text-xs uppercase tracking-wider mb-1.5 block">
              Holder Status
            </label>
            {profile?.is_holder ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent-text text-sm font-medium rounded-full">
                <CircleCheckBig className="w-4 h-4" />
                Verified Holder
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-bg-raised text-text-secondary text-sm rounded-full">
                Not verified
              </span>
            )}
          </div>
        </NeonCard>

        {/* ============ Notifications ============ */}
        <NeonCard hover={false} className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-lg text-text-primary">Notifications</h2>
            {settingsFeedback && (
              <InlineFeedback message={settingsFeedback.msg} type={settingsFeedback.type} />
            )}
          </div>
          <div className="divide-y divide-border-subtle">
            <ToggleSwitch
              checked={prefs.notifications.submissions}
              onChange={() => toggleNotification('submissions')}
              label="Submission updates"
              description="When your submissions are scored or reviewed"
            />
            <ToggleSwitch
              checked={prefs.notifications.points}
              onChange={() => toggleNotification('points')}
              label="Points & rewards"
              description="Points earned, rewards available, and leaderboard changes"
            />
            <ToggleSwitch
              checked={prefs.notifications.quests}
              onChange={() => toggleNotification('quests')}
              label="Quest updates"
              description="New quests, progress milestones, and completions"
            />
            <ToggleSwitch
              checked={prefs.notifications.system}
              onChange={() => toggleNotification('system')}
              label="System announcements"
              description="Platform updates and important notices"
            />
          </div>
        </NeonCard>

        {/* ============ Privacy ============ */}
        <NeonCard hover={false} className="p-6">
          <h2 className="font-display text-lg text-text-primary mb-2">Privacy</h2>
          <div className="divide-y divide-border-subtle">
            <ToggleSwitch
              checked={prefs.privacy.public_profile}
              onChange={() => togglePrivacy('public_profile')}
              label="Public profile"
              description="When off, your profile is only visible to you and admins"
            />
          </div>
          {!prefs.privacy.public_profile && (
            <p className="text-text-secondary text-xs mt-3 bg-bg-raised rounded-lg px-3 py-2">
              Other members won&apos;t see your submissions or stats.
            </p>
          )}
        </NeonCard>

        {/* ============ Account Info ============ */}
        <NeonCard hover={false} className="p-6">
          <h2 className="font-display text-lg text-text-primary mb-4">Account Info</h2>
          <div className="grid grid-cols-2 gap-4">
            {memberSince && (
              <div className="col-span-2">
                <span className="text-text-secondary text-xs uppercase tracking-wider block mb-1">
                  Member since
                </span>
                <span className="text-text-primary text-sm">{memberSince}</span>
              </div>
            )}
            <div>
              <span className="text-text-secondary text-xs uppercase tracking-wider block mb-1">
                Level
              </span>
              <span className="text-text-primary text-sm font-medium">
                {profile?.level ?? 1}
              </span>
            </div>
            <div>
              <span className="text-text-secondary text-xs uppercase tracking-wider block mb-1">
                Total XP
              </span>
              <span className="text-accent-text text-sm font-medium">
                {(profile?.total_xp ?? 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-text-secondary text-xs uppercase tracking-wider block mb-1">
                Total Submissions
              </span>
              <span className="text-text-primary text-sm font-medium">
                {stats.total_submissions.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-text-secondary text-xs uppercase tracking-wider block mb-1">
                Points Earned
              </span>
              <span className="text-accent-text text-sm font-medium">
                {stats.total_points.toLocaleString()}
              </span>
            </div>
          </div>
        </NeonCard>

        {/* ============ Data & Security ============ */}
        <NeonCard hover={false} className="p-6">
          <h2 className="font-display text-lg text-text-primary mb-4">Data & Security</h2>

          <div className="space-y-4">
            <div>
              <p className="text-text-secondary text-xs uppercase tracking-wider mb-2">Export my data</p>
              <div className="flex flex-wrap gap-2">
                {(['submissions', 'points', 'all'] as const).map((exportType) => (
                  <button
                    key={exportType}
                    disabled={exportingType !== null}
                    onClick={() => {
                      setExportingType(exportType);
                      const link = document.createElement('a');
                      link.href = `/api/me/export?type=${exportType}`;
                      link.download = '';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setTimeout(() => setExportingType(null), 2000);
                    }}
                    className="px-4 py-2 bg-bg-raised border border-border-subtle rounded-lg text-sm text-text-primary hover:border-border-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:scale-[0.97] transition-[border-color] disabled:opacity-50"
                  >
                    {exportingType === exportType
                      ? 'Downloading...'
                      : `Export ${exportType.charAt(0).toUpperCase() + exportType.slice(1)}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-text-secondary text-xs uppercase tracking-wider block mb-1.5">
                Session
              </span>
              <div className="bg-bg-raised border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[var(--positive)] rounded-full" />
                  Active session
                </div>
              </div>
            </div>
          </div>
        </NeonCard>
      </div>

    </div>
  );
}
