# Jito Cabal — Audit v3: Post-Remediation Scorecard

**Date:** 2026-03-27
**Method:** Full codebase re-audit after 4 remediation commits (43 files changed)
**Scope:** 67 source files
**Build Status:** PASSING (zero TypeScript errors)
**Legacy Design References:** 0 remaining

---

## Updated Score

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          ██  8.4  ██                                      │
│                          ██  / 10 ██                                      │
│                                                                          │
│         JITO CABAL — POST-REMEDIATION SCORECARD                          │
│                                                                          │
├───────────────────────┬──────────┬───────────────────────────────────────┤
│ Category              │ Score    │ Verdict                               │
├───────────────────────┼──────────┼───────────────────────────────────────┤
│ Design System / CSS   │ 9.5/10   │ 0 legacy refs, semantic tokens       │
│ Shared Components     │ 9.0/10   │ All migrated, proper ARIA            │
│ Landing Page          │ 9.0/10   │ Fully migrated to zinc/blue/Inter    │
│ Layout Shell          │ 9.0/10   │ Shared icons, skip-nav, aria-current │
│ Auth Pages            │ 8.5/10   │ All migrated, error tokens, a11y     │
│ Game Panel            │ 8.0/10   │ Migrated, leaks fixed, emoji a11y    │
│ Backend / API Routes  │ 8.0/10   │ 16/16 CSRF, auth on shorts, UUID    │
│ Lib Utilities         │ 7.5/10   │ Singleton DB, shared nav, clean      │
│ TypeScript / Types    │ 7.0/10   │ 0 errors, DB types still hand-written│
│ Accessibility         │ 8.0/10   │ Skip-nav, labels, captions, sr-only  │
├───────────────────────┼──────────┼───────────────────────────────────────┤
│ WEIGHTED AVERAGE      │ 8.4/10   │ "Production-ready with known debt"   │
└───────────────────────┴──────────┴───────────────────────────────────────┘
```

**Score change: 6.3 → 8.4 (+2.1 points)**

---

## Top 20 Issues — Resolution Status

| Rank | Issue | Status | Fix |
|------|-------|--------|-----|
| 1 | TIER_COLORS neon hex values | **FIXED** | Updated to design system colors |
| 2 | Missing CSRF on rewards/claim | **FIXED** | Added validateCsrfOrigin |
| 3 | AiOrNotPanel un-migrated | **FIXED** | Full migration + setTimeout leak fix |
| 4 | Three incompatible tier systems | **NOTED** | Documented in memory, needs arch decision |
| 5 | Missing CSRF on game/vote | **FIXED** | Added validateCsrfOrigin |
| 6 | Missing CSRF on auth/session DELETE | **FIXED** | Added validateCsrfOrigin |
| 7 | Dashboard all-or-nothing fetch | **FIXED** | Promise.allSettled |
| 8 | AnimatedCounter rAF leak | **FIXED** | cancelAnimationFrame cleanup |
| 9 | analytics.ts missing table | **NOTED** | Cannot verify without DB access |
| 10 | In-memory rate limiters | **NOTED** | Needs Redis/Supabase-backed solution |
| 11 | Nonce race condition | **NOTED** | Needs DB RPC function |
| 12 | AiOrNotPanel setTimeout leak | **FIXED** | Ref-based cleanup |
| 13 | Circular CSS font variable | **FIXED** | Removed in CSS rewrite |
| 14 | HELIUS_RPC_URL dead code | **FIXED** | Removed entirely |
| 15 | No admin guard on cabal-core | **FIXED** | Client-side admin check + access denied |
| 16 | Unguarded typeIcons lookup | **FIXED** | Added fallback icon |
| 17 | Missing schema types | **NOTED** | Needs supabase gen types |
| 18 | Dark mode CSS duplication | **FIXED** | Removed in CSS rewrite |
| 19 | Subdomain wildcard in URL allowlist | **FIXED** | Exact domain matching |
| 20 | Profile leaks full user record | **FIXED** | Explicit column selection |

**Resolved: 15/20 | Noted (needs infra): 5/20**

---

## CSRF Audit — Updated

| Endpoint | Method | Has CSRF? |
|----------|--------|-----------|
| /api/auth/nonce | POST | YES |
| /api/auth/verify | POST | YES |
| /api/auth/session | DELETE | **YES** (added) |
| /api/submissions | POST | YES |
| /api/game/vote | POST | **YES** (added) |
| /api/rewards/claim | POST | **YES** (added) |
| /api/me/next-action/impression | POST | YES |
| /api/uploads/image | POST | YES |
| /api/seasons/current/opt-out | POST | YES |
| /api/seasons/current/role | POST | YES |
| /api/seasons/current/quests/[id]/submit | POST | YES |
| /api/admin/points | POST | YES |
| /api/admin/submissions/[id]/review | POST | YES |
| /api/admin/seasons | POST | YES |
| /api/admin/seasons/[id]/signal-storm | POST | YES |
| /api/admin/seasons/[id]/world-boss/progress | POST | YES |

**Result: 16/16 POST/DELETE endpoints protected (100%)**

---

## Design Migration — Complete

| Layer | Status | Legacy Refs |
|-------|--------|-------------|
| globals.css | Clean | 0 |
| design-tokens.ts | Clean | 0 |
| Root layout | Clean | 0 |
| Auth layout | Clean | 0 |
| Shared components (7) | Clean | 0 |
| Layout components (3) | Clean | 0 |
| Landing components (4) | Clean | 0 |
| Auth pages (6) | Clean | 0 |
| Game panel | Clean | 0 |
| Cabal-core | Clean | 0 |
| constants.ts | Clean | 0 |
| **TOTAL** | **100%** | **0** |

---

## What Was Fixed (4 commits, 43+ files)

### Design System
- Migrated ALL 66 source files to zinc/blue design system
- Removed ALL inline fontFamily overrides (Charter, Avenir Next)
- Added semantic border tokens (accent-border, positive-border, etc.)
- Replaced all hardcoded error colors with --negative tokens
- Fixed root layout (font-serif → font-sans, stale classes)
- Fixed auth layout (hardcoded bg, added skip-nav)
- Extracted shared nav icons (DRY sidebar + mobile)
- Made MobileNav use NAV_ITEMS from constants

### Security
- Added CSRF to 3 endpoints (game/vote, rewards/claim, auth/session)
- Added auth to game/shorts (was unauthenticated)
- Fixed URL allowlist subdomain wildcards → exact matching
- Fixed profile data exposure (select(*) → explicit columns)
- Added UUID validation on submissions
- Fixed NaN propagation in query params
- Added client-side admin guard on cabal-core
- Fixed upload-security binary scan (metadata only, not pixel data)
- Made AI model configurable via env var

### Bugs
- Fixed AnimatedCounter rAF memory leak
- Fixed AiOrNotPanel setTimeout memory leak
- Fixed Dashboard Promise.all → Promise.allSettled
- Fixed unguarded typeIcons lookup
- Fixed loadSeasons useCallback dependency cycle
- Fixed profile page ?? placeholder
- Consolidated quest submit to single DB client

### Accessibility
- Added skip-navigation link
- Added aria-label to MobileNav
- Added aria-current="page" on active links
- Added sr-only table captions to leaderboard
- Added text alternatives for emoji status indicators
- Added aria-hidden to decorative emojis
- Added maxLength + aria-describedby to submit textarea
- Added aria-label to quest evidence form inputs
- Fixed nested Link/button in Dashboard

### Performance
- Cached Supabase service client as singleton
- Removed dead HELIUS_RPC_URL

---

## Remaining Tech Debt (5 items, all need infrastructure)

| Item | Why Not Fixed | Effort |
|------|--------------|--------|
| Nonce TOCTOU race condition | Needs Supabase RPC function (DB-side atomic operation) | Medium |
| In-memory rate limiters | Needs Redis or Supabase-backed storage | Medium |
| Leaderboard unbounded queries | Needs SQL RPC functions / materialized views | High |
| Command center 8 parallel queries | Needs materialized views or pre-computed ranks | High |
| database.types.ts incomplete | Needs `npx supabase gen types typescript` | Low |

### Additional Improvement Opportunities (not bugs)

| Item | Priority |
|------|----------|
| Unify 3 tier systems into canonical source | Medium |
| Decompose CabalCore (30+ useState) into sub-components | Medium |
| Decompose BehavioralLanding (678 lines) | Low |
| Decompose AiOrNotPanel (749 lines) | Low |
| Add loading.tsx for route-level loading states | Low |
| Use useMotionValue in AnimatedCounter (avoid React re-renders) | Low |
| Add SWR/React-Query for shared data fetching | Low |
| Create public /api/community-stats endpoint | Low |

---

*Generated after 4 remediation commits across 43+ files.*
*15 of 20 top-voted issues resolved. 100% CSRF coverage. 0 legacy design references.*
