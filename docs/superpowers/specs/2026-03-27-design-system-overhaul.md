# Jito Cabal — Design System Overhaul

**Date:** 2026-03-27
**Status:** Approved
**Direction:** Clean Web3 / Crypto-Native — Palantir-inspired restraint with on-chain identity

---

## 1. Design Philosophy

Restrained, monochromatic, data-forward. The app should feel like serious infrastructure for serious holders — not a toy, not a hackathon project. Think Palantir's product density with Vercel's typographic clarity.

**Principles:**
- Monochromatic surfaces with a single restrained accent color
- Data density over decorative whitespace in the app shell
- Light landing page (marketing), dark app shell (product)
- Crypto-native elements (wallet addresses, on-chain badges) treated as first-class UI — not afterthoughts
- No glows, no gradients on text, no decorative radials. Shadows are functional only.
- Tight border radii (3–8px). Nothing bubbly.

---

## 2. Color Palette

### Surfaces (Dark — App Shell)

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#111113` | Page background |
| `bg-surface` | `#18181b` | Cards, sidebar, panels |
| `bg-raised` | `#1f1f23` | Elevated cards, stat blocks |
| `bg-overlay` | `#27272b` | Modals, dropdowns, tooltips |
| `bg-hover` | `rgba(255,255,255,0.04)` | Hover states |
| `bg-active` | `rgba(255,255,255,0.06)` | Active/pressed states |

### Surfaces (Light — Landing Page)

| Token | Value | Usage |
|---|---|---|
| `bg-light` | `#f4f4f5` | Page background |
| `bg-light-surface` | `#ffffff` | Cards, nav |
| `bg-light-raised` | `#fafafa` | Subtle elevation |

### Borders

| Token | Value | Usage |
|---|---|---|
| `border-subtle` | `rgba(255,255,255,0.06)` | Default card borders (dark) |
| `border-default` | `rgba(255,255,255,0.09)` | Emphasized borders (dark) |
| `border-strong` | `rgba(255,255,255,0.14)` | High-contrast borders (dark) |
| `border-light` | `#e4e4e7` | Default borders (light) |
| `border-light-strong` | `#d4d4d8` | Emphasized borders (light) |

### Text

| Token | Value | Context |
|---|---|---|
| `text-primary` | `#fafafa` | Headings, body (dark) |
| `text-secondary` | `#a1a1aa` | Supporting text (dark) |
| `text-tertiary` | `#71717a` | Captions, labels (dark) |
| `text-muted` | `#52525b` | Disabled, section labels (dark) |
| `text-light-primary` | `#09090b` | Headings, body (light) |
| `text-light-secondary` | `#3f3f46` | Supporting text (light) |
| `text-light-tertiary` | `#71717a` | Captions, labels (light) |

### Accent

Single accent color. Used sparingly — active states, links, the "you" row in leaderboards.

| Token | Value | Usage |
|---|---|---|
| `accent` | `#3b82f6` | Buttons, active indicators |
| `accent-dim` | `#2563eb` | Hover state for accent |
| `accent-muted` | `rgba(59,130,246,0.10)` | Background tint |
| `accent-text` | `#60a5fa` | Text on dark backgrounds |

### Semantic

| Token | Value | Usage |
|---|---|---|
| `positive` | `#22c55e` | Success, rank up, verified |
| `positive-muted` | `rgba(34,197,94,0.10)` | Background tint |
| `caution` | `#eab308` | Warnings, streaks, deadlines |
| `caution-muted` | `rgba(234,179,8,0.08)` | Background tint |
| `negative` | `#ef4444` | Errors, destructive actions |
| `negative-muted` | `rgba(239,68,68,0.08)` | Background tint |

### Tier Colors

| Tier | Color | Usage |
|---|---|---|
| Elite | `#eab308` | Tier badge, rank highlight |
| Member | `#22c55e` | Tier badge |
| Initiate | `#a1a1aa` | Tier badge (neutral grey, not a special color) |

---

## 3. Typography

**Font stack:**
- Sans: `Inter, -apple-system, system-ui, sans-serif`
- Mono: `JetBrains Mono, Fira Code, Cascadia Code, monospace`

**Scale:**

| Role | Size | Weight | Letter-spacing | Usage |
|---|---|---|---|---|
| Display | 44px | 700 | -0.035em | Landing hero headline |
| H1 | 24px | 700 | -0.025em | Page titles |
| H2 | 18px | 700 | -0.02em | Section headings |
| H3 | 14px | 600 | -0.01em | Card headings |
| Body | 14px | 400 | 0 | Paragraphs, descriptions |
| Small | 13px | 500 | 0 | Nav items, buttons |
| Caption | 12px | 500 | 0 | Supporting data |
| Label | 11px | 600 | 0.1em | Uppercase section labels |
| Mono data | 12px | 500 | 0 | Wallet addresses, points, ranks |

