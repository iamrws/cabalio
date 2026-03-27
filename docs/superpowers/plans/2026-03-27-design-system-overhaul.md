# Design System Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the warm/IndieWeb design system with a Clean Web3 / Palantir-inspired aesthetic — zinc neutrals, single blue accent, light landing, dark app shell.

**Architecture:** CSS-first approach. Rewrite `globals.css` tokens and `design-tokens.ts` first (foundation), then update components bottom-up (shared → layout → landing → pages). Each task produces a working commit.

**Tech Stack:** Next.js 14+ App Router, Tailwind CSS v4, Framer Motion, Inter + JetBrains Mono fonts

**Spec:** `docs/superpowers/specs/2026-03-27-design-system-overhaul.md`

**Remote:** Push all commits to `https://github.com/iamrws/cabalio` (`origin main`)

---

## File Map

| File | Action | Task |
|---|---|---|
| `src/app/globals.css` | Rewrite | 1 |
| `src/lib/design-tokens.ts` | Rewrite | 1 |
| `src/app/layout.tsx` | Modify | 2 |
| `src/app/(auth)/layout.tsx` | Modify | 2 |
| `src/components/shared/NeonCard.tsx` → `Card.tsx` | Rename + Rewrite | 3 |
| `src/components/shared/PointsBadge.tsx` | Rewrite | 3 |
| `src/components/shared/LoadingSkeleton.tsx` | Modify | 3 |
| `src/components/shared/AnimatedCounter.tsx` | Modify | 3 |
| `src/components/shared/WalletButton.tsx` | Rewrite | 3 |
| `src/components/shared/AuthControls.tsx` | Rewrite | 3 |
| `src/components/layout/Sidebar.tsx` | Rewrite | 4 |
| `src/components/layout/Header.tsx` | Rewrite | 4 |
| `src/components/layout/MobileNav.tsx` | Rewrite | 4 |
| `src/components/landing/BehavioralLanding.tsx` | Rewrite | 5 |
| `src/components/landing/HowItWorks.tsx` | Rewrite | 5 |
| `src/components/landing/CommunityStats.tsx` | Rewrite | 5 |
| `src/components/landing/Footer.tsx` | Rewrite | 5 |
| `src/app/page.tsx` | Modify | 5 |
| `src/app/(auth)/dashboard/page.tsx` | Modify | 6 |
| `src/app/(auth)/leaderboard/page.tsx` | Modify | 6 |
| `src/app/(auth)/submit/page.tsx` | Modify | 7 |
| `src/app/(auth)/quests/page.tsx` | Modify | 7 |
| `src/app/(auth)/rewards/page.tsx` | Modify | 7 |
| `src/app/(auth)/profile/[address]/page.tsx` | Modify | 8 |
| `src/app/cabal-core/page.tsx` | Modify | 8 |
| `src/components/game/AiOrNotPanel.tsx` | Modify | 8 |
| `src/lib/constants.ts` | Modify (tier colors) | 3 |

---

### Task 1: Foundation — CSS Tokens & Design Tokens

Rewrite the entire design system foundation. Everything else builds on this.

**Files:**
- Rewrite: `src/app/globals.css`
- Rewrite: `src/lib/design-tokens.ts`

- [ ] **Step 1: Rewrite `src/app/globals.css`**

Replace the entire file. The new file defines all CSS custom properties for the new palette, typography, spacing, and component base styles. Key changes:
- Remove all warm/IndieWeb tokens (`--surface-ground`, `--ink-*`, `--accent-amber`, etc.)
- Replace with zinc neutrals (`--bg-base`, `--bg-surface`, etc.)
- Add light-mode tokens for landing page (`--bg-light`, `--text-light-*`)
- Single accent: blue `#3b82f6`
- Update Tailwind v4 theme bridge (`@theme`)
- Remove all serif font references (Charter, Sitka, Georgia)
- Add Inter + JetBrains Mono font stacks
- Tight radii (3–8px)
- Minimal shadows

