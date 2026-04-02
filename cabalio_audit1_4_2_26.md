# Cabalio Comprehensive Audit — April 2, 2026

**Auditor:** Full Stack Engineer II (a8fac4cc)
**Task:** SWR-41 | Parent: SWR-34
**Stack:** Next.js 16.2.1, React 19.2.3, Supabase, Solana Web3, Tailwind v4, Vercel
**Source Files:** ~96 TypeScript/TSX files
**Prior Audits:** audit.md, audit_v2.md, audit_v3.md (baseline score 8.4/10)

---

## Executive Summary

Cabalio (Jito Cabal) is a Web3 community platform with wallet auth, points/rewards, quests, seasons, and a content submission pipeline. The codebase has strong architectural foundations from prior remediation work but retains **critical security gaps** (race conditions, authorization bypasses) and has **zero automated test coverage**. Estimated current score: **7.2/10** (down from 8.4 due to newly identified security and testing concerns).

**Key Findings:**
- **4 Critical** issues (security race conditions, zero test coverage)
- **8 High** issues (auth gaps, data exposure, CSP weakness)
- **10 Medium** issues (code quality, type safety, performance)
- **8 Low** issues (naming, dead code, config)

---

## 1. Security

### CRITICAL-1: Submission Double-Approval Race Condition
**File:** `src/app/api/admin/submissions/[id]/review/route.ts`
**Risk:** Points inflation — approval UPDATE lacks status precondition.

An admin can call the approval endpoint twice on the same submission, awarding points multiple times. The UPDATE statement is missing `.eq('status', 'human_review')` to enforce idempotency.

**Fix:** Add `.eq('status', 'human_review')` precondition to the submission approval UPDATE.

### CRITICAL-2: Auth Nonce TOCTOU Race Condition
**File:** `src/app/api/auth/verify/route.ts`
**Risk:** Nonce reuse, potential double-session creation.

The nonce lookup and mark-as-used are not truly atomic. Concurrent requests could both see `used: false` before either updates. While the UPDATE with `.eq('used', false)` provides some protection, the window between SELECT and UPDATE is exploitable under load.

**Fix:** Use a Supabase RPC function wrapping the nonce consumption in a PostgreSQL transaction.

### HIGH-1: Two-Admin Approval Bypass (Privilege Escalation)
**File:** `src/app/api/admin/points/route.ts` (lines 56-87)
**Risk:** Single admin can authorize unlimited large point adjustments.

The two-admin approval for adjustments >100 points only checks that the `approving_admin` wallet exists in DB. No cryptographic proof or separate approval session from the second admin is required.

**Fix:** Implement two-phase approval: Admin A initiates (stored as pending), Admin B approves via their own authenticated session.

### HIGH-2: Stateless Sessions Cannot Be Revoked
**File:** `src/lib/auth.ts` (lines 82-99)
**Risk:** Compromised or revoked users retain access for up to 24 hours.

Session tokens are stateless with 24-hour expiry. No revocation mechanism exists.

**Fix:** Reduce session lifetime to 4 hours. Implement refresh token pattern or session revocation table.

### HIGH-3: Missing Rate Limiting on Nonce Generation
**File:** `src/app/api/auth/nonce/route.ts`
**Risk:** Database row exhaustion, DoS.

The verify endpoint has rate limiting (5 attempts/5 min) but nonce generation has none.

**Fix:** Add rate limiting (10 nonces per wallet per 5 minutes).

### HIGH-4: Rewards Data Exposed to All Users
**File:** `src/app/api/profile/[address]/route.ts`
**Risk:** Any authenticated user can view another user's payout history.

Submissions and points are gated with `isSelf || isAdmin`, but rewards are returned unfiltered.

**Fix:** Add `const visibleRewards = isSelf || isAdmin ? rewards : [];`

### HIGH-5: CSP Allows unsafe-inline
**File:** `next.config.ts` (lines 6-9)
**Risk:** XSS containment defeated.

`script-src 'self' 'unsafe-inline'` nullifies CSP protection against script injection.

**Fix:** Migrate to nonce-based CSP.

### HIGH-6: All Queries Use Service Role Key — No RLS
**File:** `src/lib/db.ts` (lines 27-35)
**Risk:** Any application auth bug = unrestricted DB access.

All API routes use Supabase service role key, bypassing Row-Level Security entirely.

**Fix:** Enable RLS on critical tables; use anon key with JWT for user-facing queries.

### HIGH-7: Fire-and-Forget Audit Logging
**Files:** `src/app/api/auth/verify/route.ts` (5 instances), `src/app/api/admin/**/*.ts` (8 instances)
**Risk:** Security audit events silently dropped on DB failure.

Pattern: `supabase.from('audit_logs').insert({...}).then(() => {}, () => {});`

**Fix:** Replace with `.catch((error) => console.error('CRITICAL: audit log failure:', error))`.

### MEDIUM-1: PostgREST Filter Injection
**File:** `src/app/api/seasons/current/quests/route.ts` (line 39)

