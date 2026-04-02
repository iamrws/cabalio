'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Flame } from 'lucide-react';
import AuthControls from '../shared/AuthControls';
import PointsBadge from '../shared/PointsBadge';
import { useUser } from '../shared/UserProvider';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/submit': 'Submit Content',
  '/leaderboard': 'Leaderboard',
  '/quests': 'Quests',
  '/rewards': 'Rewards',
  '/feed': 'Community Feed',
  '/settings': 'Settings',
  '/profile/me': 'My Profile',
};

interface Notification {
  id: string;
  type: 'submission' | 'points' | 'quest' | 'system';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  metadata?: { link?: string; [key: string]: unknown };
  link?: string;
}

const TYPE_COLORS: Record<Notification['type'], string> = {
  submission: 'bg-accent',
  points: 'bg-[var(--positive)]',
  quest: 'bg-[var(--accent)]',
  system: 'bg-[var(--text-tertiary)]',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const POLL_INTERVAL = 30_000;

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title =
    pageTitles[pathname] ??
    (pathname.startsWith('/profile/') && pathname !== '/profile/me' ? 'Profile' : 'Jito Cabal');
  const { summary } = useUser();
  const streak = summary?.user?.current_streak ?? 0;
  const weeklyPoints = summary?.stats?.weekly_points ?? 0;

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // ---------- Fetch notifications ----------
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Silent fail — we'll retry on the next poll.
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // ---------- Click outside to close ----------
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ---------- Actions ----------
  const markAllRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
    } catch {
      // Revert on failure
      void fetchNotifications();
    }
  };

  const markOneRead = async (notification: Notification) => {
    if (!notification.read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
      } catch {
        void fetchNotifications();
      }
    }

    setIsOpen(false);

    const link = notification.link || notification.metadata?.link;
    if (link && typeof link === 'string') {
      router.push(link);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-bg-surface/85 backdrop-blur-xl border-b border-border-subtle">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
            <span className="text-lg font-bold text-accent-text">JC</span>
          </div>
          <h1 className="text-lg font-display font-semibold text-text-primary tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* ---------- Notification Bell ---------- */}
          <div className="relative">
            <button
              ref={bellRef}
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              className="relative p-2 rounded-md text-text-secondary hover:text-accent-text hover:bg-[var(--accent-muted)] active:bg-[var(--accent-muted)]/60 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-[color,background-color,transform] duration-150"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />

              {/* Unread badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[#08080a] text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* ---------- Dropdown Panel ---------- */}
            {isOpen && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-bg-surface border border-border-default rounded-lg shadow-lg overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                  <span className="text-sm font-semibold text-text-primary">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs text-accent-text hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm transition-[color,opacity] duration-150"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-text-tertiary">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => markOneRead(n)}
                        className={`w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-bg-raised active:bg-[var(--bg-overlay)] focus-visible:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40 transition-colors ${
                          !n.read ? 'bg-bg-raised/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Type dot */}
                          <span
                            className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${TYPE_COLORS[n.type] ?? 'bg-text-tertiary'}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm leading-snug truncate ${
                                n.read ? 'text-text-secondary' : 'font-bold text-text-primary'
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary truncate">
                              {n.body}
                            </p>
                            <p className="mt-1 font-mono text-[11px] text-text-tertiary">
                              {relativeTime(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full px-4 py-3 text-xs text-center text-text-tertiary hover:text-text-secondary hover:bg-[var(--bg-raised)] active:bg-[var(--bg-overlay)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/30 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---------- Streak Badge ---------- */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-accent-muted border border-accent-border">
            <Flame className="w-4 h-4" />
            <span className="font-mono text-sm text-accent-text font-bold">{streak}</span>
            <span className="text-xs text-text-tertiary">day streak</span>
          </div>

          <div className="hidden sm:block">
            <PointsBadge points={weeklyPoints} size="sm" />
          </div>

          <AuthControls compact />
        </div>
      </div>
    </header>
  );
}