```css
@import "tailwindcss";

/* ==========================================================================
   Jito Cabal Design System — Clean Web3 / Palantir-inspired
   Zinc neutrals, single blue accent, tight radii, minimal motion.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. CUSTOM PROPERTIES
   -------------------------------------------------------------------------- */
:root {
  /* --- Surfaces (Dark — App Shell) --- */
  --bg-base:           #111113;
  --bg-surface:        #18181b;
  --bg-raised:         #1f1f23;
  --bg-overlay:        #27272b;
  --bg-hover:          rgba(255,255,255,0.04);
  --bg-active:         rgba(255,255,255,0.06);

  /* --- Surfaces (Light — Landing) --- */
  --bg-light:          #f4f4f5;
  --bg-light-surface:  #ffffff;
  --bg-light-raised:   #fafafa;

  /* --- Borders --- */
  --border-subtle:       rgba(255,255,255,0.06);
  --border-default:      rgba(255,255,255,0.09);
  --border-strong:       rgba(255,255,255,0.14);
  --border-light:        #e4e4e7;
  --border-light-strong: #d4d4d8;

  /* --- Text (Dark) --- */
  --text-primary:   #fafafa;
  --text-secondary:  #a1a1aa;
  --text-tertiary:   #71717a;
  --text-muted:      #52525b;

  /* --- Text (Light) --- */
  --text-light-primary:   #09090b;
  --text-light-secondary: #3f3f46;
  --text-light-tertiary:  #71717a;

  /* --- Accent --- */
  --accent:       #3b82f6;
  --accent-dim:   #2563eb;
  --accent-muted: rgba(59,130,246,0.10);
  --accent-text:  #60a5fa;

  /* --- Semantic --- */
  --positive:       #22c55e;
  --positive-muted: rgba(34,197,94,0.10);
  --caution:        #eab308;
  --caution-muted:  rgba(234,179,8,0.08);
  --negative:       #ef4444;
  --negative-muted: rgba(239,68,68,0.08);

  /* --- Tier --- */
  --tier-elite:    #eab308;
  --tier-member:   #22c55e;
  --tier-initiate: #a1a1aa;

  /* --- Typography --- */
  --font-sans: 'Inter', -apple-system, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* --- Radii --- */
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* --- Spacing (4px base) --- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* --- Shadows --- */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);

  /* --- Motion --- */
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);

  /* --- Z-index --- */
  --z-base: 0;
  --z-raised: 10;
  --z-nav: 100;
  --z-overlay: 200;
  --z-modal: 300;
  --z-toast: 400;

  /* --- Layout --- */
  --sidebar-width: 220px;
  --header-height: 48px;
  --content-max: 1400px;
}

/* --------------------------------------------------------------------------
   2. TAILWIND v4 THEME BRIDGE
   -------------------------------------------------------------------------- */
@theme {
  --color-bg-base: var(--bg-base);
  --color-bg-surface: var(--bg-surface);
  --color-bg-raised: var(--bg-raised);
  --color-bg-overlay: var(--bg-overlay);

  --color-bg-light: var(--bg-light);
  --color-bg-light-surface: var(--bg-light-surface);

  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-border-light: var(--border-light);

  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-text-muted: var(--text-muted);

  --color-accent: var(--accent);
  --color-accent-dim: var(--accent-dim);
  --color-accent-muted: var(--accent-muted);
  --color-accent-text: var(--accent-text);

  --color-positive: var(--positive);
  --color-positive-muted: var(--positive-muted);
  --color-caution: var(--caution);
  --color-caution-muted: var(--caution-muted);
  --color-negative: var(--negative);
  --color-negative-muted: var(--negative-muted);

  --color-tier-elite: var(--tier-elite);
  --color-tier-member: var(--tier-member);
  --color-tier-initiate: var(--tier-initiate);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  --radius-xs: var(--radius-xs);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
}

/* --------------------------------------------------------------------------
   3. BASE STYLES
   -------------------------------------------------------------------------- */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-base);
  color: var(--text-primary);
  line-height: 1.5;
  font-size: 14px;
}

/* --------------------------------------------------------------------------
   4. TYPOGRAPHY UTILITIES
   -------------------------------------------------------------------------- */
.text-display {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.text-h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.text-h2 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.text-h3 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.text-body {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
}

.text-small {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

.text-caption {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.text-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1.4;
  color: var(--text-muted);
}

.text-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

/* --------------------------------------------------------------------------
   5. COMPONENT BASE STYLES
   -------------------------------------------------------------------------- */

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  border-radius: var(--radius-xs);
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  outline: none;
}
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn-primary {
  background: var(--text-primary);
  color: var(--bg-base);
}
.btn-primary:hover {
  background: #e4e4e7;
}

.btn-accent {
  background: var(--accent);
  color: white;
}
.btn-accent:hover {
  background: var(--accent-dim);
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
.btn-secondary:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  font-family: var(--font-mono);
  border-radius: var(--radius-xs);
}
.badge-default {
  background: var(--bg-raised);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}
.badge-accent {
  background: var(--accent-muted);
  color: var(--accent-text);
  border: 1px solid rgba(59,130,246,0.15);
}
.badge-positive {
  background: var(--positive-muted);
  color: var(--positive);
  border: 1px solid rgba(34,197,94,0.12);
}
.badge-caution {
  background: var(--caution-muted);
  color: var(--caution);
  border: 1px solid rgba(234,179,8,0.12);
}
.badge-negative {
  background: var(--negative-muted);
  color: var(--negative);
  border: 1px solid rgba(239,68,68,0.12);
}

/* Stat card */
.stat-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
}
.stat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-1);
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

/* Progress bar */
.progress-bar {
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--text-primary);
  transition: width var(--duration-normal) var(--ease-out);
}

/* Card */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  transition: border-color var(--duration-fast) var(--ease-out);
}
.card:hover {
  border-color: var(--border-default);
}
.card-raised {
  background: var(--bg-raised);
}

/* Skeleton */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
.skeleton {
  background: var(--bg-raised);
  border-radius: var(--radius-xs);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border-strong);
}

/* Focus ring */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Selection */
::selection {
  background: var(--accent-muted);
  color: var(--text-primary);
}
```

