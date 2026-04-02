# Arena Restructure — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Frontend-only navigation and page restructure. No backend API changes.

## Problem

The current 7-tab sidebar (Dashboard, Feed, Submit, Leaderboard, Quests, Rewards, Settings) spreads thin content across too many pages. Feed, Submit, Quests, and Rewards don't justify standalone navigation entries — they're support actions, not destinations. The result feels like an admin panel, not a competitive community platform.

## Solution

Collapse to a 2-tab architecture: **"Your Arena"** (Dashboard) and **"The Board"** (Leaderboard), plus a **floating action button** for submissions. All secondary features (quests, rewards, feed activity) fold into the Dashboard. The sidebar is replaced by a horizontal top nav on desktop and a 3-element bottom bar on mobile.

## Design Principles

1. Two questions drive every session: "How am I doing?" and "Where do I stand?"
2. Every data point should create either pride or urgency
3. Submission is an action, not a destination — modal/drawer, never a page
4. No page navigation for secondary actions — they happen inline
5. Existing design tokens only (vault dark, gold accent, Clash Display + Satoshi)

---

## 1. Navigation

### 1.1 Desktop — Top Nav Bar

Replace `Sidebar.tsx` with a new `TopNav.tsx`. Fixed top bar, full width, `z-40`.

```
[JC Logo + "JITO CABAL"]  [ Your Arena | The Board ]  ···gap···  [AI or Not? toggle] [Bell] [Avatar dropdown]
```

**Structure:**
- Left: Logo block (existing JC branding from Sidebar)
- Center: Two pill-toggle tabs with gold `--accent` active indicator. Active tab gets `bg-accent-muted text-accent-text` with border
- Right: Icon cluster — AI or Not? flask icon, notification bell (from Header.tsx), avatar with dropdown (Profile, Settings, Sign out)
- Height: `--header-height` (56px)
- Background: `bg-bg-surface/85 backdrop-blur-xl border-b border-border-subtle` (same as current Header)

**Tab behavior:** Uses `usePathname()` — `/dashboard` activates "Your Arena", `/leaderboard` activates "The Board". Default route is `/dashboard`.

### 1.2 Mobile — Bottom Bar

Replace `MobileNav.tsx` with a new `BottomBar.tsx`. Fixed bottom, `z-50`.

```
[ Arena icon + label ]  [ + FAB (gold, raised) ]  [ Board icon + label ]
```

**Structure:**
- Two nav icons on either side (Home icon for Arena, Trophy for Board)
- Center: Raised gold FAB, 48px, `bg-[var(--accent)]`, `text-[var(--bg-base)]`, elevated above the bar by 8px with `shadow-gold`
- FAB opens the Submit Drawer (bottom sheet)
- AI or Not? button remains as a floating button above the bottom bar (existing position)

**Mobile header:** Simplified — page title, bell icon, avatar. No streak badge or points badge (those are in the dashboard content).

### 1.3 Constants Update

`NAV_ITEMS` in `constants.ts` changes to:

```typescript
export const NAV_ITEMS = [
  { label: 'Your Arena', href: '/dashboard', icon: 'home' },
  { label: 'The Board', href: '/leaderboard', icon: 'trophy' },
] as const;

export const SECONDARY_NAV = [
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Profile', href: '/profile/me', icon: 'user' },
] as const;
```

### 1.4 Auth Layout Change

`(auth)/layout.tsx` drops sidebar offset:

```tsx
<TopNav />
<div> {/* no lg:ml-[sidebar-width] */}
  <main className="px-4 sm:px-6 py-6 pb-20 lg:pb-6 max-w-[var(--content-max)] mx-auto">
    {children}
  </main>
</div>
<BottomBar /> {/* mobile only */}
<SubmitDrawer />
<AiOrNotPanel />
```

No sidebar. Content is full-width up to `--content-max` (1400px), centered.

---

## 2. Your Arena (Dashboard)

Rebuild `dashboard/page.tsx` as a vertically-stacked single-scroll page with four sections.

### 2.1 Rank Trajectory Hero

The first thing users see. Full-width NeonCard.