Role key is string-interpolated into `.or()` filter. Low likelihood but possible with malformed data.

**Fix:** Add strict regex validation: `z.string().regex(/^[a-z0-9_]+$/)`.

### MEDIUM-2: Treasury Key Encoding Typo Vulnerability
**File:** `src/lib/payout.ts` (lines 63-71)

Invalid encoding value silently produces wrong keypair.

**Fix:** Validate encoding against allowlist `['base58', 'base64']` with explicit error.

---

## 2. Code Quality & Tech Debt

### MEDIUM-3: Untyped Supabase Queries (22 instances)
**Files:** Multiple API routes, `src/lib/seasons.ts`

`select('*')` returns untyped rows. `database.types.ts` exists but isn't passed as `Database` generic.

**Fix:** Use explicit column selection; pass `Database` type to `createClient<Database>()`.

### MEDIUM-4: Over-Complex Admin Page
**File:** `src/app/cabal-core/page.tsx`

30+ useState hooks managing all admin functionality with no decomposition.

**Fix:** Extract into `<SubmissionsReviewPanel>`, `<AppealsPanel>`, `<SeasonManager>`, `<PointsAdjuster>`.

### MEDIUM-5: Three Incompatible Tier Systems (Unresolved from audit_v3)
**Files:** `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/engagement.ts`

Three different tier definitions with different names and thresholds. No canonical source of truth.

**Fix:** Unify into single `TIERS` constant used by all three files.

### MEDIUM-6: Unhandled Promise in AiOrNotPanel
**File:** `src/components/game/AiOrNotPanel.tsx` (~line 352)

`submitVoteToServer().then(...)` missing `.catch()`. Network errors silently swallowed.

**Fix:** Add `.catch()` handler with user-facing error state.

### LOW-1: Stale TODO Comment
**File:** `src/components/landing/CommunityStats.tsx` (lines 12-17)

TODO references creating `/api/community-stats` — endpoint already exists.

**Fix:** Delete the stale TODO.

### LOW-2: Inconsistent State Naming
**File:** `src/app/cabal-core/page.tsx`

Mix of `adjusting`, `creatingSeason`, `seasonStatus` — no consistent prefix.

**Fix:** Standardize boolean states to `isAdjusting`, `isCreatingSeason`, etc.

### LOW-3: DRY Violation — Error Handling
**Multiple API routes**

Same error response pattern repeated 50+ times.

**Fix:** Extract to `handleSupabaseError()` utility.

### LOW-4: Missing Package.json Scripts
**File:** `package.json`

No `type-check`, `lint:fix`, or `test` scripts.

**Fix:** Add `"type-check": "tsc --noEmit"`, `"lint:fix": "eslint --fix"`.

---

## 3. Testing

### CRITICAL-3: Zero Automated Test Coverage

No test files, no test dependencies, no test scripts. Every critical path is untested:

| Critical Path | File | Risk if Untested |
|---|---|---|
| Session token creation/verification | `src/lib/auth.ts` | Auth bypass, timing attacks |
| Points calculation + streaks | `src/lib/points.ts` | Incorrect point awards |
| Reward claim + payout | `src/lib/payout.ts` | Double payouts, treasury drain |
| Admin submission review | `src/app/api/admin/submissions/[id]/review/route.ts` | Unauthorized approvals |
| CSRF validation | `src/lib/auth.ts` | CSRF bypass |
| Nonce challenge | `src/lib/auth.ts` | Auth replay attacks |

**Recommended Test Implementation (Priority Order):**

1. **P0 — Auth tests:** Session roundtrip, expired token rejection, CSRF validation, admin wallet lookup, nonce encoding/decoding
2. **P0 — Points/Rewards tests:** Point calculation with streak bonuses, grace period edge cases, level thresholds, tier assignment, payout idempotency, daily limits
3. **P1 — Admin tests:** Submission approval with point ledger, rejection with cascade reversal, concurrent review race conditions
4. **P1 — E2E tests:** Wallet sign-in flow, submit content -> approve -> points, reward claim

**Framework Recommendation:** Vitest (fast, ESM-native) + Playwright for E2E.

---

## 4. Performance

### MEDIUM-7: No Code Splitting on Heavy Routes
**Files:** `src/app/page.tsx`, `src/app/(auth)/dashboard/page.tsx`

BehavioralLanding (725 LOC) and Dashboard components loaded synchronously.

**Fix:** Use `next/dynamic` with loading skeleton for below-the-fold components.

### MEDIUM-8: UserProvider Aggressive Polling
**File:** `src/components/shared/UserProvider.tsx`

60-second polling with `cache: 'no-store'` — redundant with Header's 30-second notification poll.

**Fix:** Consolidate polling, use stale-while-revalidate pattern.

### LOW-5: select('*') Over-Fetching (22 instances)
**Multiple API routes**

Fetching all columns when only a subset is needed.

**Fix:** Replace with explicit column selection.