- [ ] **Step 2: Rewrite `src/lib/design-tokens.ts`**

Replace the entire file with JS/TS mirror of the new CSS tokens:

```typescript
/**
 * Design Tokens — JS/TS mirror of CSS custom properties in globals.css
 * Used for Framer Motion animations and dynamic styling.
 */

export const colors = {
  bg: {
    base: '#111113',
    surface: '#18181b',
    raised: '#1f1f23',
    overlay: '#27272b',
    hover: 'rgba(255,255,255,0.04)',
    active: 'rgba(255,255,255,0.06)',
  },
  bgLight: {
    base: '#f4f4f5',
    surface: '#ffffff',
    raised: '#fafafa',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    default: 'rgba(255,255,255,0.09)',
    strong: 'rgba(255,255,255,0.14)',
    light: '#e4e4e7',
    lightStrong: '#d4d4d8',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    muted: '#52525b',
  },
  textLight: {
    primary: '#09090b',
    secondary: '#3f3f46',
    tertiary: '#71717a',
  },
  accent: {
    default: '#3b82f6',
    dim: '#2563eb',
    muted: 'rgba(59,130,246,0.10)',
    text: '#60a5fa',
  },
  positive: { default: '#22c55e', muted: 'rgba(34,197,94,0.10)' },
  caution: { default: '#eab308', muted: 'rgba(234,179,8,0.08)' },
  negative: { default: '#ef4444', muted: 'rgba(239,68,68,0.08)' },
  tier: {
    elite: '#eab308',
    member: '#22c55e',
    initiate: '#a1a1aa',
  },
} as const;

export const typography = {
  fontSans: "'Inter', -apple-system, system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  display: { size: '44px', weight: 700, letterSpacing: '-0.035em', lineHeight: 1.1 },
  h1: { size: '24px', weight: 700, letterSpacing: '-0.025em', lineHeight: 1.2 },
  h2: { size: '18px', weight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h3: { size: '14px', weight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },
  body: { size: '14px', weight: 400, letterSpacing: '0', lineHeight: 1.6 },
  small: { size: '13px', weight: 500, letterSpacing: '0', lineHeight: 1.5 },
  caption: { size: '12px', weight: 500, letterSpacing: '0', lineHeight: 1.4 },
  label: { size: '11px', weight: 600, letterSpacing: '0.1em', lineHeight: 1.4 },
  mono: { size: '12px', weight: 500, letterSpacing: '0', lineHeight: 1.4 },
} as const;

export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
} as const;

export const radii = {
  xs: '3px', sm: '5px', md: '8px', lg: '12px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.3)',
  md: '0 4px 12px rgba(0,0,0,0.4)',
  lg: '0 8px 24px rgba(0,0,0,0.5)',
} as const;

export const motion = {
  fast: 100,
  normal: 150,
  easeOut: [0, 0, 0.2, 1] as const,
} as const;

export const layout = {
  sidebarWidth: 220,
  headerHeight: 48,
  contentMax: 1400,
} as const;

/** Tier color lookup — use in components that render tier-specific UI */
export const tierColor = {
  elite: colors.tier.elite,
  member: colors.tier.member,
  initiate: colors.tier.initiate,
} as const;
```

- [ ] **Step 3: Verify build compiles**

Run: `bun run build 2>&1 | head -30`