**Line heights:** Headings: 1.1–1.2. Body: 1.5–1.6. Mono: 1.4.

---

## 4. Spacing & Layout

**Base unit:** 4px

**Common spacings:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px

**Border radii:**
- `xs`: 3px (buttons, badges, inputs)
- `sm`: 5px (cards, nav items)
- `md`: 8px (panels, modals)
- `lg`: 12px (page-level containers, mockup frames)

**Layout constants:**
- Sidebar width: 220px
- Header height: 48px
- Content padding: 24px
- Max content width: 1400px
- Gap between stat cards: 10px
- Gap between quest items: 6px

---

## 5. Components

### Buttons

Four variants:
- **Primary** — White text on dark (`bg: #fafafa, color: #111113`). The default CTA.
- **Accent** — White text on blue (`bg: #3b82f6`). Used sparingly for key actions (Submit, Claim).
- **Secondary** — Transparent with border. General-purpose.
- **Ghost** — No border, no background. Tertiary actions, cancel.

Sizing: `padding: 7px 14px`, `font-size: 13px`, `font-weight: 500`, `border-radius: 3px`.

### Badges

Monospace font, tight padding (`2px 8px`), `border-radius: 3px`.
- **Default** — Grey background, grey text. Points, generic data.
- **Accent** — Blue tint. Active state, "you" indicator.
- **Positive** — Green tint. Verified, success.
- **Caution** — Yellow tint. Streaks, deadlines.

### Wallet Address

Rendered in mono font, truncated (`7xKXt...9f4Dw`), tertiary color. No special background — just inline text.

### Stat Card

- Background: `bg-raised`
- Border: `border-subtle`
- Radius: `sm` (5px)
- Layout: Label (11px uppercase muted) → Value (24px mono bold) → Delta (11px mono, colored)

### Quest Item

- Horizontal layout: icon box + title/subtitle on left, progress bar + fraction on right
- Icon box: 32px square, `bg-raised`, `border-subtle`, centered emoji
- Progress bar: 80px wide, 4px height, white fill on `bg-overlay`
- Progress text: mono, muted

### Navigation Item

- Padding: `7px 8px`, `radius-xs` (3px)
- Default: `text-tertiary`
- Hover: `text-secondary` + `bg-hover`
- Active: `text-primary` + `bg-active`
- Icon: 14px, 18px wide box

### Leaderboard Row

- Horizontal: rank (mono, right-aligned, 24px wide) → avatar (24px circle) → name → address (mono, muted) → points (mono, bold)
- "You" row: `accent-muted` background, accent-colored text
- Hover: `bg-hover`
- Tab bar: bottom border active indicator using `text-primary` color (not accent)

---

## 6. Page Layouts

### Landing Page (Unauthenticated)

**Light theme.** Split into sections:

1. **Nav bar** — White background, logo text left, links + "Connect Wallet" button right. Border bottom.
2. **Hero** — Light grey background (#f4f4f5), subtle radial gradient (barely perceptible blue at top center). Kicker badge → H1 → description → two CTAs.
3. **Stats bar** — White background, border top. Four stats in a row (holders, points, submissions, JitoSOL).
4. **How It Works** — Dark section (#111113). Three cards in a grid: numbered steps (01, 02, 03) with title + description.
5. **Footer** — Minimal, dark.

### App Shell (Authenticated)

**Dark theme.** Three-part layout:

1. **Sidebar** (220px, fixed left) — Logo + nav items + profile footer. `bg-surface` with `border-subtle` right border.
2. **Header** (sticky top) — Page title left, badges + avatar right. `border-subtle` bottom. 48px height.
3. **Content area** — `bg-base` background, 24px padding. Scrollable.

### Dashboard Page

- Welcome text (muted) + "Command Center" heading
- 4-column stats grid: Rank, Weekly, Tier Progress, Claimable
- Active Quests section with quest items
- Leaderboard preview with tabs (Weekly / All Time / Season)

### Leaderboard Page

- Full-width table with rank, avatar, name, address, points
- Tab switching for time periods
- "You" row always visible (sticky or highlighted)

### Submit Page

- Form with submission type selector (post / blog / art)
- URL input for posts, rich text for blog, upload for art
- Preview panel showing how AI scoring dimensions will evaluate

### Quests Page

- Active quests (with progress) at top
- Available quests below
- Completed quests (collapsed)

### Profile Page

- Address, tier badge, join date
- Stats summary
- Submission history
- Point ledger

---

## 7. Motion

Minimal. No spring animations, no bouncy entrances.

- **Transitions:** 100ms for hovers, 150ms for state changes. `ease-out` only.
- **Page transitions:** None. Instant navigation.
- **Counters:** AnimatedCounter can remain but should be subtle (150ms duration).
- **Loading states:** Skeleton placeholders using `bg-raised` pulse. No spinner unless network-dependent.

---

## 8. Mobile

- Sidebar collapses to bottom nav bar (5 items)
- Header remains sticky
- Stat grid becomes 2-column
- Landing hero stacks vertically
- Touch targets: minimum 44px

---

## 9. What Changes from Current Codebase

### Delete / Replace
- `globals.css` — Complete rewrite. Remove all warm/IndieWeb tokens, replace with zinc neutrals.
- `design-tokens.ts` — Complete rewrite to match new palette.
- `NeonCard.tsx` — Rename and simplify. No "neon" anything. Just `Card.tsx`.
- `BehavioralLanding.tsx` — Rewrite for light theme, new hero, new structure.
- `HowItWorks.tsx` — Simplified three-card grid.
- `CommunityStats.tsx` — Stats bar component.
- `Footer.tsx` — Minimal dark footer.
- `Hero.tsx` / `HeroCanvas.tsx` — Already deleted.

### Modify
- `Header.tsx` — Simplify to page title + badges + avatar. Remove serif font, warm colors.
- `Sidebar.tsx` — Reduce width to 220px, new nav style, new profile footer.
- `MobileNav.tsx` — Restyle to match new palette.
- `PointsBadge.tsx` — Mono font badge, no star icon, no amber.
- `AuthControls.tsx` — Restyle buttons and verified badge.
- `WalletButton.tsx` — Primary button style, mono address display.
- `AnimatedCounter.tsx` — Keep functionality, reduce animation duration.
- `LoadingSkeleton.tsx` — Update pulse color to `bg-raised`.
- `layout.tsx` (root) — Update metadata, remove serif font references.
- `(auth)/layout.tsx` — Update background to `bg-base`.

### Keep As-Is
- All API routes — no visual changes needed.
- `lib/auth.ts`, `lib/db.ts`, `lib/scoring.ts`, etc. — backend logic unchanged.
- `lib/types.ts`, `lib/constants.ts` — update tier colors only.
- `AiOrNotPanel.tsx` — restyle to match new palette.

---

## 10. Files Changed Summary

| File | Action | Scope |
|---|---|---|
| `src/app/globals.css` | Rewrite | Full design system replacement |
| `src/lib/design-tokens.ts` | Rewrite | New token values |
| `src/app/layout.tsx` | Modify | Font refs, metadata |
| `src/app/page.tsx` | Modify | Light landing wrapper |
| `src/app/(auth)/layout.tsx` | Modify | Dark app shell |
| `src/components/landing/BehavioralLanding.tsx` | Rewrite | Light hero, new structure |
| `src/components/landing/HowItWorks.tsx` | Rewrite | Three-card grid |
| `src/components/landing/CommunityStats.tsx` | Rewrite | Stats bar |
| `src/components/landing/Footer.tsx` | Rewrite | Minimal dark footer |
| `src/components/layout/Header.tsx` | Modify | New styling |
| `src/components/layout/Sidebar.tsx` | Modify | 220px, new nav style |
| `src/components/layout/MobileNav.tsx` | Modify | New palette |
| `src/components/shared/NeonCard.tsx` | Rename + Rewrite | → `Card.tsx` |
| `src/components/shared/PointsBadge.tsx` | Modify | Mono badge |
| `src/components/shared/AuthControls.tsx` | Modify | Restyle |
| `src/components/shared/WalletButton.tsx` | Modify | Restyle |
| `src/components/shared/AnimatedCounter.tsx` | Modify | Reduce motion |
| `src/components/shared/LoadingSkeleton.tsx` | Modify | Update colors |
| `src/components/game/AiOrNotPanel.tsx` | Modify | Restyle |
| Dashboard, Submit, Leaderboard, Quests, Rewards, Profile pages | Modify | Apply new component styles |

---

## 11. Mockup Reference

Visual mockups are saved in `.superpowers/brainstorm/1025-1774587849/content/design-v2.html` and can be viewed by running the brainstorm server.
