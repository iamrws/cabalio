# Arena Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 7-tab sidebar navigation into a 2-tab top nav ("Your Arena" + "The Board") with a floating submit button, embedding quests/rewards/feed into the dashboard.

**Architecture:** Replace Sidebar + Header + MobileNav with TopNav (desktop) + BottomBar (mobile). Add SubmitDrawer (modal/drawer) triggered by FAB. Rebuild dashboard page with 4 embedded sections. Enhance leaderboard with competitive features. All existing routes remain functional.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Lucide icons, Radix UI (Dialog for submit drawer), existing design tokens from globals.css.

**Spec:** `docs/superpowers/specs/2026-04-01-arena-restructure-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/shared/SubmitDrawerProvider.tsx` | Context + hook for submit drawer open/close state |
| `src/components/shared/SubmitDrawer.tsx` | Modal (desktop) / bottom-sheet (mobile) wrapping submit form |
| `src/components/layout/TopNav.tsx` | Horizontal top nav: logo, 2-tab toggle, notification bell, AI or Not, avatar dropdown |
| `src/components/layout/BottomBar.tsx` | Mobile bottom bar: 2 nav icons + center FAB |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/constants.ts` | Replace 7-item `NAV_ITEMS` with 2-item array, add `SECONDARY_NAV` |
| `src/lib/nav-icons.tsx` | Add `User` icon, keep only used icons |
| `src/app/(auth)/layout.tsx` | Swap Sidebar+Header+MobileNav for TopNav+BottomBar+SubmitDrawer |
| `src/app/(auth)/dashboard/page.tsx` | Full rebuild as "Your Arena" with 4 sections |
| `src/app/(auth)/leaderboard/page.tsx` | Add "Your Position" card, user row highlight, movement indicators |

### Unchanged Files (kept, still routable)
- `src/app/(auth)/feed/page.tsx`
- `src/app/(auth)/submit/page.tsx`
- `src/app/(auth)/quests/page.tsx`
- `src/app/(auth)/rewards/page.tsx`
- `src/app/(auth)/settings/page.tsx`
- `src/components/layout/Sidebar.tsx` (no longer imported but kept in tree)
- `src/components/layout/Header.tsx` (no longer imported but kept in tree)
- `src/components/layout/MobileNav.tsx` (no longer imported but kept in tree)

---

## Task 1: Update Navigation Constants

**Files:**
- Modify: `src/lib/constants.ts:42-50`
- Modify: `src/lib/nav-icons.tsx:1-12`

- [ ] **Step 1: Update NAV_ITEMS in constants.ts**

Replace the 7-item `NAV_ITEMS` with a 2-item primary nav and a secondary nav array:

```typescript
// In src/lib/constants.ts, replace lines 42-50:

// Primary navigation — top nav tabs
export const NAV_ITEMS = [
  { label: 'Your Arena', href: '/dashboard', icon: 'home' },
  { label: 'The Board', href: '/leaderboard', icon: 'trophy' },
] as const;

// Secondary navigation — avatar dropdown
export const SECONDARY_NAV = [
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Profile', href: '/profile/me', icon: 'user' },
] as const;
```

- [ ] **Step 2: Update nav-icons.tsx**

```typescript
// Replace entire file src/lib/nav-icons.tsx:
import React from 'react';
import { Home, Trophy, Settings, User } from 'lucide-react';

export const NAV_ICONS: Record<string, React.ReactNode> = {
  home: <Home className="w-5 h-5" />,
  trophy: <Trophy className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
};
```

- [ ] **Step 3: Verify the app still builds**

Run: `cd D:/Drive_C/Development/cabal/jito-cabal && npx next build 2>&1 | head -30`

Note: Build warnings about unused imports in Sidebar.tsx and MobileNav.tsx are expected — those files still import the old icons but are about to be replaced in the layout.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.ts src/lib/nav-icons.tsx
git commit -m "refactor: reduce NAV_ITEMS to 2 primary tabs + secondary nav"
```

---

## Task 2: Create SubmitDrawerProvider

**Files:**
- Create: `src/components/shared/SubmitDrawerProvider.tsx`

- [ ] **Step 1: Create the context provider**

```typescript
// src/components/shared/SubmitDrawerProvider.tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SubmitDrawerContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const SubmitDrawerContext = createContext<SubmitDrawerContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function useSubmitDrawer() {
  return useContext(SubmitDrawerContext);
}

export function SubmitDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <SubmitDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </SubmitDrawerContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/SubmitDrawerProvider.tsx
git commit -m "feat: add SubmitDrawerProvider context for modal state"
```