Expected: May show warnings for old token references in components (that's fine — we fix those in later tasks). Should not crash on globals.css or design-tokens.ts parsing.

- [ ] **Step 4: Commit and push**

```bash
git add src/app/globals.css src/lib/design-tokens.ts
git commit -m "feat: rewrite design system foundation — zinc neutrals, blue accent, tight radii"
git push origin main
```

---

### Task 2: Root Layouts — Fonts, Metadata, App Shell

Update the root layout and auth layout to use the new design system.

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Read current files**

Read `src/app/layout.tsx` and `src/app/(auth)/layout.tsx` to understand current structure.

- [ ] **Step 2: Update `src/app/layout.tsx`**

Changes needed:
- Replace font imports: remove any serif font (Charter, Georgia, etc.). Use `Inter` and `JetBrains Mono` from Google Fonts or `next/font`.
- Update `<html>` className to use new fonts.
- Remove any theme initialization script that references old tokens.
- Update metadata title/description.
- Keep the `Providers` wrapper and `body` structure intact.

If the file uses `next/font/google`, update to:
```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});
```

And on `<html>`:
```tsx
<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
```

On `<body>`:
```tsx
<body className="bg-bg-base text-text-primary font-sans antialiased">
```

Remove any dark mode theme script — the app is dark-only for authenticated users, light for landing.

- [ ] **Step 3: Update `src/app/(auth)/layout.tsx`**

This wraps all authenticated pages. Changes:
- Set background to `bg-[var(--bg-base)]` (or `bg-bg-base` via Tailwind theme)
- Ensure sidebar, header, mobile nav are included (keep existing structure)
- Remove any warm background classes (`bg-[#faf7f2]` or similar)

The layout should produce: `<div className="flex min-h-screen bg-[var(--bg-base)]">` as the outer wrapper.

- [ ] **Step 4: Verify the app loads**

Run: `bun run dev` (if not already running), open `http://localhost:3000` in browser.
Expected: Dark background on auth pages, may look broken (components not yet updated) — that's fine.

- [ ] **Step 5: Commit and push**

```bash
git add src/app/layout.tsx src/app/(auth)/layout.tsx
git commit -m "feat: update root layouts — Inter/JetBrains Mono fonts, dark app shell"
git push origin main
```

---

### Task 3: Shared Components — Card, Badge, Wallet, Auth, Skeleton, Counter

Rewrite all shared components to use the new design tokens.

**Files:**
- Rename + Rewrite: `src/components/shared/NeonCard.tsx` → `src/components/shared/Card.tsx`
- Rewrite: `src/components/shared/PointsBadge.tsx`
- Modify: `src/components/shared/LoadingSkeleton.tsx`
- Modify: `src/components/shared/AnimatedCounter.tsx`
- Rewrite: `src/components/shared/WalletButton.tsx`
- Rewrite: `src/components/shared/AuthControls.tsx`
- Modify: `src/lib/constants.ts` (tier colors)

- [ ] **Step 1: Read all current shared component files**

Read each file to understand current props interfaces and usage patterns.

- [ ] **Step 2: Create `src/components/shared/Card.tsx`**

Create new file. The card component replaces NeonCard with a clean, restrained design:

```tsx
'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', raised = false, onClick }: CardProps) {
  const base = raised
    ? 'bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]'
    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]';

  const interactive = onClick
    ? 'cursor-pointer transition-[border-color] duration-[var(--duration-fast)] hover:border-[var(--border-default)]'
    : '';

  return (
    <div
      className={`${base} ${interactive} p-4 ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Update all NeonCard imports to Card**

There are 8 files that import NeonCard. Update each one:
- `src/app/(auth)/dashboard/page.tsx` — change `import NeonCard from '@/components/shared/NeonCard'` to `import Card from '@/components/shared/Card'`
- `src/app/(auth)/submit/page.tsx` — same
- `src/app/(auth)/leaderboard/page.tsx` — same
- `src/app/(auth)/quests/page.tsx` — same
- `src/app/(auth)/rewards/page.tsx` — same
- `src/app/(auth)/profile/[address]/page.tsx` — same
- `src/app/cabal-core/page.tsx` — same
- `src/components/landing/HowItWorks.tsx` — change `import NeonCard from '../shared/NeonCard'` to `import Card from '../shared/Card'`

In each file, also replace `<NeonCard` with `<Card` and `</NeonCard>` with `</Card>`. Remove any NeonCard-specific props that don't exist on Card (like `variant="dark"`, `variant="elevated"`, `accentColor`, etc.). If the old component had `variant="elevated"`, use `raised` prop instead.

- [ ] **Step 4: Delete `src/components/shared/NeonCard.tsx`**

```bash
git rm src/components/shared/NeonCard.tsx
```

- [ ] **Step 5: Rewrite `src/components/shared/PointsBadge.tsx`**

Replace with a mono-font badge component:

```tsx
'use client';

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PointsBadge({ points, size = 'md', className = '' }: PointsBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`badge badge-default ${sizeClasses[size]} ${className}`}
      aria-label={`${points.toLocaleString()} points`}
    >
      {points.toLocaleString()} pts
    </span>
  );
}
```

- [ ] **Step 6: Update `src/components/shared/LoadingSkeleton.tsx`**

Read the current file. Replace any warm color references (stone, amber, etc.) with the skeleton class from globals.css:

The component should render divs with the `skeleton` class. Keep the existing width/height/variant props. Update colors: replace any `bg-stone-*` or `bg-amber-*` with just the `skeleton` CSS class (which uses `--bg-raised`).

- [ ] **Step 7: Update `src/components/shared/AnimatedCounter.tsx`**

Read the current file. Only change: reduce animation duration to 150ms (from whatever it was). Keep all existing functionality (Framer Motion counter). Remove any color/font references that use old tokens.

- [ ] **Step 8: Rewrite `src/components/shared/WalletButton.tsx`**

Read the current file to understand the wallet adapter integration. Rewrite the UI while keeping the wallet adapter hooks:

```tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export default function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="btn btn-primary"
      >
        Connect Wallet
      </button>
    );
  }

  const addr = publicKey.toBase58();
  const truncated = `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-mono text-[var(--text-tertiary)]">{truncated}</span>
      <button
        onClick={() => disconnect()}
        className="btn btn-ghost text-[11px] px-2 py-1"
      >
        Disconnect
      </button>
    </div>
  );
}
```

Note: Check the current file for exact wallet adapter imports — the above is the pattern. Adjust imports if the project uses a custom wrapper.

- [ ] **Step 9: Rewrite `src/components/shared/AuthControls.tsx`**

Read the current file to understand the auth flow (nonce, verify, session check). Rewrite the UI:
- Loading state: skeleton pulse
- Unauthenticated: WalletButton + "Verify" accent button
- Authenticated: truncated address (mono) + "Verified" positive badge + navigation links + logout ghost button

Keep all existing auth logic (fetch to `/api/auth/nonce`, signature verification, etc.). Only change styling and class names to use new design tokens.

- [ ] **Step 10: Update tier colors in `src/lib/constants.ts`**

Read the file. Find the tier color definitions and update:
- Elite: `#eab308` (was likely amber)
- Member: `#22c55e` (was likely teal)
- Initiate: `#a1a1aa` (was likely violet — now neutral grey)

