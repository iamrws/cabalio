# Consolidated Audit — 2026-04-23

Produced by 6 parallel specialist subagents (auth/session, DB/RLS, business logic, input validation, backdoor/intrusion, code quality) on top of `AUDIT_4.22.26.md`. This document consolidates new findings, diffs against the prior audit, and ranks remediation via quadratic voting.

## Summary

- **Confirmed backdoors: 0.** No hardcoded admin wallets, no `eval`/base64-decode-exec, no `BYPASS_*/DEBUG/ADMIN_OVERRIDE` flags, no logic bombs, no suspicious exfiltration.
- **Existing audit findings (22) still valid**, all confirmed by new audit. None have been silently fixed in-tree.
- **24 new findings** surface on top of the prior audit (see "New" column below).
- **Rewards claim is currently gated** (`REWARDS_CLAIM_ENABLED=false`), which contains (but does not fix) the payout-accounting criticals. Do not flip that flag until the critical tier below is closed.

## Diff vs AUDIT_4.22.26.md

| Prior ID | Status | Notes |
|---|---|---|
| C-01 (RLS/revokes) | **Extended** | New audit finds 6 more tables with RLS enabled but *no policies* (reactions, quest_progress, audit_logs, rate_limits, admin_wallets, season_world_boss_updates). Broader than prior scope. |
| C-02 (payout idempotency) | **Extended** | New audit adds: idempotency key doesn't include `rewardId` (cross-claim), no audit log on cache hit, payout+insert atomicity gap. |
| H-01 (profile cache + privacy) | Still valid | No change in-tree. |
| H-02 (SIWS domain binding) | Still valid | No change. |
| H-03 (quest auto-approve) | **Extended** | Same approved submission can be reused across quests. |
| H-04 (points non-transactional) | Still valid | Reconfirmed across 4 routes. |
| H-05 (Next.js 16.2.1 advisory) | Still valid | `package.json` still pins `16.2.1`. |
| M-01 (stale admin/holder) | **Extended** | NFT-holder cache TTL 1 h; admin cache 24 h; middleware uses stale role. |
| M-02 (two-admin approval) | Still valid | Approver identity not cryptographically verified. |
| M-03 (reaction visibility) | Still valid | Applies to GET/POST/batch. |
| M-04 (upload quota/ownership) | Still valid | No change. |
| M-05 (game vote farming) | Still valid | Also affected by TOCTOU rate limit (HIGH09) and 50/50 consensus bug (HIGH10). |
| M-06 (CSP unsafe-inline) | Still valid | Live CSP confirms. |
| M-07 (notification URL) | Still valid | Metadata schema unvalidated. |
| M-08 (search .or sanitization) | **Extended** | Feature-requests route has unsafe `.or()` string interp. |
| M-09 (service-role global) | Still valid | Concrete gaps: some `update()` calls lack ownership filter re-check. |
| M-10 (ai-or-not) | Out of scope for this pass | Same state as prior. |
| L-01..L-05 | Still valid | No change. |

## New Findings (Not in Prior Audit)

| ID | Title | Severity |
|---|---|---|
| N-01 | 6 tables have RLS enabled but zero policies (default-deny relies on posture, not explicit DENY) | High |
| N-02 | Idempotency key lacks `rewardId` — two different claims can collide | Critical |
| N-03 | No audit log entry when idempotency cache returns a hit | Medium |
| N-04 | Scoring anomaly flags for human review but doesn't block manual approval at arbitrary score | Medium |
| N-05 | NFT holder cache TTL = 1 h lets transferred-out holders keep claiming | High |
| N-06 | Game vote rate-limit is check-then-insert (TOCTOU) | Medium |
| N-07 | Game vote 50/50 tie auto-matches vote to `'human'` regardless | Medium |
| N-08 | Submission `content_hash` excludes `type` and `image_path` from hash | Low |
| N-09 | Leaderboard week-boundary check recomputes `new Date()` twice | Low |
| N-10 | No rate limit on admin points endpoint | Medium |
| N-11 | Cascade-reject penalty can drive `total_xp` negative | Low |
| N-12 | CSRF validator trusts request `Host` header as fallback | High |
| N-13 | CSV formula-injection regex only checks first char (Unicode bypass) | Low |
| N-14 | Solana address regex allows invalid byte lengths | Low |
| N-15 | `x-forwarded-for` trusted unconditionally for IP rate limiting | Medium |
| N-16 | Submission dedup queries race before INSERT (no unique index) | Low |
| N-17 | Error logging occasionally passes full Supabase error to `console.error` (schema leak risk) | Low |
| N-18 | Auth nonce has no per-IP rate limit (only per-wallet) | Medium |
| N-19 | `engagement_events` policy allows reading rows with `wallet_address IS NULL` | Low |
| N-20 | `cleanup_expired_nonces()` defined but never scheduled | Low |
| N-21 | Dashboard/feed/leaderboard pages set `error` state but never render it | Medium (UX) |
| N-22 | Missing `aria-label`, `htmlFor`, `<nav>` landmarks on key components | Medium (a11y) |
| N-23 | No rate limit on `/api/search` | Medium |
| N-24 | Caret-ranged crypto deps (`@solana/web3.js`, `@supabase/supabase-js`, `tweetnacl` pinned but `@solana/*` not) | Low |

## Quadratic-Voting Priority Ranking

Scoring dimensions (1–5 each):
- **S** severity if exploited
- **E** exploitability (1 = theoretical, 5 = trivial)
- **B** blast radius (1 = single user, 5 = full compromise / treasury drain)
- **C** fix cost (1 = minutes, 5 = days / migration + code + tests)