---

## Task 3: Create SubmitDrawer Component

**Files:**
- Create: `src/components/shared/SubmitDrawer.tsx`

- [ ] **Step 1: Create the submit drawer**

This component renders as a centered modal on desktop and a bottom sheet on mobile. It contains the same form fields as the existing `submit/page.tsx`.

```typescript
// src/components/shared/SubmitDrawer.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useSubmitDrawer } from './SubmitDrawerProvider';
import NeonCard from './NeonCard';
import { MAX_IMAGE_SIZE_MB } from '@/lib/constants';
import type { SubmissionType } from '@/lib/types';

type Tab = SubmissionType;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'x_post', label: 'Jito Content', icon: 'X' },
  { id: 'blog', label: 'Blog Article', icon: 'B' },
  { id: 'art', label: 'Artwork', icon: 'A' },
];

const placeholderByType: Record<Tab, string> = {
  x_post: 'Paste the post text or your thread summary (minimum 50 characters)',
  blog: 'Paste a meaningful excerpt or summary of the article (minimum 200 words)',
  art: 'Describe the artwork, inspiration, and process (minimum 50 characters)',
};

export default function SubmitDrawer() {
  const { isOpen, close } = useSubmitDrawer();
  const [activeTab, setActiveTab] = useState<Tab>('x_post');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [artFile, setArtFile] = useState<File | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const resetAll = useCallback(() => {
    setUrl('');
    setTitle('');
    setContentText('');
    setArtFile(null);
    setUploadedImagePath('');
    setError('');
    setSuccess('');
  }, []);

  const uploadArtworkImage = async (): Promise<string> => {
    if (!artFile) throw new Error('Please upload an artwork image');
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', artFile);
      const res = await fetch('/api/uploads/image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image upload failed');
      if (!data.image_path) throw new Error('No image path returned');
      setUploadedImagePath(data.image_path);
      return data.image_path as string;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const imagePath = activeTab === 'art' ? await uploadArtworkImage() : undefined;
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          url: url || undefined,
          title,
          content_text: contentText,
          image_path: activeTab === 'art' ? imagePath : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit content');
      setSuccess(data.message || 'Submission received and queued for review!');
      resetAll();
      setTimeout(() => { setSuccess(''); close(); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered modal on desktop */}
      <div className="relative z-10 w-full lg:max-w-lg max-h-[85vh] overflow-y-auto bg-bg-surface border border-border-default rounded-t-2xl lg:rounded-2xl shadow-[var(--shadow-2xl)]">
        {/* Drag handle (mobile) */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-display font-semibold text-text-primary tracking-tight">Submit Content</h2>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-raised active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] transition-[color,background-color,transform] duration-150"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="px-5 pt-4">
          <div className="flex gap-2 p-1 bg-bg-base rounded-xl border border-border-subtle">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); if (tab.id !== 'art') { setArtFile(null); setUploadedImagePath(''); } }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-[color,background-color,border-color] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  activeTab === tab.id
                    ? 'bg-bg-raised text-accent-text border border-accent-border'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Success / Error */}
        {success ? (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-positive-muted border border-positive-border text-sm text-positive">{success}</div>
        ) : null}
        {error ? (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-negative-muted border border-negative-border text-sm text-negative">{error}</div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your submission a clear title"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20 transition-[border-color] text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {activeTab === 'x_post' ? 'Post URL' : activeTab === 'blog' ? 'Blog URL' : 'Reference URL (Optional)'}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                activeTab === 'x_post'
                  ? 'https://x.com/yourhandle/status/...'
                  : activeTab === 'blog'
                    ? 'https://your-blog-url.com/post'
                    : 'https://example.com/portfolio'
              }
              required={activeTab !== 'art'}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20 transition-[border-color] text-sm"
            />
          </div>

          {activeTab === 'art' ? (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Artwork Image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => { setArtFile(e.target.files?.[0] || null); setUploadedImagePath(''); }}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary text-sm"
              />
              <p className="mt-1 text-xs text-text-muted">Max: {MAX_IMAGE_SIZE_MB}MB</p>
              {artFile ? <p className="mt-1 text-xs text-text-secondary">Selected: {artFile.name}</p> : null}
              {uploadedImagePath ? <p className="mt-1 text-xs text-positive">Uploaded</p> : null}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {activeTab === 'blog' ? 'Article Summary' : 'Content Description'}
            </label>
            <textarea
              maxLength={5000}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              placeholder={placeholderByType[activeTab]}
              required
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg bg-bg-raised border border-border-subtle text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent/50 focus-visible:ring-1 focus-visible:ring-accent/20 transition-[border-color] text-sm resize-none"
            />
            <div className="mt-1 text-xs text-text-muted text-right">{contentText.length}/5000</div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent py-3 rounded-[var(--radius-sm)] font-semibold text-[var(--bg-base)] hover:bg-accent-dim active:scale-[0.99] transition-[color,background-color,transform,box-shadow] duration-150 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {isUploadingImage ? 'Uploading...' : isSubmitting ? 'Submitting...' : 'Submit For Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/SubmitDrawer.tsx
git commit -m "feat: add SubmitDrawer modal/bottom-sheet component"
```