- [ ] **Step 11: Verify build compiles**

Run: `bun run build 2>&1 | tail -20`
Expected: Compiles. Check for any remaining NeonCard references.

- [ ] **Step 12: Commit and push**

```bash
git add -A
git commit -m "feat: rewrite shared components — Card, PointsBadge, WalletButton, AuthControls"
git push origin main
```

---

### Task 4: Layout Components — Sidebar, Header, MobileNav

Rewrite the app shell layout components.

**Files:**
- Rewrite: `src/components/layout/Sidebar.tsx`
- Rewrite: `src/components/layout/Header.tsx`
- Rewrite: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Read current layout files**

Read all three files to understand current nav items, active state logic, and any data fetching.

- [ ] **Step 2: Rewrite `src/components/layout/Sidebar.tsx`**

Keep: navigation items array, active route detection (usePathname), any data fetching for user profile/tier.
Change: All styling to match spec section 5 (Navigation Item) and section 6 (App Shell).

Key structure:
```
<aside> (w-[220px], fixed, left-0, top-0, h-screen, bg-[var(--bg-surface)], border-r border-[var(--border-subtle)])
  <div> Logo (J mark + "Jito Cabal" text)
  <nav>
    <div> "Navigate" label
    <NavItem> Dashboard (◫)
    <NavItem> Submit (↗)
    <NavItem> Leaderboard (≡)
    <NavItem> Quests (⚑)
    <NavItem> Rewards (◆)
    <div> "Account" label
    <NavItem> Profile (○)
  </nav>
  <div> Profile footer (avatar, truncated address, tier badge)
</aside>
```

NavItem styling: `flex items-center gap-2 px-2 py-[7px] rounded-[var(--radius-xs)] text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-fast)]`

Active state: `text-[var(--text-primary)] bg-[var(--bg-active)]`

Width: 220px (was 260px).

- [ ] **Step 3: Rewrite `src/components/layout/Header.tsx`**

Keep: page title detection, any data fetching for points/streak.
Change: All styling.

Structure:
```
<header> (sticky, top-0, h-[48px], flex, items-center, justify-between, px-6, border-b border-[var(--border-subtle)], bg-[var(--bg-base)]/80, backdrop-blur-sm, z-[var(--z-nav)])
  <left> Page title (text-sm font-semibold tracking-tight)
  <right> Streak badge + Points badge + Avatar circle
</header>
```

No serif fonts. No warm colors. Clean and minimal.

- [ ] **Step 4: Rewrite `src/components/layout/MobileNav.tsx`**

Keep: nav items, active detection, AI or Not toggle (if present).
Change: All styling to match dark palette.

Structure: fixed bottom bar, `bg-[var(--bg-surface)]`, `border-t border-[var(--border-subtle)]`, 5 nav items centered. 44px minimum touch targets. Active item uses `text-[var(--text-primary)]`, inactive uses `text-[var(--text-muted)]`.

- [ ] **Step 5: Verify layout renders**

Open `http://localhost:3000` (may need to be authenticated or just check the landing page). Check that:
- Sidebar renders at 220px with correct dark styling
- Header is sticky with correct height
- No visual artifacts from old tokens

