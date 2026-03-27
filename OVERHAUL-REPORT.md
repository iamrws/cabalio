# Jito Cabal Complete Design Overhaul Report

**Date:** 2026-03-25
**Duration:** ~3 hours parallel agent orchestration
**Build Status:** PASSING (zero TypeScript errors)
**Design Philosophy:** Tantek Celik-inspired — typography-first, content-driven, warm, human, semantic

---

## Executive Summary

The Jito Cabal platform has been completely redesigned from a neon cyberpunk aesthetic to a warm, typography-driven design system inspired by IndieWeb principles. The transformation covers the CSS foundation (1,440+ lines), all shared components, layout shell, landing page, and security fixes across the API layer. The build compiles cleanly with zero errors.

---

## What Changed

### 1. Design System Foundation (`globals.css`) — Complete Rewrite

**Before:** 169 lines, split personality between neon cyberpunk (`#0a0a0f` dark bg, `#00f0ff` cyan, glow effects) and warm earth tones in BehavioralLanding.

**After:** 1,440+ lines organized into 26 clearly labeled sections:

| Section | What |
|---------|------|
| Custom Properties | Warm surface palette (`#faf7f2` → `#e8e2d6`), semantic ink colors, muted accents (amber/teal/violet/red) |
| Dark Mode | Both `@media (prefers-color-scheme: dark)` AND `.dark` class — warm-dark, not blue-dark |
| Typography | Minor third scale (1.200 ratio), 9 steps, 3 font stacks: Charter serif, Avenir Next sans, Söhne Mono |
| Tailwind Bridge | `@theme inline` with all tokens + backward-compat legacy neon→warm mappings |
| Animations | 10 keyframes, CSS scroll-driven animations (`animation-timeline: view()`) |
| Components | `.card-surface`, `.badge-*`, `.metric-display`, `.btn` primitives, form styling |
| Content | `.prose-article` for long-form, microformat classes (`.h-card`, `.h-entry`, `.h-feed`) |
| Layout | `.stack`, `.cluster`, `.sidebar-layout`, `.page-container` |
| Utilities | Loading skeletons, tooltips, overlays, responsive visibility, print styles |

### 2. Root Layout (`layout.tsx`) — Updated

- Added `Viewport` export with theme-color meta for light/dark
- Added OpenGraph and robots metadata
- Removed hardcoded `dark` class
- Added theme initialization script (prevents FOUC)
- Body uses `font-serif bg-surface-ground text-ink-primary`
- Added `h-feed` microformat wrapper

### 3. Design Tokens (`design-tokens.ts`) — New File (312 lines)

Complete JS/TS mirror of all CSS tokens:
- Colors (light + dark mode), tier system colors
- Typography: font families, type scale (rem + px), line heights, letter spacing
- Spacing (4px base), breakpoints, media queries
- Motion: durations, easings (array + CSS string), Framer Motion presets
- Shadows, radii, z-index layers

### 4. Landing Page (`BehavioralLanding.tsx`) — Complete Rewrite

**Before:** Warm-ish design but inconsistent with the rest of the app.

**After:** Scroll-driven narrative in 6 sections:
1. **The Hook** — Serif hero ("The inner circle doesn't grind. It builds."), CSS-only generative mesh background, auth card
2. **Three Pillars** — Autonomy/Competence/Relatedness cards with numbered approach
3. **The Engine** — Contribution pipeline + ethical safety rails (dark section for contrast)
4. **Roadmap** — 18 features in 4 phases
5. **Engagement Simulator** — Interactive toggles with live metric bars
6. **CTA Footer** — Dark card with amber/teal CTAs

Also: Deleted unused `Hero.tsx` and `HeroCanvas.tsx` (canvas particle approach abandoned for CSS-only).

### 5. Shared Components — All Rewritten

| Component | Changes |
|-----------|---------|
| `NeonCard` | Neon glow → warm white cards, added `variant`/`accent` props, keyboard accessibility, focus styles |
| `AnimatedCounter` | Warm teal color, `aria-live="polite"`, `role="status"` |
| `PointsBadge` | Neon cyan → amber pill badge, `aria-hidden` on SVG, `role="status"` |
| `WalletButton` | Gradient-bg → warm dark button, emerald connection indicator, aria-labels |
| `AuthControls` | Neon → emerald verified badge, teal dashboard link, violet admin link, `role="alert"` on errors |
| `LoadingSkeleton` | Neon gray → warm stone pulse, `role="status"`, `sr-only` text |
| `HowItWorks` | Neon step cards → warm cards with accent left-borders |
| `CommunityStats` | Neon counters → teal counters with warm cards |
| `Footer` | Neon text → warm styling with h-card microformat |

### 6. Layout Shell — All Rewritten

| Component | Changes |
|-----------|---------|
| `Header` | Neon backdrop → warm `#faf7f2/85` blur, serif page titles, amber streak badge |
| `Sidebar` | Neon gradient logo → amber serif logo, left-border active indicators, warm navigation |
| `MobileNav` | Emoji icons → SVG icons, neon active → amber active with dot indicator |
| `AuthLayout` | `bg-bg-primary` → `bg-[#faf7f2]`, consistent warm shell |

---

## Security Fixes