---

## Task 4: Create TopNav Component

**Files:**
- Create: `src/components/layout/TopNav.tsx`

- [ ] **Step 1: Create TopNav**

This replaces both the Sidebar (navigation) and Header (notifications, auth, page title). It renders a horizontal top bar with: logo, 2-tab toggle, notification bell, AI or Not toggle, avatar dropdown.

```typescript
// src/components/layout/TopNav.tsx
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

  // --- Notifications ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const bellDropdownRef = useRef<HTMLDivElement>(null);

  // --- Avatar dropdown ---
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

  // Close dropdowns on outside click
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
        {/* Left — Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-accent-text flex items-center justify-center text-bg-base font-bold text-sm">JC</div>
          <span className="hidden sm:inline text-sm font-semibold uppercase tracking-[0.25em] text-accent-text">Jito Cabal</span>
        </Link>

        {/* Center — Tab Toggle */}
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

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          {/* Submit button (desktop only) */}
          <button
            type="button"
            onClick={openSubmit}
            className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-[var(--bg-base)] text-sm font-semibold hover:bg-accent-dim active:scale-[0.97] transition-[color,background-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            + Submit
          </button>

          {/* Weekly points (desktop) */}
          <div className="hidden sm:block">
            <PointsBadge points={weeklyPoints} size="sm" />
          </div>

          {/* AI or Not? toggle */}
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

          {/* Notification Bell */}
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

          {/* Avatar Dropdown */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/TopNav.tsx
git commit -m "feat: add TopNav — horizontal top bar replacing Sidebar + Header"
```

---

## Task 5: Create BottomBar Component

**Files:**
- Create: `src/components/layout/BottomBar.tsx`

- [ ] **Step 1: Create BottomBar**

Mobile-only bottom bar with 2 nav icons and a center FAB for submissions.

```typescript
// src/components/layout/BottomBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Plus, FlaskConical } from 'lucide-react';
import { useAiOrNot } from '../game/AiOrNotPanel';
import { useSubmitDrawer } from '../shared/SubmitDrawerProvider';

const NAV = [
  { href: '/dashboard', icon: Home, label: 'Arena' },
  { href: '/leaderboard', icon: Trophy, label: 'Board' },
] as const;

export default function BottomBar() {
  const pathname = usePathname();
  const { toggle: toggleGame, isOpen: gameOpen } = useAiOrNot();
  const { open: openSubmit } = useSubmitDrawer();

  return (
    <>
      {/* AI or Not floating button */}
      <button
        onClick={toggleGame}
        aria-label={gameOpen ? 'Close AI or Not game' : 'Open AI or Not game'}
        className={`fixed bottom-[76px] right-4 z-[51] lg:hidden w-11 h-11 rounded-full flex items-center justify-center transition-[transform,box-shadow,background-color] duration-200 shadow-lg hover:shadow-[0_0_20px_rgba(212,168,83,0.2)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:ring-[var(--accent)] ${
          gameOpen ? 'bg-accent text-[var(--bg-base)]' : 'bg-bg-surface border border-accent-border text-accent-text'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
      </button>

      {/* Bottom bar */}
      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-xl border-t border-border-subtle lg:hidden">
        <div className="flex items-center justify-around h-16 px-4 pb-safe">
          {/* Left nav item */}
          {(() => {
            const item = NAV[0];
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-6 py-1 rounded-lg transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-border)] active:scale-90 ${
                  isActive ? 'text-accent-text' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })()}

          {/* Center FAB */}
          <button
            type="button"
            onClick={openSubmit}
            className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-[var(--accent)] text-[var(--bg-base)] shadow-[var(--shadow-gold)] hover:bg-accent-dim active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:ring-[var(--accent)] transition-[background-color,transform] duration-150"
            aria-label="Submit content"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>

          {/* Right nav item */}
          {(() => {
            const item = NAV[1];
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-6 py-1 rounded-lg transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-border)] active:scale-90 ${
                  isActive ? 'text-accent-text' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })()}
        </div>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/BottomBar.tsx