**Contents:**
- Left side: Large rank number (48px Clash Display, bold) with tier-colored glow using existing `--tier-elite/--tier-member/--tier-initiate` tokens. Tier badge label below.
- Center: Tier progress bar (existing from CommandCenter). Shows "X pts to next tier" or "Top tier reached".
- Right side: Delta badge — "+3 since last week" in `text-positive` or "-2" in `text-negative`. Uses rank data from `/api/me/command-center` bracket response.
- Below: Rival line — "X pts behind @{display_name}" — derived client-side by filtering the `/api/leaderboard?range=week` response for the entry one rank above the current user. If the user is rank 1, show "You're on top" instead. If leaderboard data hasn't loaded yet, hide this line.

**Data sources:** `/api/me/command-center` (tier, bracket), `/api/leaderboard?range=week` (rival name).

### 2.2 Streak & Momentum Strip

Horizontal NeonCard below the hero.

**Contents:**
- Day dots: 7 circles (Mon-Sun), filled for active days, current day has a subtle pulse animation (`opacity` 0.7-1.0, 2s loop). Uses streak data from command center.
- Streak count: Fire icon + number + "day streak" (same data as Header currently shows)
- Shields available count
- Earning velocity: "X pts/week avg" from `/api/me/reward-projections` `avg_weekly_points`
- Trend indicator: Up/down/stable arrow with percentage (from projections `trend` + `trend_pct`)

**Data sources:** `/api/me/command-center` (streak), `/api/me/reward-projections` (velocity, trend).

### 2.3 Missions & Power-Ups

Two-column grid (stacks on mobile). Each column is a NeonCard.

**Left — Active Missions (formerly Quests):**
- Section header: "Active Missions" with Target icon
- Show top 3 active quests as compact cards: quest title, points reward, progress indicator
- Each has a "Complete" CTA that navigates to `/quests` (keeping the quest page functional but not in primary nav)
- If no active season: "No active missions" empty state
- "View All Missions" link at bottom → `/quests`

**Right — Power-Ups (formerly Rewards):**
- Section header: "Power-Ups" with Gift icon
- Claimable rewards count with gold dot badge
- Total claimable SOL amount (large, mono font)
- "Claim All" button (fires existing claim API inline)
- Weekly earning projection line: "~X.XXXX SOL/week"
- "View History" link at bottom → `/rewards`

**Data sources:** `/api/seasons/current/quests` (quests), `/api/me/summary` (rewards), `/api/me/reward-projections` (projections).

### 2.4 Recent Activity

NeonCard at bottom.

**Contents:**
- Section header: "Your Recent Activity"
- Last 5 submissions with: title, type dot+label, date, score/status, points awarded. Same layout as current dashboard contributions but capped at 5.
- Below submissions: "Why You Earned Points" — last 4 point feed items (compact, from `/api/me/points-feed`)
- Community Feed CTA card at very bottom — NeonCard linking to `/feed`

**Data sources:** `/api/submissions?scope=mine&limit=5`, `/api/me/points-feed?limit=4`.

---

## 3. The Board (Leaderboard)

Rebuild `leaderboard/page.tsx` with competitive enhancements.

### 3.1 Your Position Card

Pinned NeonCard at top, accent border. Always visible.

**Contents:**
- Left: Rank number (large, tier-colored), tier badge
- Center: Display name, wallet address (truncated)
- Right: Total points, delta from previous week ("+X" or "-X")
- Below: "X pts to pass @{next_user}" — proximity to next rank

**Behavior:** This card stays at the top even when scrolling the table. Uses `sticky` positioning on desktop.

### 3.2 Time Filters

Pill toggle row (existing pattern from current leaderboard):

```
[ This Week | All Time ]  ··gap··  Week XX / All-Time Rankings
```

Keep the existing `timeRange` state and API call pattern. Default: "This Week".

### 3.3 Tier Bracket Sections

Three collapsible sections, one per tier. Each section:

**Section header:**
- Tier dot + tier label (uppercase, tracking-wider) + member count
- Section border uses tier color via `style={{ borderColor: tierConfig.color }}`

**Table enhancements (per row):**
- Existing: Rank, Member name/wallet, Level, Submissions, Best Score, Points
- New column: **Movement** — up/down arrow or dash. Derived client-side by comparing current rank to a stored previous rank (localStorage or cookie per session)
- **Streak badge:** Fire icon next to member name if `submission_count >= 5` (proxy for active streak — actual streak data not available per-user from leaderboard API)
- Current user's row highlighted with `bg-accent-muted/30 border-l-2 border-accent`