QV-flavored priority: `score = (S² + E² + B²) / sqrt(C)`. Ranked desc.

| Rank | ID | Title | S | E | B | C | Score |
|---:|---|---|:-:|:-:|:-:|:-:|---:|
| 1 | C-01 + N-01 | Enable RLS + explicit policies + revokes on all server-only tables | 5 | 4 | 5 | 2 | 46.0 |
| 2 | C-02 + N-02 + MED15 | Fix reward payout idempotency, status enum drift, daily-limit atomicity, rewardId in idempotency key | 5 | 3 | 5 | 3 | 34.1 |
| 3 | H-04 | Move points/reward mutations into transactional Postgres RPCs with idempotency | 4 | 3 | 4 | 4 | 20.5 |
| 4 | H-02 | SIWS-style domain-bound sign-in message | 4 | 3 | 4 | 2 | 28.9 |
| 5 | H-01 | Private profile cacheable + `public_profile` ignored | 4 | 4 | 3 | 2 | 28.9 |
| 6 | M-01 | Stale admin/holder trust: live-verify, add token versioning, cut session TTL | 3 | 4 | 4 | 3 | 23.6 |
| 7 | H-03 + CRIT04 | Quest auto-approve validates rules_json and prevents submission re-use | 4 | 3 | 3 | 3 | 19.6 |
| 8 | N-12 | CSRF validator must not trust request `Host` | 4 | 2 | 4 | 1 | 36.0 |
| 9 | H-05 | Upgrade Next.js to 16.2.4 (or latest patched) | 3 | 3 | 3 | 1 | 27.0 |
| 10 | M-02 | True two-admin approval (signed approval record) | 3 | 3 | 4 | 3 | 19.6 |
| 11 | M-08 + N-18 | Escape/parameterize PostgREST `.or()` everywhere + add per-IP rate limits | 3 | 3 | 3 | 2 | 19.1 |
| 12 | M-03 | Reaction routes respect submission visibility | 3 | 3 | 2 | 2 | 15.6 |
| 13 | M-05 | Store issued video IDs for `/game/vote` and reject unissued + fix 50/50 consensus (N-07) + TOCTOU (N-06) | 3 | 4 | 3 | 2 | 24.0 |
| 14 | M-04 | Upload quota + owner tracking + `image_path` ownership on art submissions | 3 | 3 | 3 | 3 | 15.6 |
| 15 | M-06 | CSP: remove `unsafe-inline`, adopt nonce | 3 | 2 | 3 | 3 | 12.7 |
| 16 | M-07 | Notification metadata/URL validation + `safeInternalPath()` | 3 | 3 | 2 | 2 | 15.6 |
| 17 | N-10 | Rate limit admin points endpoint | 3 | 3 | 3 | 1 | 27.0 |
| 18 | N-15 | Only trust `x-forwarded-for` behind known proxy | 3 | 3 | 2 | 1 | 22.0 |
| 19 | N-23 | Rate limit `/api/search` | 2 | 3 | 2 | 1 | 17.0 |
| 20 | N-05 | Drop NFT holder cache TTL to 5 min | 3 | 3 | 2 | 1 | 22.0 |
| 21 | N-21 | Render error UI state on feed/leaderboard/dashboard | 2 | 5 | 2 | 1 | 33.0 |
| 22 | N-22 | Accessibility fixes (aria-label, htmlFor, `<nav>`) | 2 | 5 | 2 | 2 | 23.3 |
| 23 | N-17 | Sanitize error-log output (don't pass full Supabase error) | 2 | 2 | 2 | 1 | 12.0 |
| 24 | N-03 | Audit-log idempotency cache hits | 2 | 2 | 2 | 1 | 12.0 |
| 25 | N-20 | Schedule `cleanup_expired_nonces()` | 2 | 2 | 2 | 1 | 12.0 |
| 26 | N-16 | Unique indexes for submission dedup | 2 | 2 | 2 | 2 | 8.5 |
| 27 | L-01 | Regenerate `database.types.ts` | 2 | 1 | 2 | 2 | 6.4 |
| 28 | L-02 | `REVOKE EXECUTE` on RPC functions | 2 | 2 | 2 | 1 | 12.0 |
| 29 | L-03 | Stop tracking `.claude/`, `.superpowers/`, perf TSVs | 2 | 1 | 2 | 1 | 9.0 |
| 30 | L-04 | Remove signed S3 URLs from docs | 2 | 1 | 2 | 1 | 9.0 |
| 31 | N-24 | Pin exact crypto deps | 2 | 1 | 2 | 1 | 9.0 |
| 32 | N-08 | Include `type`/`image_path` in submission `content_hash` | 1 | 2 | 1 | 1 | 6.0 |
| 33 | N-09 | Cache `now` once for leaderboard week validation | 1 | 1 | 1 | 1 | 3.0 |
| 34 | N-13 | Harden CSV formula-injection escape | 1 | 2 | 1 | 1 | 6.0 |
| 35 | N-14 | Validate Solana addresses with `new PublicKey()` | 1 | 1 | 1 | 1 | 3.0 |
| 36 | N-19 | Restrict `engagement_events` anon-null read | 1 | 1 | 1 | 1 | 3.0 |
| 37 | N-11 | Clamp cascade-reject penalty at 0 | 1 | 1 | 1 | 1 | 3.0 |
| 38 | N-04 | Require re-score after anomaly flag | 1 | 2 | 1 | 1 | 6.0 |

## Execution Plan

Work proceeds strictly in rank order, with a GitHub push after each rank (or small cluster). Ranks 1–11 are the "must ship before flipping `REWARDS_CLAIM_ENABLED`" set.