git commit -m "feat: add BottomBar — mobile bottom nav with 2 tabs + submit FAB"
```

---

## Task 6: Update Auth Layout

**Files:**
- Modify: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Replace layout imports and structure**

Replace the entire content of `src/app/(auth)/layout.tsx`:

```typescript
// src/app/(auth)/layout.tsx
'use client';

import TopNav from '@/components/layout/TopNav';
import BottomBar from '@/components/layout/BottomBar';
import { UserProvider } from '@/components/shared/UserProvider';
import { SubmitDrawerProvider } from '@/components/shared/SubmitDrawerProvider';
import SubmitDrawer from '@/components/shared/SubmitDrawer';
import dynamic from 'next/dynamic';
import { AiOrNotProvider } from '@/components/game/AiOrNotPanel';

const AiOrNotPanel = dynamic(
  () => import('@/components/game/AiOrNotPanel').then(m => ({ default: m.default })),
  { ssr: false, loading: () => null }
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
    <AiOrNotProvider>
    <SubmitDrawerProvider>
      <div className="min-h-screen bg-bg-base">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-accent focus:text-[var(--bg-base)] focus:rounded-md">
          Skip to main content
        </a>
        <TopNav />
        <main id="main-content" className="px-4 sm:px-6 py-6 pb-20 lg:pb-6 max-w-[var(--content-max)] mx-auto space-y-6">
          {children}
        </main>
        <BottomBar />
        <SubmitDrawer />
        <AiOrNotPanel />
      </div>
    </SubmitDrawerProvider>
    </AiOrNotProvider>
    </UserProvider>
  );
}
```

- [ ] **Step 2: Verify the app builds and renders**

Run: `cd D:/Drive_C/Development/cabal/jito-cabal && npx next build 2>&1 | tail -20`

The old Sidebar, Header, and MobileNav files still exist but are no longer imported. This is intentional — they serve as reference and can be deleted in a cleanup pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/layout.tsx
git commit -m "feat: swap layout to TopNav + BottomBar + SubmitDrawer"
```

---

## Task 7: Rebuild Dashboard as "Your Arena"

**Files:**
- Modify: `src/app/(auth)/dashboard/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the dashboard page**

Replace the entire content of `src/app/(auth)/dashboard/page.tsx`:

```typescript
// src/app/(auth)/dashboard/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Gift, Shield, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import NeonCard from '@/components/shared/NeonCard';
import { CardSkeleton } from '@/components/shared/LoadingSkeleton';
import PointsBadge from '@/components/shared/PointsBadge';
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
  const { summary: userSummary } = useUser();
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/dashboard/page.tsx
git commit -m "feat: rebuild dashboard as Your Arena — rank hero, missions, power-ups"
```

---

## Task 8: Enhance Leaderboard as "The Board"

**Files:**
- Modify: `src/app/(auth)/leaderboard/page.tsx`

- [ ] **Step 1: Add "Your Position" card and user row highlight**

This task enhances the existing leaderboard with:
1. A pinned "Your Position" card at the top showing rank, tier, delta, and rival proximity
2. Current user's row highlighted in the table
3. Keep all existing functionality (time filters, tier sections, table)

Replace the entire content of `src/app/(auth)/leaderboard/page.tsx`:

```typescript
// src/app/(auth)/leaderboard/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Lock, Trophy } from 'lucide-react';

import NeonCard from '@/components/shared/NeonCard';
import { useUser } from '@/components/shared/UserProvider';
import type { LeaderboardEntry } from '@/lib/types';

const TIER_CONFIG = {
  elite: { color: 'var(--tier-elite)', label: 'Cabal Elite' },
  member: { color: 'var(--tier-member)', label: 'Cabal Member' },
  initiate: { color: 'var(--tier-initiate)', label: 'Cabal Initiate' },
} as const;

type TimeRange = 'week' | 'all';

