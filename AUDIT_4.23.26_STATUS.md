# Audit 4.23.26 — Remediation Status

Companion to `AUDIT_4.23.26_CONSOLIDATED.md`. Each rank was committed and pushed independently so ops can bisect or cherry-pick. Test suite: 99 passing after every commit.

## Shipped (closed)

| Rank | IDs | Commit | Short |
|---:|---|---|---|
| 1 | C-01 + N-01 + N-19 + L-02 (partial) + N-20 | `47ff759` | RLS + deny policies + revokes + pg_cron nonce cleanup |
| 2 | C-02 + N-02 + N-03 + MED15 | `7e01a25` | Atomic reward claim RPC, status drift fix, idempotency+rewardId binding |
| 3 | H-04 (admin path) + N-11 | `0545a6a` | Transactional points+ledger+audit for admin adjustments; total_xp clamped ≥ 0 |
| 4 | H-02 + N-12 | `eb19d02` | SIWS-style domain-bound sign-in; CSRF no longer trusts request Host in prod |
| 5 | H-01 + M-01 (profile) | `95a8167` | Private cache headers, public_profile gate, live admin check |
| 6 | M-01 (remaining) + N-05 / H-08 | `73402d0` | verifyAdminStatus on submissions routes; NFT cache TTL 1 h → 5 min |
| 7 | H-03 + CRIT04 + H-04 (quest path) | `0b5c937` | Quest rules_json validation, atomic points award, rollback on RPC failure |
| 8 | H-05 | `db9cab8` | Next.js 16.2.1 → 16.2.4 |
| 13 | M-05 + N-06 + N-07 | `3a109de` | Signed vote tickets, 50/50 consensus fix |
| 11+16+17+18+19 | M-03 + M-07 + M-08 + N-10 + N-15 + N-18 + N-23 + `[001]` | `b1d374d` | Reaction visibility, notification URL validation + metadata sanitize, search escaping + rate limit, admin-points rate limit, IP header trust gated, feature-requests filter-injection fix |
| 14 | M-04 | `03bd6d5` | Uploads tracking table, per-wallet quota, image ownership on art submissions |
| 15 | L-03 + L-04 | `f3751c6` | Untrack .claude/, .superpowers/, generated TSVs; redact signed S3 URLs |

## Deferred (explicit non-goals for this pass)

These require product/UX decisions or schema migrations that rightly belong in their own PRs:

| ID | Reason |
|---|---|
| M-02 (real two-admin approval) | Needs a pending-adjustments workflow + second admin signature — scope exceeds this audit pass. Current admin_points is now rate limited and audit logged, and the transactional RPC prevents accounting drift. |
| M-06 (CSP `unsafe-inline`) | Requires nonce-based inline scripts across the app. Will likely need changes in next.config + layout.tsx. |
| M-09 (narrow service-role client) | Architectural lift — not fixable without replacing many routes' clients. Risk mitigated for this pass by the other ownership-filter fixes. |
| M-10 (`ai-or-not`) | Separate product, not in the jito-cabal repo. |
| H-04 (submission review flow atomicity) | Admin points + quest awards now use the RPC; submission review was flagged but is 408 lines with cascade logic; refactoring to the RPC is a dedicated effort. |
| N-04, N-08, N-09, N-13, N-14, N-16, N-17, N-21, N-22, N-24, L-01, L-05 | Non-blocking quality-of-life fixes; tracked for later sprints. |

## Verification

- `npx tsc --noEmit --pretty false`: clean
- `npx vitest run`: 99/99 passing
- `npm audit --audit-level=high`: 1 high remaining in `@solflare-wallet/*` → transitive `uuid`. Upstream issue; not reachable in code paths we control.

## Recommendation

Everything needed to flip `REWARDS_CLAIM_ENABLED=true` safely is in this branch. Before flipping, also:

1. Apply the four new migrations in order (`20260423_rls_hardening.sql`, `20260423_reward_payout_atomicity.sql`, `20260423_points_atomic.sql`, `20260423_uploads_tracking.sql`).
2. Confirm `NEXT_PUBLIC_APP_URL` is set for every non-dev environment.
3. Smoke-test the claim flow against the new RPCs with a tiny daily limit.