- [ ] **Step 6: Commit and push**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/Header.tsx src/components/layout/MobileNav.tsx
git commit -m "feat: rewrite layout — 220px sidebar, 48px header, dark mobile nav"
git push origin main
```

---

### Task 5: Landing Page — Light Theme Hero, Stats, How It Works, Footer

Rewrite all landing page components for the light theme.

**Files:**
- Rewrite: `src/components/landing/BehavioralLanding.tsx`
- Rewrite: `src/components/landing/HowItWorks.tsx`
- Rewrite: `src/components/landing/CommunityStats.tsx`
- Rewrite: `src/components/landing/Footer.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current landing page files**

Read all four landing component files and `src/app/page.tsx`.

- [ ] **Step 2: Update `src/app/page.tsx`**

The root page should render the landing page with a light background wrapper:

```tsx
import BehavioralLanding from '@/components/landing/BehavioralLanding';

export default function Home() {
  return (
    <div className="bg-[var(--bg-light)]">
      <BehavioralLanding />
    </div>
  );
}
```

Keep any existing auth redirect logic (if the page redirects authenticated users to dashboard).

- [ ] **Step 3: Rewrite `src/components/landing/BehavioralLanding.tsx`**

Replace the entire 6-section scroll experience with the new clean layout:

```tsx
'use client';

import HowItWorks from './HowItWorks';
import CommunityStats from './CommunityStats';
import Footer from './Footer';
import AuthControls from '../shared/AuthControls';

export default function BehavioralLanding() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-10 py-4 bg-[var(--bg-light-surface)] border-b border-[var(--border-light)]">
        <span className="text-[15px] font-bold tracking-tight text-[var(--text-light-primary)]">
          Jito Cabal
        </span>
        <div className="flex items-center gap-8">
          <a href="#how" className="text-[13px] font-medium text-[var(--text-light-tertiary)] hover:text-[var(--text-light-primary)] transition-colors">
            How It Works
          </a>
          <a href="#stats" className="text-[13px] font-medium text-[var(--text-light-tertiary)] hover:text-[var(--text-light-primary)] transition-colors">
            Leaderboard
          </a>
          <AuthControls compact />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-10 pt-24 pb-20 bg-[var(--bg-light)] text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,130,246,0.04),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-[580px] mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 text-xs font-medium text-[var(--text-light-tertiary)] bg-[var(--bg-light-surface)] border border-[var(--border-light)] rounded-[var(--radius-xs)]">
            ◆ Holder-Gated · On-Chain Verified
          </div>
          <h1 className="text-display text-[var(--text-light-primary)] mb-4">
            The contribution layer for Jito holders
          </h1>
          <p className="text-[16px] text-[var(--text-light-secondary)] leading-relaxed mb-8">
            Earn points by shipping quality content. AI-scored submissions, transparent
            leaderboards, and real JitoSOL rewards. No noise — just signal.
          </p>
          <div className="flex gap-3 justify-center">
            <AuthControls />
          </div>
        </div>
      </section>

      {/* Stats */}
      <CommunityStats />

      {/* How It Works */}
      <HowItWorks />

      {/* Footer */}
      <Footer />
    </div>
  );
}
```

Note: Check current file for exact AuthControls usage. The hero should render the wallet connect flow. Adjust `AuthControls` usage based on how the current component works (it may need different props for light-mode rendering).

- [ ] **Step 4: Rewrite `src/components/landing/CommunityStats.tsx`**

Stats bar component — light, clean:

```tsx
'use client';

import { useEffect, useState } from 'react';
import AnimatedCounter from '../shared/AnimatedCounter';

export default function CommunityStats() {
  const [stats, setStats] = useState({ holders: 0, points: 0, submissions: 0, jitosol: 0 });

  useEffect(() => {
    // Fetch from API or use static defaults
    setStats({ holders: 847, points: 142000, submissions: 3200, jitosol: 24.5 });
  }, []);

  const items = [
    { label: 'Holders', value: stats.holders },
    { label: 'Points Earned', value: stats.points, suffix: 'K', divisor: 1000 },
    { label: 'Submissions', value: stats.submissions, suffix: 'K', divisor: 1000 },
    { label: 'JitoSOL Distributed', value: stats.jitosol },
  ];

  return (
    <section id="stats" className="flex justify-center gap-14 px-10 py-7 bg-[var(--bg-light-surface)] border-t border-[var(--border-light)]">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-[20px] font-bold tracking-tight text-[var(--text-light-primary)] font-mono">
            {item.divisor
              ? `${(item.value / item.divisor).toFixed(item.value >= 1000 ? 0 : 1)}${item.suffix}`
              : item.value.toLocaleString()
            }
          </div>
          <div className="text-[11px] text-[var(--text-light-tertiary)] mt-0.5">
            {item.label}
          </div>
        </div>
      ))}
    </section>
  );
}
```

Adjust: check current file for any API call to `/api/leaderboard` or similar. Keep that fetch if it exists, just restyle the output.

- [ ] **Step 5: Rewrite `src/components/landing/HowItWorks.tsx`**

Dark section with three cards:

```tsx
import Card from '../shared/Card';

export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Verify your NFT',
      desc: 'Connect your wallet. We check your Jito Cabal NFT on-chain via Helius. No Discord roles, no forms.',
    },
    {
      num: '02',
      title: 'Submit content',
      desc: 'Share posts, write analysis, create art. Each submission is AI-scored across five quality dimensions.',
    },
    {
      num: '03',
      title: 'Earn rewards',
      desc: 'Accumulate points, climb the leaderboard, and claim JitoSOL rewards every week. Streaks multiply your earnings.',
    },
  ];

  return (
    <section id="how" className="bg-[var(--bg-base)] px-10 py-14">
      <h2 className="text-h2 text-[var(--text-primary)] text-center mb-2">How it works</h2>
      <p className="text-sm text-[var(--text-tertiary)] text-center mb-9">
        Three steps from wallet to rewards.
      </p>
      <div className="grid grid-cols-3 gap-3 max-w-[800px] mx-auto">
        {steps.map((step) => (
          <Card key={step.num} className="!p-5">
            <span className="text-[18px] font-mono text-[var(--text-muted)] block mb-2.5">{step.num}</span>
            <h3 className="text-h3 text-[var(--text-primary)] mb-1">{step.title}</h3>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{step.desc}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Rewrite `src/components/landing/Footer.tsx`**

Minimal dark footer:

```tsx
export default function Footer() {
  return (
    <footer className="bg-[var(--bg-base)] border-t border-[var(--border-subtle)] px-10 py-6">
      <div className="flex items-center justify-between max-w-[800px] mx-auto">
        <span className="text-xs text-[var(--text-muted)]">
          Jito Cabal · Holder-gated community platform
        </span>
        <div className="flex gap-6">
          <a href="#" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            Docs
          </a>
          <a href="#" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Verify landing page renders**

Open `http://localhost:3000`. The landing page should now show:
- Light nav bar with Jito Cabal logo
- Light hero with heading and CTAs
- Stats bar
- Dark "How It Works" section
- Dark footer

- [ ] **Step 8: Commit and push**

```bash
git add src/app/page.tsx src/components/landing/BehavioralLanding.tsx src/components/landing/HowItWorks.tsx src/components/landing/CommunityStats.tsx src/components/landing/Footer.tsx
git commit -m "feat: rewrite landing page — light hero, stats bar, dark features section"
git push origin main
```

---

### Task 6: Dashboard & Leaderboard Pages

Restyle the two most visible app pages.

**Files:**
- Modify: `src/app/(auth)/dashboard/page.tsx`
- Modify: `src/app/(auth)/leaderboard/page.tsx`

- [ ] **Step 1: Read current page files**

Read both files to understand data fetching, state management, and current JSX structure.

- [ ] **Step 2: Restyle `src/app/(auth)/dashboard/page.tsx`**

Keep: All data fetching (`useEffect`, API calls to `/api/me/summary`, `/api/me/command-center`, etc.), state variables, loading states.

Change all JSX styling:
- Page title: `text-h2` class, remove any serif references
- Stats grid: 4-column `grid grid-cols-4 gap-2.5` using `stat-card` / `stat-label` / `stat-value` CSS classes
- Quest section: quest items styled per spec (icon box + title + progress bar)
- Leaderboard preview: rows with mono rank, avatar, name, address, points. "You" row highlighted with `bg-[var(--accent-muted)]`
- Replace all `NeonCard` (already renamed to `Card` in Task 3) styling — remove any old variant props
- Replace all color classes: `text-amber-*` → `text-[var(--caution)]`, `text-teal-*` → `text-[var(--positive)]`, `bg-stone-*` → `bg-[var(--bg-raised)]`, etc.
- All data values (points, ranks, addresses) use `font-mono text-caption` styling
- Loading states use `skeleton` class

- [ ] **Step 3: Restyle `src/app/(auth)/leaderboard/page.tsx`**

Keep: All data fetching, tab switching logic, pagination.

Change styling:
- Tabs: `border-b border-[var(--border-subtle)]` with active tab having `border-b-[1.5px] border-[var(--text-primary)] text-[var(--text-primary)]`
- Rows: `flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--bg-hover)] transition-colors`
- Rank: `font-mono text-xs text-[var(--text-muted)] w-6 text-right`
- Avatar: `w-6 h-6 rounded-full bg-[var(--bg-overlay)] border border-[var(--border-subtle)]`
- Name: `text-[13px] font-medium flex-1`
- Address: `font-mono text-[11px] text-[var(--text-muted)]`
- Points: `font-mono text-xs font-semibold text-[var(--text-secondary)]`
- "You" row: `bg-[var(--accent-muted)]` with all text using `text-[var(--accent-text)]`

- [ ] **Step 4: Verify both pages**

Navigate to `/dashboard` and `/leaderboard`. Check styling matches the mockup in design-v2.html.

- [ ] **Step 5: Commit and push**

```bash
git add src/app/(auth)/dashboard/page.tsx src/app/(auth)/leaderboard/page.tsx
git commit -m "feat: restyle dashboard and leaderboard pages — zinc/mono data styling"
git push origin main
```

---

### Task 7: Submit, Quests, Rewards Pages

Restyle the remaining content pages.

**Files:**
- Modify: `src/app/(auth)/submit/page.tsx`
- Modify: `src/app/(auth)/quests/page.tsx`
- Modify: `src/app/(auth)/rewards/page.tsx`

- [ ] **Step 1: Read current page files**

Read all three files.

- [ ] **Step 2: Restyle `src/app/(auth)/submit/page.tsx`**

Keep: Form logic, submission type selector, API calls, file upload.

Change styling:
- Form inputs: `bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-xs)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none`
- Select/tabs for submission type: styled like the leaderboard tabs
- Submit button: `btn btn-accent`
- Labels: `text-label` class
- Cards wrapping form sections: `card` class

- [ ] **Step 3: Restyle `src/app/(auth)/quests/page.tsx`**

Keep: Quest fetching, role selection, opt-out logic, progress tracking.

Change styling:
- Quest cards: use quest-item styling from spec
- Icon boxes: `w-8 h-8 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-xs)] flex items-center justify-center`
- Progress bars: `progress-bar` / `progress-fill` CSS classes
- Progress text: `font-mono text-[11px] text-[var(--text-muted)]`
- Section headers: `text-label` class
- Active/available/completed groupings with proper spacing

- [ ] **Step 4: Restyle `src/app/(auth)/rewards/page.tsx`**

Keep: Rewards data, claim logic, JitoSOL calculations.

Change styling:
- Claimable amount: large mono value `text-2xl font-bold font-mono text-[var(--positive)]`
- Claim button: `btn btn-accent`
- History rows: same pattern as leaderboard rows
- Empty state: `text-sm text-[var(--text-muted)] text-center py-8`

- [ ] **Step 5: Verify all three pages**

Navigate to `/submit`, `/quests`, `/rewards`. Confirm styling is consistent with dashboard.

- [ ] **Step 6: Commit and push**

```bash
git add src/app/(auth)/submit/page.tsx src/app/(auth)/quests/page.tsx src/app/(auth)/rewards/page.tsx
git commit -m "feat: restyle submit, quests, and rewards pages"
git push origin main
```

---

### Task 8: Profile, Admin, AI Game — Final Pages & Cleanup

Restyle remaining pages and components.

**Files:**
- Modify: `src/app/(auth)/profile/[address]/page.tsx`
- Modify: `src/app/cabal-core/page.tsx`
- Modify: `src/components/game/AiOrNotPanel.tsx`

- [ ] **Step 1: Read current files**

Read all three files.

- [ ] **Step 2: Restyle `src/app/(auth)/profile/[address]/page.tsx`**

Keep: Profile data fetching, submission history, point ledger.

Change styling:
- Profile header: address in mono, tier badge using `badge-caution` for elite / `badge-positive` for member / `badge-default` for initiate
- Stats summary: `stat-card` components in a grid
- Submission history: card list with type indicator, score, date
- Point ledger: table rows with mono data

- [ ] **Step 3: Restyle `src/app/cabal-core/page.tsx`**

Keep: All admin logic (submission review, point distribution, allowlist checks).

Change styling:
- Admin header with "Cabal Core" title
- Tabs for different admin sections
- Review cards: `card` class with submission preview
- Approve/reject buttons: `btn btn-accent` / `btn btn-ghost` with `text-[var(--negative)]`
- Point distribution form: form input styling from Task 7

- [ ] **Step 4: Restyle `src/components/game/AiOrNotPanel.tsx`**

Keep: Game logic, context provider, voting mechanism.

Change styling:
- Panel background: `bg-[var(--bg-surface)] border-l border-[var(--border-subtle)]`
- Game cards: `card` class
- Vote buttons: `btn btn-secondary`
- Score display: mono font with stat card styling
- Toggle button in sidebar: `btn btn-ghost`

- [ ] **Step 5: Final build verification**

Run: `bun run build`
Expected: Full build succeeds with no errors. Warnings about unused variables are acceptable but no type errors or missing imports.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: restyle profile, admin, and AI game — complete design overhaul"
git push origin main
```

- [ ] **Step 7: Final cleanup check**

```bash
# Check for any remaining old token references
grep -r "surface-ground\|ink-primary\|accent-amber\|accent-teal\|accent-violet\|NeonCard" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Expected: No matches. If any remain, fix them and commit.

- [ ] **Step 8: Final commit and push (if cleanup needed)**

```bash
git add -A
git commit -m "chore: remove remaining old design token references"
git push origin main
```
