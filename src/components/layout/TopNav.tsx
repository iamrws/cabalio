'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, FlaskConical, LogOut, Settings, User } from 'lucide-react';
import { NAV_ITEMS, SECONDARY_NAV } from '@/lib/constants';
import { useUser } from '../shared/UserProvider';
import { useAiOrNot } from '../game/AiOrNotPanel';
import { useSubmitDrawer } from '../shared/SubmitDrawerProvider';
import PointsBadge from '../shared/PointsBadge';

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

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { summary } = useUser();
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();
  const { open: openSubmit } = useSubmitDrawer();
  const weeklyPoints = summary?.stats?.weekly_points ?? 0;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(target) && bellRef.current && !bellRef.current.contains(target)) {
        setBellOpen(false);
      }
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(target) && avatarRef.current && !avatarRef.current.contains(target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_all_read' }) });
    } catch { void fetchNotifications(); }
  };

  const markOneRead = async (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try { await fetch(`/api/notifications/${n.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: true }) }); } catch { void fetchNotifications(); }
    }
    setBellOpen(false);
    const link = n.link || n.metadata?.link;
    if (link && typeof link === 'string') router.push(link);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-bg-surface/85 backdrop-blur-xl border-b border-border-subtle">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-[var(--content-max)] mx-auto">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-accent-text flex items-center justify-center text-bg-base font-bold text-sm">JC</div>
          <span className="hidden sm:inline text-sm font-semibold uppercase tracking-[0.25em] text-accent-text">Jito Cabal</span>
        </Link>

        <nav className="flex gap-1 p-1 bg-bg-base rounded-xl border border-border-subtle" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-[color,background-color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  isActive
                    ? 'bg-bg-raised text-accent-text shadow-[var(--shadow-sm)]'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSubmit}
            className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-[var(--bg-base)] text-sm font-semibold hover:bg-accent-dim active:scale-[0.97] transition-[color,background-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            + Submit
          </button>

          <div className="hidden sm:block">
            <PointsBadge points={weeklyPoints} size="sm" />
          </div>

          <button
            type="button"
            onClick={toggleGame}
            className={`hidden sm:flex p-2 rounded-md transition-[color,background-color,transform] duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              gameOpen
                ? 'text-accent-text bg-accent-muted'
                : 'text-text-secondary hover:text-accent-text hover:bg-[var(--accent-muted)]'
            }`}
            aria-label={gameOpen ? 'Close AI or Not' : 'Play AI or Not'}
          >
            <FlaskConical className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              ref={bellRef}
              type="button"
              onClick={() => setBellOpen((v) => !v)}
              className="relative p-2 rounded-md text-text-secondary hover:text-accent-text hover:bg-[var(--accent-muted)] active:bg-[var(--accent-muted)]/60 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-[color,background-color,transform] duration-150"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[#08080a] text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div ref={bellDropdownRef} className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-bg-surface border border-border-default rounded-lg shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                  <span className="text-sm font-semibold text-text-primary">Notifications</span>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead} className="text-xs text-accent-text hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] rounded-sm transition-[color,opacity] duration-150">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-text-tertiary">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => markOneRead(n)}
                        className={`w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-bg-raised active:bg-[var(--bg-overlay)] focus-visible:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40 transition-[background-color] ${!n.read ? 'bg-bg-raised/50' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${TYPE_COLORS[n.type] ?? 'bg-text-tertiary'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm leading-snug truncate ${n.read ? 'text-text-secondary' : 'font-bold text-text-primary'}`}>{n.title}</p>
                            <p className="mt-0.5 text-xs text-text-secondary truncate">{n.body}</p>
                            <p className="mt-1 font-mono text-[11px] text-text-tertiary">{relativeTime(n.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-border-subtle">
                  <button type="button" onClick={() => setBellOpen(false)} className="w-full px-4 py-3 text-xs text-center text-text-tertiary hover:text-text-secondary hover:bg-[var(--bg-raised)] active:bg-[var(--bg-overlay)] focus-visible:outline-none transition-[color,background-color]">Close</button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              ref={avatarRef}
              type="button"
              onClick={() => setAvatarOpen((v) => !v)}
              className="h-8 w-8 rounded-full bg-border-default flex items-center justify-center text-xs font-medium text-text-secondary hover:bg-bg-raised active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-[background-color,transform] duration-150"
              aria-label="User menu"
            >
              {summary?.user?.display_name?.[0]?.toUpperCase() || '?'}
            </button>

            {avatarOpen && (
              <div ref={avatarDropdownRef} className="absolute right-0 top-full mt-2 w-48 bg-bg-surface border border-border-default rounded-lg shadow-lg overflow-hidden">
                {SECONDARY_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-raised active:bg-[var(--bg-overlay)] transition-[color,background-color] duration-150"
                  >
                    {item.icon === 'settings' ? <Settings className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => { setAvatarOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-secondary hover:text-negative hover:bg-bg-raised active:bg-[var(--bg-overlay)] border-t border-border-subtle transition-[color,background-color] duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