export default function LeaderboardPage() {
  const { summary } = useUser();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/leaderboard?range=${timeRange}`, { method: 'GET', cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load leaderboard');
        if (!cancelled) {
          setEntries(data.leaderboard || []);
          setWeekNumber(data.week_number ?? null);
          setParticipantCount(data.total_participants || 0);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load');
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchLeaderboard();
    return () => { cancelled = true; };
  }, [timeRange]);

  const groupedByTier = useMemo(() => ({
    elite: entries.filter((e) => e.tier === 'elite'),
    member: entries.filter((e) => e.tier === 'member'),
    initiate: entries.filter((e) => e.tier === 'initiate'),
  }), [entries]);

  // Find current user in leaderboard
  const myWallet = summary?.user?.display_name; // We don't have wallet in summary, so we match by display_name
  const myEntry = useMemo(() => {
    if (!entries.length) return null;
    // Try to find by matching — since we don't have wallet address in UserProvider,
    // we look for any entry. In production this would use the session wallet address.
    // For now, we use a command-center fetch to get the user's rank.
    return null;
  }, [entries]);

  // Fetch user's own rank info
  const [myRank, setMyRank] = useState<{ rank: number; tier: string; points: number; points_to_next: number; rival_name: string | null; rival_gap: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMyRank = async () => {
      try {
        const res = await fetch('/api/me/command-center', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        const rank = data.bracket?.rank;
        const points = data.bracket?.points;
        const tier = data.tier?.current;
        const ptnr = data.bracket?.points_to_next_rank;

        // Find rival from leaderboard entries
        let rivalName: string | null = null;
        let rivalGap = 0;
        if (rank && rank > 1 && entries.length > 0) {
          const above = entries.find((e) => e.rank === rank - 1);
          if (above) {
            rivalName = above.display_name || above.wallet_address.slice(0, 4) + '...' + above.wallet_address.slice(-4);
            rivalGap = above.total_points - (points || 0);
          }
        }

        setMyRank({ rank, tier, points, points_to_next: ptnr, rival_name: rivalName, rival_gap: rivalGap });
      } catch { /* silent */ }
    };
    void fetchMyRank();
    return () => { cancelled = true; };
  }, [entries]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Time range toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 p-1 bg-bg-surface rounded-xl border border-border-subtle">
          {([{ id: 'week' as const, label: 'This Week' }, { id: 'all' as const, label: 'All Time' }]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-[color,background-color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                timeRange === tab.id ? 'bg-bg-raised text-accent-text' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-text-muted font-mono">
          {timeRange === 'week' && weekNumber ? `Week ${weekNumber}` : 'All-Time Rankings'}
        </div>
      </div>

      {/* Your Position Card */}
      {myRank && !error ? (
        <NeonCard hover={false} className="p-5 border-l-[3px] border-l-[var(--accent)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-display font-bold text-accent-text" style={{ letterSpacing: '-0.03em' }}>
                #{myRank.rank}
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">{myRank.tier}</div>
                <div className="text-xs text-text-muted font-mono">{myRank.points} pts</div>
              </div>
            </div>
            <div className="text-right space-y-1">
              {myRank.points_to_next > 0 ? (
                <div className="text-sm text-text-secondary">
                  <span className="font-mono text-accent-text">{myRank.points_to_next}</span> pts to next rank
                </div>
              ) : (
                <div className="text-sm text-positive font-medium">#1</div>
              )}
              {myRank.rival_name ? (
                <div className="text-xs text-text-muted">
                  {myRank.rival_gap} pts behind <span className="text-text-secondary font-medium">{myRank.rival_name}</span>
                </div>
              ) : myRank.rank === 1 ? (
                <div className="text-xs text-accent-text">You&apos;re leading</div>
              ) : null}
            </div>
          </div>
        </NeonCard>
      ) : null}

      <NeonCard hover={false} className="p-3">
        <div className="text-xs text-text-secondary">
          Showing points for {participantCount} holder accounts.
        </div>
      </NeonCard>

      {/* Error states */}
      {error ? (
        /auth/i.test(error) || /unauthorized/i.test(error) || /authentication required/i.test(error) ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
            <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-accent-text" />
            </div>
            <h3 className="text-lg font-display font-semibold text-text-primary mb-2" style={{ letterSpacing: '-0.03em' }}>Connect your wallet</h3>
            <p className="text-sm text-text-secondary max-w-xs leading-[1.7]">Sign in with your wallet to see the leaderboard rankings and your position.</p>
          </div>
        ) : (
          <NeonCard hover={false} className="p-4 border border-negative-border">
            <div className="text-sm text-negative">{error}</div>
          </NeonCard>
        )
      ) : null}

      {loading ? (
        <NeonCard hover={false} className="p-5">
          <div className="text-sm text-text-muted">Loading leaderboard...</div>
        </NeonCard>
      ) : null}

      {!loading && !error && entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
          <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6 text-accent-text" />
          </div>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-2" style={{ letterSpacing: '-0.03em' }}>No rankings yet</h3>
          <p className="text-sm text-text-secondary max-w-xs leading-[1.7]">Rankings appear after approved submissions are scored each week.</p>
        </div>
      ) : null}

      {/* Tier sections */}
      {(['elite', 'member', 'initiate'] as const).map((tier) => {
        const tierEntries = groupedByTier[tier];
        if (tierEntries.length === 0) return null;
        const tierConfig = TIER_CONFIG[tier];

        return (
          <div key={tier}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tierConfig.color }} />
              <h3 className="text-sm font-semibold uppercase tracking-wider font-display" style={{ color: tierConfig.color }}>
                {tierConfig.label}
              </h3>
              <span className="text-xs text-text-muted font-mono">{tierEntries.length} members</span>
            </div>

            <NeonCard hover={false} className="overflow-hidden">
              <table className="w-full">
                <caption className="sr-only">{tierConfig.label} tier leaderboard rankings</caption>
                <thead>
                  <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border-subtle">
                    <th className="text-left px-5 py-3 w-12">#</th>
                    <th className="text-left px-5 py-3">Member</th>
                    <th className="text-right px-5 py-3 hidden sm:table-cell">Level</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Submissions</th>
                    <th className="text-right px-5 py-3 hidden md:table-cell">Best Score</th>
                    <th className="text-right px-5 py-3">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {tierEntries.map((entry) => {
                    const isMe = myRank && entry.rank === myRank.rank;
                    return (
                      <tr
                        key={entry.wallet_address}
                        className={`border-b border-border-subtle/50 last:border-0 hover:bg-bg-raised/50 transition-[background-color] ${
                          isMe ? 'bg-accent-muted/30 border-l-2 border-l-[var(--accent)]' : ''
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono text-sm font-bold text-text-primary">{entry.rank}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/profile/${entry.wallet_address}`}
                            className="text-sm font-medium text-text-primary hover:text-accent-text transition-[color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                          >
                            {entry.display_name || entry.wallet_address}
                            {isMe ? <span className="ml-1.5 text-xs text-accent-text">(you)</span> : null}
                          </Link>
                          <div className="text-xs text-text-muted font-mono truncate max-w-[120px] sm:max-w-none">
                            <span className="sm:hidden">{entry.wallet_address.slice(0, 4)}...{entry.wallet_address.slice(-4)}</span>
                            <span className="hidden sm:inline">{entry.wallet_address}</span>
                          </div>
                        </td>
                        <td className="text-right px-5 py-3 hidden sm:table-cell">
                          <span className="text-xs font-mono text-text-secondary">Lv.{entry.level}</span>
                        </td>
                        <td className="text-right px-5 py-3 hidden md:table-cell">
                          <span className="text-sm font-mono text-text-secondary">{entry.submission_count}</span>
                        </td>
                        <td className="text-right px-5 py-3 hidden md:table-cell">
                          <span className="text-sm font-mono font-bold text-positive">{entry.best_score}</span>
                        </td>
                        <td className="text-right px-5 py-3">
                          <span className="font-mono font-bold text-accent-text">{entry.total_points}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </NeonCard>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/leaderboard/page.tsx
git commit -m "feat: enhance leaderboard — Your Position card, user highlight, rival proximity"
```

---

## Task 9: Build Verification & Final Commit

**Files:** None (verification only)

- [ ] **Step 1: Run a full build**

```bash
cd D:/Drive_C/Development/cabal/jito-cabal && npx next build 2>&1 | tail -30
```

Expected: Build succeeds. The old Sidebar.tsx, Header.tsx, and MobileNav.tsx files still exist but produce no build errors since they're not imported.

- [ ] **Step 2: Verify all routes still work**

Check that these routes render without errors by starting the dev server and checking the build output for route errors:

- `/dashboard` — "Your Arena" with rank hero, streak strip, missions, power-ups, activity
- `/leaderboard` — "The Board" with Your Position card, tier tables
- `/feed` — unchanged, still works
- `/submit` — unchanged, still works as a full page
- `/quests` — unchanged, still works
- `/rewards` — unchanged, still works
- `/settings` — unchanged, accessible via avatar dropdown
- `/profile/me` — unchanged, accessible via avatar dropdown

- [ ] **Step 3: Push to remote**

```bash
git push origin autodesign/apr1
```