### 3.4 Top 3 Podium (optional enhancement)

Above the tier sections on desktop. Three NeonCards side by side for ranks 1, 2, 3.

- Rank 1 center (slightly larger), Rank 2 left, Rank 3 right
- Each shows: avatar placeholder, name, tier badge, total points
- Gold/silver/bronze accent borders using: `--accent` for 1st, `--text-secondary` for 2nd, `--tier-initiate` for 3rd

---

## 4. Submit Drawer

New component: `SubmitDrawer.tsx` in `components/shared/`.

### 4.1 Trigger

- Desktop: "Submit" button in TopNav right cluster OR keyboard shortcut `S`
- Mobile: Gold FAB in BottomBar

### 4.2 Component

- Desktop: Centered modal, `max-w-lg`, with backdrop overlay (`bg-black/50`)
- Mobile: Bottom sheet sliding up from bottom, `max-h-[85vh]`, drag handle at top
- Contains the existing submit form from `submit/page.tsx` — type tabs, title, URL, content, artwork upload, submit button
- Review pipeline info stays in the full `/submit` page (still routable) but is not in the drawer
- On success: toast notification "Submission received! +X estimated pts" and drawer closes. No page navigation.

### 4.3 State Management

- `useSubmitDrawer()` hook with `isOpen`, `open()`, `close()` functions
- Provider wraps the auth layout (same pattern as `AiOrNotProvider`)

---

## 5. Retained Routes

These pages remain routable (direct URL access works) but are NOT in primary navigation:

| Route | Status |
|-------|--------|
| `/feed` | Accessible via "Community Feed" CTA on dashboard |
| `/submit` | Accessible via direct URL (full page with review pipeline) |
| `/quests` | Accessible via "View All Missions" link on dashboard |
| `/rewards` | Accessible via "View History" link on dashboard |
| `/settings` | Accessible via avatar dropdown |
| `/profile/me` | Accessible via avatar dropdown |
| `/profile/[address]` | Accessible via leaderboard row clicks |

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/TopNav.tsx` | Desktop horizontal top nav bar |
| `src/components/layout/BottomBar.tsx` | Mobile bottom bar with FAB |
| `src/components/shared/SubmitDrawer.tsx` | Modal/drawer for submit form |
| `src/components/shared/SubmitDrawerProvider.tsx` | Context provider + hook |

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/lib/constants.ts` | Update `NAV_ITEMS` to 2 items, add `SECONDARY_NAV` |
| `src/lib/nav-icons.tsx` | Add User icon import, remove unused icons |
| `src/app/(auth)/layout.tsx` | Replace Sidebar+Header+MobileNav with TopNav+BottomBar+SubmitDrawer |
| `src/app/(auth)/dashboard/page.tsx` | Full rebuild as "Your Arena" with 4 sections |
| `src/app/(auth)/leaderboard/page.tsx` | Add Your Position card, movement indicators, user highlight |
| `src/components/layout/Header.tsx` | Remove (functionality merged into TopNav) |

## 8. Files to Keep (no changes)

- `src/components/layout/Sidebar.tsx` — kept in codebase but no longer imported in layout (can be removed later)
- `src/components/layout/MobileNav.tsx` — kept but no longer imported
- All `src/app/(auth)/*/page.tsx` pages (feed, submit, quests, rewards, settings) — unchanged, still routable
- All API routes — unchanged
- `src/app/globals.css` — no design token changes
- All landing pages — unchanged

## 9. Implementation Order

1. Create `SubmitDrawerProvider` + `SubmitDrawer` (independent, can ship first)
2. Create `TopNav.tsx` (merges Sidebar nav + Header notifications/auth)
3. Create `BottomBar.tsx` (2 icons + FAB)
4. Update `constants.ts` and `nav-icons.tsx`
5. Update `(auth)/layout.tsx` to use new components
6. Rebuild `dashboard/page.tsx` as "Your Arena"
7. Enhance `leaderboard/page.tsx` as "The Board"
8. Test all retained routes still work
9. Visual QA pass