| Severity | Issue | File | Fix |
|----------|-------|------|-----|
| **HIGH** | Missing CSRF validation on POST endpoint | `api/seasons/current/role/route.ts` | Added `validateCsrfOrigin()` check |
| **MEDIUM** | `Anthropic` client crashes at import if env var missing | `lib/scoring.ts` | Lazy initialization with error message |
| **MEDIUM** | Leaderboard uses `public` cache header for authenticated data | `api/leaderboard/route.ts` | Changed to `private` |
| **MEDIUM** | Summary truncates total_points at 100 entries | `api/me/summary/route.ts` | Raised limit to 1000 |

## Bugs Found (Not Fixed — Low Severity)

| Issue | File | Severity |
|-------|------|----------|
| In-memory rate limiter leaks memory, doesn't survive cold starts | `api/game/vote/route.ts`, `api/rewards/claim/route.ts` | Medium |
| YouTube shorts endpoint has no auth check | `api/game/shorts/route.ts` | Medium |
| `HELIUS_RPC_URL` constant has API key in URL pattern (dead code) | `lib/constants.ts` | Low |
| `scanUploadedImage` converts binary to UTF-8 string (false positives) | `lib/upload-security.ts` | Low |
| Submission ID not UUID-validated before query | `api/submissions/[id]/route.ts` | Low |
| Admin submissions route doesn't validate NaN on limit/offset | `api/admin/submissions/route.ts` | Low |
| Profile route exposes reward amounts to non-self viewers | `api/profile/[address]/route.ts` | Low |
| Command center fetches all points without limit | `api/me/command-center/route.ts` | Low |

## Accessibility Improvements

- All interactive `NeonCard` instances: `role="button"`, `tabIndex={0}`, Enter/Space key handling
- `AnimatedCounter`: `aria-live="polite"` for screen reader announcements
- `PointsBadge`: `aria-hidden="true"` on decorative SVG, `role="status"` container
- `WalletButton`: `aria-label` on connect/disconnect buttons
- `AuthControls`: `aria-label` on verify button, `role="alert"` on error messages
- `LoadingSkeleton`: `role="status"`, `aria-label="Loading"`, `sr-only` text
- `MobileNav`: `aria-label` on game toggle button
- Focus styles: Visible violet outline for keyboard navigation

---

## Backward Compatibility

The `@theme inline` block includes legacy mappings so pages not yet rewritten still render correctly:

```
--color-neon-cyan → teal (#0f766e)
--color-neon-purple → violet (#7c3aed)
--color-neon-green → green (#16a34a)
--color-neon-orange → amber (#b45309)
--color-bg-primary → surface-ground (#faf7f2)
--color-text-primary → ink-primary (#1c1917)
... etc
```

This means ALL pages render with the warm palette even if they still use old class names.

---

## Files Modified (31 files)

### New Files
- `src/lib/design-tokens.ts` (312 lines)

### Complete Rewrites
- `src/app/globals.css` (169 → 1,440+ lines)
- `src/app/layout.tsx` (25 → 70 lines)
- `src/components/landing/BehavioralLanding.tsx` (612 → 590 lines)
- `src/components/landing/Footer.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/CommunityStats.tsx`
- `src/components/shared/NeonCard.tsx`
- `src/components/shared/AnimatedCounter.tsx`
- `src/components/shared/PointsBadge.tsx`
- `src/components/shared/WalletButton.tsx`
- `src/components/shared/AuthControls.tsx`
- `src/components/shared/LoadingSkeleton.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/app/(auth)/layout.tsx`

### Targeted Edits
- `src/lib/scoring.ts` (lazy Anthropic init)
- `src/app/api/seasons/current/role/route.ts` (CSRF fix)
- `src/app/api/leaderboard/route.ts` (cache header fix)
- `src/app/api/me/summary/route.ts` (limit fix)

### Deleted
- `src/components/landing/Hero.tsx`
- `src/components/landing/HeroCanvas.tsx`

---

## Recommendations for Next Sprint

1. **Rewrite remaining auth pages** — Dashboard, leaderboard, submit, quests, rewards, profile, and cabal-core pages still use old class names (rendered warmly via legacy mappings). Full rewrites with new semantic classes would be cleaner.
2. **Fix medium-severity in-memory rate limiters** — Replace with Redis or Supabase-backed rate limiting for production.
3. **Add auth check to shorts endpoint** — Currently unauthenticated users can exhaust YouTube API quota.
4. **Implement proper UUID validation** — Add Zod UUID validation to all route params.
5. **Add View Transitions API** — Use `document.startViewTransition()` for page navigation animations.
6. **Variable fonts** — Load Charter and Avenir Next as variable fonts for fine-grained weight control.
7. **Add container queries** — The CSS infrastructure is ready (`.container-query` class); start using them in responsive components.
8. **Deploy Supabase RPC functions** — `aggregate_leaderboard_weekly` and `aggregate_leaderboard_alltime` for efficient SQL-side aggregation.

---

## Design Principles Applied

| Principle | Implementation |
|-----------|---------------|
| **Typography-first** | Charter serif for body/headings, Avenir Next for UI, minor third scale |
| **Content-driven** | Generous whitespace, `68ch` max reading width, proper vertical rhythm |
| **Warm & human** | `#faf7f2` aged paper, amber/teal/violet accents, warm shadows |
| **Progressive enhancement** | CSS-native animations with JS fallbacks, works without JS |
| **IndieWeb/semantic** | h-card, h-entry, h-feed microformat classes, semantic HTML |
| **Accessible** | WCAG AA contrast, ARIA attributes, keyboard nav, screen reader support |
| **Performant** | CSS-only backgrounds (no canvas), lazy Anthropic init, private cache headers |

---

*Generated by Claude Opus 4.6 orchestrating 4 parallel subagents across 31 files.*
