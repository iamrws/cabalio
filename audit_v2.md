# Jito Cabal — Olympic Judge Scorecard

**Date:** 2026-03-25
**Method:** Quadratic Voting across 4 independent agents (400 total credits)
**Scope:** 66 source files, every line read
**Build Status:** PASSING (zero TypeScript errors)

---

## Final Olympic Score

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          ██  6.3  ██                                      │
│                          ██  / 10 ██                                      │
│                                                                          │
│               JITO CABAL — OLYMPIC JUDGE SCORECARD                       │
│                                                                          │
├───────────────────────┬──────────┬───────────────────────────────────────┤
│ Category              │ Score    │ Verdict                               │
├───────────────────────┼──────────┼───────────────────────────────────────┤
│ Design System / CSS   │ 7.5/10   │ Excellent foundation, legacy debt     │
│ Shared Components     │ 7.0/10   │ Clean migrations, one holdout         │
│ Landing Page          │ 8.0/10   │ Best work in the codebase             │
│ Layout Shell          │ 7.5/10   │ Fully migrated, minor DRY issues      │
│ Auth Pages            │ 4.0/10   │ 92 legacy classes, NOT migrated       │
│ Game Panel            │ 3.0/10   │ 65 legacy refs, memory leaks, no a11y │
│ Backend / API Routes  │ 7.0/10   │ Strong auth, 3 missing CSRF           │
│ Lib Utilities         │ 6.5/10   │ 3 incompatible tier systems           │
│ TypeScript / Types    │ 5.5/10   │ Untyped Supabase, missing schemas     │
│ Accessibility         │ 5.0/10   │ Partial ARIA, no skip-link or traps   │
├───────────────────────┼──────────┼───────────────────────────────────────┤
│ WEIGHTED AVERAGE      │ 6.3/10   │ "Shows promise but incomplete"        │
└───────────────────────┴──────────┴───────────────────────────────────────┘
```

---

## Quadratic Vote Tally — Top 20 Issues by Total Votes

Issues flagged by multiple agents independently receive combined vote totals.
This is the ranked priority list for what to fix first.

| Rank | Issue | Agent(Votes) | Total | Category |
|------|-------|--------------|-------|----------|
| **1** | **TIER_COLORS in constants.ts uses neon hex (#00f0ff, #39ff14, #ffd700)** | Alpha(5) | **5** | design-coherence |
| **2** | **Missing CSRF on /api/rewards/claim POST** (financial endpoint) | Delta(5) | **5** | security |
| **3** | **AiOrNotPanel entirely un-migrated** (~65 old neon refs, hardcoded hex) | Beta(5) | **5** | design-coherence |
| **4** | **Three incompatible tier systems** (types.ts vs constants.ts vs engagement.ts) | Alpha(4) | **4** | design-coherence |
| **5** | **Missing CSRF on /api/game/vote POST** | Delta(4) | **4** | security |
| **6** | **Missing CSRF on DELETE /api/auth/session** | Delta(4) | **4** | security |
| **7** | **Dashboard all-or-nothing fetch** — one failed API kills all data | Gamma(4) | **4** | bug |
| **8** | **AnimatedCounter rAF memory leak** — no cancelAnimationFrame cleanup | Beta(4) | **4** | bug |
| **9** | **analytics.ts writes to `engagement_events` table not in schema** | Alpha(4) | **4** | bug |
| **10** | **In-memory rate limiters broken in serverless** (game/vote + rewards/claim) | Delta(3+2) | **5** | security |
| **11** | **Nonce mark-as-used race condition** in auth/verify | Delta(3) | **3** | security |
| **12** | **AiOrNotPanel setTimeout not cleared on unmount** | Beta(3) | **3** | bug |
| **13** | **Circular CSS font variable self-reference** in @theme inline | Alpha(3) | **3** | bug |
| **14** | **HELIUS_RPC_URL dead code encourages key-in-URL pattern** | Alpha(3) | **3** | security |
| **15** | **No client-side admin guard on cabal-core page** | Gamma(3) | **3** | security |
| **16** | **Unguarded typeIcons[submission.type] in dashboard** | Gamma(3) | **3** | bug |
| **17** | **Missing schema types** for admin_wallets, seasons, engagement_events | Alpha(3) | **3** | bug |
| **18** | **Dark mode CSS duplicated 75 lines** between @media and html.dark | Alpha(2) | **2** | code-smell |
| **19** | **Subdomain wildcard in URL allowlist** (.x.com, .twitter.com) | Delta(2) | **2** | security |
| **20** | **Profile endpoint leaks full user record** via select(*) | Delta(2) | **2** | security |

---

## Agent Budget Summary

| Agent | Domain | Files Read | Issues Found | Credits Used |
|-------|--------|-----------|--------------|-------------|
| Alpha | Foundation + Lib | 16/16 | 13 | 100/100 |
| Beta | Components | 15/15 | 22 | 91/100 |
| Gamma | Auth Pages | 9/9 | 57 | 100/100 |
| Delta | API Routes | 26/26 | 14 | 99/100 |
| **TOTAL** | **Full codebase** | **66/66** | **106** | **390/400** |

---

## CSRF Audit — Complete

| Endpoint | Method | Has CSRF? | Severity if Missing |
|----------|--------|-----------|-------------------|
| /api/auth/nonce | POST | YES | — |
| /api/auth/verify | POST | YES | — |
| /api/auth/session | DELETE | **NO** | Medium |
| /api/submissions | POST | YES | — |
| /api/game/vote | POST | **NO** | High |
| /api/rewards/claim | POST | **NO** | Critical |
| /api/me/next-action/impression | POST | YES | — |
| /api/uploads/image | POST | YES | — |
| /api/seasons/current/opt-out | POST | YES | — |
| /api/seasons/current/role | POST | YES | — |
| /api/seasons/current/quests/[id]/submit | POST | YES | — |
| /api/admin/points | POST | YES | — |
| /api/admin/submissions/[id]/review | POST | YES | — |
| /api/admin/seasons | POST | YES | — |
| /api/admin/seasons/[id]/signal-storm | POST | YES | — |
| /api/admin/seasons/[id]/world-boss/progress | POST | YES | — |

**Result: 13/16 POST/DELETE endpoints protected (81%). 3 missing.**

---

## Design Migration Status

| Layer | Files | Migrated | Legacy Refs | Status |
|-------|-------|----------|-------------|--------|
| globals.css | 1 | Yes* | 14 compat shims | Done (with aliases) |
| design-tokens.ts | 1 | Yes | 0 | Clean |
| layout.tsx | 1 | Yes | 0 | Clean |
| Shared components | 7 | 7/7 | 0 | Clean |
| Layout components | 3 | 3/3 | 0 | Clean |
| Landing components | 4 | 4/4 | 0 | Clean |
| Auth layout | 1 | 1/1 | 0 | Clean |
| **AiOrNotPanel** | 1 | **0/1** | **~65** | **NOT MIGRATED** |
| **Dashboard** | 1 | **0/1** | **~33** | **NOT MIGRATED** |
| **Leaderboard** | 1 | **0/1** | **~14** | **NOT MIGRATED** |
| **Submit** | 1 | **0/1** | **~28** | **NOT MIGRATED** |
| **Quests** | 1 | **0/1** | **~22** | **NOT MIGRATED** |
| **Rewards** | 1 | **0/1** | **~14** | **NOT MIGRATED** |
| **Profile [address]** | 1 | **0/1** | **~33** | **NOT MIGRATED** |
| **Cabal-core** | 1 | **0/1** | **~50** | **NOT MIGRATED** |
| constants.ts | 1 | **0/1** | **3 hex values** | **BROKEN** |

**Total legacy class references in unmigrated files: ~259**

*Note: These render with warm colors due to CSS backward-compat shims mapping old class names to warm values. But the code is dirty and the shims are tech debt.*

---

## Security Issue Summary

| Severity | Count | Issues |
|----------|-------|--------|
| Critical | 1 | Missing CSRF on financial rewards/claim endpoint |
| High | 2 | Missing CSRF on game/vote; broken in-memory rate limiters |
| Medium | 6 | Nonce race condition; admin review no idempotency; no transaction on multi-step ops; GET with write side-effects; admin two-admin approval honor-system; session DELETE no CSRF |
| Low | 15+ | UUID validation gaps, select(*) data leaks, unauthenticated shorts endpoint, etc. |

---

## Top 5 Bugs Found

1. **AnimatedCounter memory leak** — `requestAnimationFrame` chain never cancelled on unmount (Beta: 4 votes)
2. **AiOrNotPanel setTimeout leak** — 2-second timeout not cleared when panel closes (Beta: 3 votes)
3. **Dashboard all-or-nothing fetch** — one failed API in Promise.all kills all 5 data sources (Gamma: 4 votes)
4. **Unguarded typeIcons lookup** — `typeIcons[submission.type].label` crashes on unknown types (Gamma: 3 votes)
5. **analytics.ts targets missing table** — `engagement_events` not in schema definitions (Alpha: 4 votes)

---

## Architecture Smells

1. **Three incompatible tier systems** — `types.ts` (elite/member/initiate, weekly), `constants.ts` (same names, neon colors), `engagement.ts` (newcomer→founder, total points). No canonical source.
2. **Duplicate data fetching** — Header and Sidebar both independently call `/api/me/summary`. No SWR/React-Query.
3. **Duplicate nav items** — Sidebar imports `NAV_ITEMS` from constants; MobileNav hardcodes its own array.
4. **Duplicate SVG icons** — Sidebar and MobileNav define nearly identical icon maps.
5. **Both Framer Motion AND GSAP** — Two animation libraries (potential GSAP license issue for commercial use).
6. **30+ useState hooks in cabal-core** — Needs decomposition into sub-components.
7. **No shared data-fetching pattern** — Every page hand-rolls fetch + useState + useEffect + cancelled flag.
8. **Supabase queries entirely untyped** — `database.types.ts` exists but `Database` generic never passed to `createClient`.

---

## What's Actually Good

- **globals.css is genuinely excellent** — 1,446 lines of carefully organized, well-documented CSS with proper type scale, container queries, scroll-driven animations, microformat styling, and print styles
- **design-tokens.ts is comprehensive** — Perfect JS/CSS parity with typed exports
- **Landing page (BehavioralLanding) is the showpiece** — Typography-driven, warm, semantic, zero legacy classes
- **All shared components cleanly migrated** — NeonCard, PointsBadge, AuthControls with proper ARIA
- **Layout shell is fully warm** — Header, Sidebar, MobileNav all migrated
- **Auth flow is well-designed** — HMAC-signed tokens, nonce challenges, holder verification
- **Upload security is defense-in-depth** — Magic bytes, MIME cross-check, payload scanning
- **AI scoring has prompt-injection defenses** — Content separated from system prompt
- **Zod validation on all POST bodies** — Consistent input validation
- **Audit logging on admin actions** — Good accountability trail

---

## Verdict

The project has a **world-class foundation** (CSS, design tokens, landing page, component library) sitting on top of **half-migrated page code** and **a few real security gaps**.

If this were an Olympic performance:

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Artistic Impression** | 8.0 | The design vision is clear, the landing page is beautiful, the CSS foundation is exceptional |
| **Technical Execution** | 5.0 | 259 legacy class refs, 3 missing CSRF checks, memory leaks, untyped DB queries |
| **Difficulty** | 8.5 | A Solana NFT community platform with AI scoring, gamification, seasons, and ethical engagement is ambitious |
| **Completion** | 5.5 | 8 of 17 page/component files not migrated; the "show" half is done, the "work" half isn't |

### **Final Score: 6.3 / 10**

The foundation is medal-worthy. The execution needs another sprint.

---

*Generated by 4 QV agents reading 66 files line-by-line across 400 quadratic voting credits.*
*106 issues cataloged. Every file. Every line.*