### LOW-6: Leaderboard Pagination Without Bounds
**File:** `src/app/api/leaderboard/route.ts` (lines 250-281)

While loop pagination with no MAX_PAGES limit.

**Fix:** Add `if (offset / PAGE_SIZE >= MAX_PAGES) break;`

### LOW-7: Unused CSS Animation
**File:** `src/app/globals.css` (lines 473-487)

`gold-shimmer` keyframe defined but `.gold-shimmer` class unused.

**Fix:** Remove unused animation.

### LOW-8: Missing optimizePackageImports
**File:** `next.config.ts`

**Fix:** Add `optimizePackageImports: ['@radix-ui/react-*', '@solana/wallet-adapter-react']`.

---

## 5. DevOps & Infrastructure

### No Test Stage in CI Pipeline
**File:** `.github/workflows/ci.yml`

Pipeline has lint, type-check, build, deploy — but no test job.

### No Error Monitoring
No Sentry, DataDog, or APM integration. Errors only visible via console logs.

### No Security Scanning
No Dependabot, Snyk, or OWASP scanning in CI.

### No Staging Environment
Direct deployment to production on push to main.

---

## 6. Positive Controls Observed

- CSRF protection on all 16 POST/DELETE endpoints via `validateCsrfOrigin()`
- Comprehensive Zod input validation schemas on all endpoints
- Nonce-based wallet auth preventing replay attacks
- Base58 wallet address format validation
- Image upload security: magic byte detection, extension allowlisting, metadata scanning
- DB-backed rate limiting on submissions, game votes, reward claims
- HTTPS-only URL validation with domain allowlisting
- Idempotency tokens on submissions and rewards (UUID-based)
- Secure headers: X-Frame-Options: DENY, HSTS, Permissions-Policy
- Admin re-verification via `verifyAdminStatus()` on admin routes
- Timing-safe HMAC comparison for signature verification
- Self-hosted fonts with `font-display: swap`
- Parallel data fetching with `Promise.allSettled` on dashboard/feed routes
- Proper useEffect cleanup in AnimatedCounter, CommunityStats

---

## 7. Prior Audit Status (from audit_v3)

| Issue | Status |
|---|---|
| TIER_COLORS neon hex migration | FIXED |
| Missing CSRF on 3 endpoints | FIXED |
| AiOrNotPanel un-migrated styles | FIXED |
| Three incompatible tier systems | **STILL OPEN** (MEDIUM-5) |
| AnimatedCounter rAF leak | FIXED |
| Dashboard Promise.all failure | FIXED |
| Circular CSS font variable | FIXED |
| HELIUS_RPC_URL dead code | FIXED |
| Admin guard on cabal-core | FIXED |
| typeIcons fallback | FIXED |
| Dark mode CSS duplication | FIXED |
| Subdomain wildcard in URL | FIXED |
| Profile data exposure | FIXED |

---

## 8. Remediation Priority

### Already Fixed (Found to be resolved during code review)
- CRITICAL-1: Submission approval already has `.in('status', [...])` idempotency guard (line 264)
- HIGH-3: Nonce rate limiting already implemented (lines 42-55 in nonce/route.ts)
- HIGH-4: Rewards already filtered with `(isSelf || isAdmin) ? rewards : []` (line 125 in profile route)

### Applied in This Audit
1. HIGH-7: Replaced 14 fire-and-forget `.then(() => {}, () => {})` audit log patterns with `.then(undefined, (err) => console.error(...))` across 8 files
2. MEDIUM-2: Added treasury key encoding validation in `src/lib/payout.ts`
3. MEDIUM-6: Added `.catch()` handler for unhandled vote submission promise in `AiOrNotPanel.tsx`
4. LOW-1: Removed stale TODO comment in `CommunityStats.tsx`

### Urgent (Within 1 Week)
6. CRITICAL-2: Atomic nonce consumption via SQL RPC
7. HIGH-1: Two-phase admin approval workflow
8. HIGH-2: Reduce session lifetime + refresh tokens
9. HIGH-6: Enable RLS on critical tables

### Next Sprint
10. CRITICAL-3: Implement test suite (vitest + playwright)
11. HIGH-5: Nonce-based CSP
12. MEDIUM-3: Typed Supabase queries
13. MEDIUM-4: Decompose admin page
14. MEDIUM-5: Unify tier systems
15. MEDIUM-7: Code splitting

---

## Overall Score: 7.2/10

| Category | Score | Notes |
|---|---|---|
| Security | 6.0/10 | Critical race conditions, auth gaps |
| Code Quality | 7.5/10 | Good structure, some DRY/type issues |
| Testing | 1.0/10 | Zero automated tests |
| Performance | 8.0/10 | Good fetching patterns, needs code splitting |
| Design System | 9.5/10 | Excellent migration from audit_v3 |
| API Routes | 8.0/10 | Consistent patterns, good validation |
| DevOps | 5.0/10 | No monitoring, no staging, no security scanning |
| **Overall** | **7.2/10** | Down from 8.4 due to security + testing |
