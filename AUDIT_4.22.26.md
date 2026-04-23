# Cabalio Security and Code Quality Audit - 4.22.26

Prepared for the `jito-cabal` app deployed at `cabalio.dev` / `www.cabalio.dev`.

## Executive Summary

This audit reviewed the local `jito-cabal` Next.js/Supabase/Vercel codebase, the live deployment headers, and adjacent `ai-or-not` project risk. The app has a solid baseline in several places: signed HttpOnly session cookies, server-side wallet signature verification, CSRF origin checks on state-changing routes, upload magic-byte validation, typed Zod request bodies, security headers, and focused tests for critical library helpers.

The current risk posture is still not production-safe for financial/reward operations. The most important issues are:

- Server-intended Supabase tables are missing RLS/revokes, creating a direct anon-key bypass risk.
- Reward payout accounting has schema/code drift and ambiguous retry behavior that can defeat rate limits, daily limits, and payout idempotency.
- Private profile responses are marked publicly cacheable and ignore the stored `public_profile` setting.
- Wallet sign-in messages are not domain-bound, leaving the app exposed to signature relay/phishing.
- Quest auto-approval and points mutations have business-logic/accounting gaps.
- `npm audit` reports high-severity advisories for the deployed Next.js version and Vite in the test toolchain.

No intentional backdoor was found. The biggest blind spot is that the app relies heavily on service-role Supabase access and route-level filters. That makes every missing route predicate, stale role claim, cache header, or DB policy drift a potential data or financial integrity issue.

## Scope

Reviewed:

- `jito-cabal/src/app/api/**`
- `jito-cabal/src/lib/**`
- `jito-cabal/middleware.ts`
- `jito-cabal/next.config.ts`
- `jito-cabal/supabase/**`
- `jito-cabal/package*.json`, config, docs, tracked local artifacts
- Live response headers for `https://cabalio.dev`
- Adjacent `ai-or-not/frontend` and `ai-or-not/backend` for obvious security and dependency risk

Not performed:

- No authenticated dynamic penetration test against production.
- No direct Supabase project inspection beyond local SQL/migrations.
- No secret rotation or code remediation in this pass.

## Automated Checks

Main app:

- `npm test`: passed, 4 files / 96 tests.
- `npx tsc --noEmit --pretty false`: passed.
- `npx eslint src middleware.ts next.config.ts --max-warnings=0`: passed.
- `npm run lint`: timed out after about 120 seconds. The narrower eslint run passed; the full script likely traverses tracked local agent/worktree artifacts because `.claude/` and `.superpowers/` are in the repo.
- `npm audit --audit-level=low`: failed with 21 vulnerabilities: 2 high, 19 moderate.

Adjacent projects:

- `ai-or-not/frontend npm audit`: 13 vulnerabilities, 12 high, 1 moderate.
- `ai-or-not/backend npm audit`: 7 vulnerabilities, 2 high, 5 moderate.

Live deployment probe:

- `https://cabalio.dev` redirects 307 to `https://www.cabalio.dev/`.
- Vercel headers include HSTS, CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Live CSP still includes `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'`.
- Live homepage sends `Access-Control-Allow-Origin: *`; this is low risk for public HTML, but should not appear on authenticated API responses.

## Critical Findings

### C-01: Missing RLS/revokes on server-intended Supabase tables

Evidence:

- `supabase/migrations/20260325_auth_nonces.sql:4`
- `supabase/migrations/20260329_notifications.sql:2`
- `supabase/migrations/20260330_appeals.sql:1`
- `supabase/migrations/20260422_feature_requests.sql:2-4`
- `supabase/full-setup.sql:105`, `supabase/full-setup.sql:541`, `supabase/full-setup.sql:558`

The migrations create `auth_nonces`, `notifications`, `submission_appeals`, and `feature_requests` without enabling RLS and without revoking direct `anon` / `authenticated` access. `20260422_feature_requests.sql` explicitly says service-role only and "no RLS policies needed", but that is only true if database privileges enforce it.

Exploit scenario:

An attacker with the public Supabase anon key directly calls PostgREST against these tables, bypassing route-level CSRF, validation, rate limiting, ownership filters, and admin checks. Depending on actual project grants, this can expose notification contents, appeal records, feedback emails/IP hashes/user agents/admin notes, and auth nonce rows, or allow writes/DoS against those tables.

Remediation:

- Enable RLS on every table in `public`, including server-only tables.
- Revoke direct table access for server-only tables:
  - `revoke all on public.auth_nonces from anon, authenticated;`
  - `revoke all on public.notifications from anon, authenticated;`
  - `revoke all on public.submission_appeals from anon, authenticated;`
  - `revoke all on public.feature_requests from anon, authenticated;`
- Add explicit owner read policies only where direct client access is intentionally required.
- Add a migration test/checklist that fails when a new public table lacks RLS.

### C-02: Reward payout workflow can break idempotency and daily limits

Evidence:

- DB status check allows only `pending_payout|processing|completed|failed`: `supabase/migrations/20260325_security_audit_fixes.sql:56-57`, `supabase/full-setup.sql:263-264`
- Claim route inserts `status: 'paid'`: `src/app/api/rewards/claim/route.ts:199-205`
- Daily limit queries `reward_claims`: `src/lib/payout.ts:118-128`
- Payout executes before claim row insert: `src/app/api/rewards/claim/route.ts:172-205`
- Failed/ambiguous payout rolls reward back to claimable: `src/app/api/rewards/claim/route.ts:178-188`

The route sends SOL, then inserts a `reward_claims` row with `status: 'paid'`, but the schema rejects `paid`. The insert error is logged and not returned to the user. That means a successful transfer can lack the claim row used for idempotency, rate limiting, and daily-limit accounting. Separately, `checkDailyLimit()` only checks `todayTotal < limit`, not `todayTotal + currentClaim <= limit`, and it is not transactional.

Exploit scenario:

If payouts are enabled, a user with multiple claimable rewards can drain beyond the configured daily payout limit because successful payouts may not be recorded in `reward_claims`, and concurrent claims can all pass the non-locking daily check. If Solana submission succeeds but confirmation times out, the route may make the same reward `claimable` again, allowing a duplicate treasury transfer.

Remediation:

- Decide one payout model:
  - queue model: insert `pending_payout`, worker sends SOL, worker marks `completed`; or
  - synchronous model: persist `processing` before send, then mark `completed`.
- Standardize status enum and code. Do not use `paid` unless the DB allows it and all queries use it consistently.
- Fail closed if claim recording fails.
- Enforce daily budget inside a Postgres transaction/RPC with a row lock or advisory lock, checking `todayTotal + claimAmount <= limit`.
- Never automatically roll back to `claimable` after ambiguous chain errors. Store a processing record and reconcile on-chain status first.

## High Findings

### H-01: Private profile data is publicly cacheable and privacy settings are ignored

Evidence:

- Viewer/admin branch: `src/app/api/profile/[address]/route.ts:36-37`
- Private-expanded payload for self/admin: `src/app/api/profile/[address]/route.ts:95-128`
- Public cache header: `src/app/api/profile/[address]/route.ts:144`
- Stored `public_profile` setting: `src/app/api/me/settings/route.ts:15-17`

`/api/profile/[address]` returns rewards, private submissions, and full point history for self/admin, but sends `Cache-Control: public, max-age=60, s-maxage=300`. The same route also ignores `preferences.privacy.public_profile`, despite the settings API storing it.

Exploit scenario:

A user or admin requests `/api/profile/<wallet>` and Vercel/CDN caches the private response by URL. Another holder requesting the same URL can receive the private cached payload. Separately, any holder can request a profile even after the target user has disabled public profile visibility.

Remediation:

- Change viewer-dependent responses to `Cache-Control: private, no-store` and `Vary: Cookie`.
- Split public and private profile APIs, or only cache a strictly public payload.
- Read `preferences.privacy.public_profile` and return 404/403 to non-self/non-admin viewers when disabled.
- Replace `session.role === 'admin'` with live `verifyAdminStatus()`.

### H-02: Wallet sign-in message is not domain-bound

Evidence:

- Sign-in message fields: `src/lib/auth.ts:218-224`
- Challenge generation: `src/app/api/auth/nonce/route.ts:69-76`
- Signature verification: `src/app/api/auth/verify/route.ts:122-125`
- Client signing: `src/components/shared/AuthControls.tsx:75-76`

The signed message contains wallet, nonce, and issued time, but no domain, URI, chain ID, version, or resource scope.

Exploit scenario:

A phishing site requests a real challenge for the victim wallet, relays the exact message to the victim for signing, then submits the signature with the attacker's challenge cookie. The server sees a valid signature for the victim wallet and issues a session.

Remediation:

- Adopt a SIWS-style message: domain, URI, chain ID, statement, nonce, issued/expiration time, and version.
- Verify domain/URI against the request host and configured canonical app URL.
- Show the expected domain in wallet-signing UI.
- Keep nonce expiry short and keep nonce single-use checks.

### H-03: Quest auto-approval trusts any approved submission

Evidence:

- Quest evidence schema: `src/app/api/seasons/current/quests/[questId]/submit/route.ts:12`
- Source submission lookup: `src/app/api/seasons/current/quests/[questId]/submit/route.ts:176-190`
- Auto-approve insert: `src/app/api/seasons/current/quests/[questId]/submit/route.ts:194-204`
- Immediate points award: `src/app/api/seasons/current/quests/[questId]/submit/route.ts:231-244`

If the referenced submission is owned by the user and has status `approved`, it auto-completes the quest and awards quest points. The route does not validate quest rules, required submission type, topic, time window, or content against `rules_json`.

Exploit scenario:

A user submits one approved low-effort or unrelated submission, then reuses it to auto-complete any quest accepting `submission_id` evidence, collecting rewards without satisfying the quest.

Remediation:

- Define machine-checkable quest rule fields in `rules_json`.
- Validate referenced submission type, creation time, content/category, and quest-specific constraints server-side.
- Default to admin review unless strict criteria pass.
- Add unique idempotency for quest rewards.

### H-04: Points/accounting mutations are not transactional

Evidence:

- Manual points: `src/app/api/admin/points/route.ts:145-186`
- Submission approve/reward: `src/app/api/admin/submissions/[id]/review/route.ts:253-327`, `src/app/api/admin/submissions/[id]/review/route.ts:354-376`
- Quest auto-approve XP/ledger: `src/app/api/seasons/current/quests/[questId]/submit/route.ts:231-281`

Submission status changes, user XP updates, audit logs, notifications, and ledger inserts are performed as separate Supabase calls. Some insert errors are not checked.

Exploit scenario:

A transient DB/network failure can approve a submission without a ledger row, adjust `users.total_xp` without matching immutable accounting, or create ledger entries without matching state. Reward projections, leaderboards, and audit trails diverge.

Remediation:

- Move points-bearing mutations into Postgres RPC functions that run in one transaction.
- Use idempotency keys and unique constraints for each award source.
- Check every mutation result and return failure if ledger/audit writes fail.
- Add a reconciliation job that compares `users.total_xp` to `sum(points_ledger.points_delta)`.

### H-05: Deployed Next.js and Vite toolchain have high-severity advisories

Evidence:

- `package.json:30` pins `next` to `16.2.1`.
- `npm audit` reports `GHSA-q4gf-8mx6-v5v3`, fixed by `next@16.2.4`.
- `package.json:51` uses `vitest`, pulling vulnerable `vite 8.0.4`.
- `package.json:22-27` pulls the vulnerable Solana wallet dependency chain.

Exploit scenario:

The Next.js advisory is reachable in production as a denial-of-service risk. Vite issues are primarily dev/test-server file-read/path-traversal risks, but become serious if a dev server is exposed or CI/test artifacts are reachable.

Remediation:

- Upgrade `next` and `eslint-config-next` to `16.2.4`, regenerate lockfile, redeploy.
- Upgrade Vitest/Vite when patched versions are available.
- Track Solana wallet dependency advisories; remove unused adapters and test compatible overrides.
- Never expose dev/test servers publicly.

## Medium Findings

### M-01: Revoked holder/admin access remains valid until session expiry

Evidence:

- 24-hour default session: `src/lib/auth.ts:7`
- Role/holder embedded in token: `src/lib/auth.ts:88-99`
- Middleware trusts token holder/role: `middleware.ts:65-76`
- Reward claim trusts `session.isHolder`: `src/app/api/rewards/claim/route.ts:59`
- Stale admin role checks: `src/app/api/submissions/route.ts:180`, `src/app/api/submissions/[id]/route.ts:37`, `src/app/api/submissions/[id]/appeal/route.ts:137`, `src/app/api/profile/[address]/route.ts:37`

An NFT transfer or admin revocation is not reflected until the cookie expires. Some non-admin routes use the stale `session.role === 'admin'` claim instead of `verifyAdminStatus()`.

Remediation:

- Shorten access tokens for privileged actions.
- Add server-side session/token versioning and revocation.
- Revalidate holder status before rewards and other value-bearing actions.
- Replace direct role checks with live `verifyAdminStatus()`.

### M-02: Large manual point "two-admin approval" is spoofable

Evidence:

- `src/app/api/admin/points/route.ts:56-86`
- Audit metadata trusts submitted `approving_admin`: `src/app/api/admin/points/route.ts:110-114`, `src/app/api/admin/points/route.ts:176-180`

A single admin can type another active admin wallet into `approving_admin`. The second admin does not authenticate, sign, or submit an approval action.

Remediation:

- Create pending adjustment records.
- Require a second authenticated admin session to approve.
- Optionally require a wallet signature over adjustment ID, target wallet, delta, and expiry.

### M-03: Reaction APIs expose/interact with non-public submissions by UUID

Evidence:

- POST only verifies existence: `src/app/api/submissions/[id]/react/route.ts:74-83`
- GET only verifies existence: `src/app/api/submissions/[id]/react/route.ts:142-153`
- Batch endpoint does not check submission visibility: `src/app/api/submissions/reactions/batch/route.ts:48-92`

The reaction routes do not apply the same visibility policy as `GET /api/submissions/[id]`.

Exploit scenario:

Any authenticated holder who guesses or obtains a rejected/private submission UUID can infer existence, read reaction metadata, or add reactions to non-public content.

Remediation:

- Centralize `canViewSubmission(session, submission)` and reuse it.
- Allow reactions only on approved submissions, or on own/admin-visible submissions if explicitly desired.

### M-04: Upload storage lacks quota and art submissions do not verify image ownership

Evidence:

- Upload limit only per file: `src/app/api/uploads/image/route.ts:45-54`
- Upload path includes wallet segment: `src/app/api/uploads/image/route.ts:72-80`
- Art submission only regex-checks path: `src/app/api/submissions/route.ts:60-62`, `src/app/api/submissions/route.ts:139-144`
- File size constant: `src/lib/constants.ts:22`

Holders can upload unlimited 5 MB files, and an art submission can reference another user's uploaded path if known.

Remediation:

- Add per-wallet upload rate and storage quota.
- Persist uploaded objects in an `uploads` table with owner, hash, size, and status.
- Require `image_path` ownership before accepting an art submission.

### M-05: Game votes can be farmed with arbitrary video IDs

Evidence:

- `videoId` accepts any syntactically valid string: `src/app/api/game/vote/route.ts:8-11`
- Votes with fewer than 3 prior votes auto-match: `src/app/api/game/vote/route.ts:83-94`
- Points inserted for arbitrary IDs: `src/app/api/game/vote/route.ts:107-120`

Exploit scenario:

A holder scripts unique random `videoId` values. Because early votes default to `matched`, each vote can farm points without using videos issued by `/api/game/shorts`.

Remediation:

- Store eligible videos served by `/api/game/shorts` with expiry.
- Reject votes for unknown/expired videos.
- Consider using a signed server token for each served short.

### M-06: CSP weakens XSS containment

Evidence:

- `next.config.ts:5-13`
- Live CSP matches the local policy and includes `script-src 'unsafe-inline'`.

Inline scripts and broad YouTube script execution reduce the blast-radius protection normally provided by CSP.

Remediation:

- Move to nonce/hash-based CSP for scripts.
- Keep inline styles only where required and documented.
- Prefer iframe isolation for YouTube and set the YouTube player `origin` parameter.

### M-07: Notification links are pushed without URL validation

Evidence:

- `src/components/layout/Header.tsx:153-155`
- `src/components/layout/TopNav.tsx:115-116`
- Notification metadata is stored untyped: `src/lib/notifications.ts:18-20`, `src/lib/notifications.ts:31-37`

If any path allows notification metadata tampering or unsafe metadata creation, clicking a notification can navigate to an external or `javascript:` URL.

Remediation:

- Add `safeInternalPath()` and only allow paths beginning with `/`.
- Reject `//`, backslashes, control characters, and all schemes.
- Validate metadata before inserting notifications.

### M-08: Search uses raw PostgREST `.or()` string with incomplete escaping

Evidence:

- Sanitization: `src/app/api/search/route.ts:39`
- Raw `.or()` filter: `src/app/api/search/route.ts:46`

The code strips `%`, `_`, backslash, and quotes, but not all PostgREST control characters such as commas and parentheses. This can cause query parse errors and may allow filter manipulation.

Remediation:

- Avoid raw `.or()` strings for untrusted text where possible.
- Escape according to PostgREST syntax, or move search into a parameterized RPC.
- Add tests with commas, parentheses, dots, and operator-like strings.

### M-09: Service-role client is global, making route filters the real boundary

Evidence:

- `src/lib/db.ts:21-32`
- Broad usage across API routes: `createServerClient()` appears throughout `src/app/api/**`.

Service role bypasses RLS. Any missing `.eq('wallet_address', session.walletAddress)`, stale admin check, or bad cache header exposes privileged data.

Remediation:

- Keep service-role usage in narrow server-only data-access modules.
- Consider a least-privilege Supabase client or custom Postgres roles for read-only user queries.
- Add ownership-filter tests for every route returning user-specific data.

### M-10: Adjacent `ai-or-not` project has production-grade risks

Evidence:

- Frontend: `ai-or-not/frontend/package.json:18-19`, `ai-or-not/frontend/src/lib/api.ts:103-126`
- Backend: `ai-or-not/backend/package.json:20`, `ai-or-not/backend/package.json:26`, `ai-or-not/backend/src/middleware/auth.ts:5`, `ai-or-not/backend/src/index.ts:51-61`
- `npm audit` reports 13 vulnerabilities in frontend and 7 in backend.

Risks include vulnerable Next 14, `next-pwa` chain advisories, JWT fallback secret, token storage in `localStorage`, permissive CORS with credentials, and public Swagger docs.

Remediation:

- Upgrade dependencies.
- Remove fallback JWT secret and fail startup if missing.
- Use HttpOnly cookies instead of localStorage bearer tokens.
- Configure a fixed CORS origin and disable credentials with `*`.
- Gate docs outside local development.

## Low and Hygiene Findings

### L-01: Database types are stale

Evidence:

- `src/lib/database.types.ts:6`
- `src/lib/database.types.ts:268`

`database.types.ts` omits newer tables and functions, including `auth_nonces`, `notifications`, `submission_appeals`, `feature_requests`, `reward_claims`, and RPC functions.

Remediation:

- Regenerate with `supabase gen types typescript`.
- Type `createClient<Database>()`.

### L-02: RPC execute privileges are not explicitly locked down

Evidence:

- `src/lib/sql/rpc-functions.sql:2`, `src/lib/sql/rpc-functions.sql:18`, `src/lib/sql/rpc-functions.sql:31`, `src/lib/sql/rpc-functions.sql:47`
- `supabase/migrations/20260325_leaderboard_aggregation.sql:5`, `supabase/migrations/20260325_leaderboard_aggregation.sql:23`
- `supabase/migrations/20260401_sum_positive_points.sql:3`

No `SECURITY DEFINER` hazards were found, but function execute grants are not explicitly revoked.

Remediation:

- `revoke execute on function ... from public, anon, authenticated` unless direct execution is intended.
- Grant narrowly to app roles/functions.

### L-03: Local agent artifacts are tracked

Evidence:

- Tracked: `.claude/settings.local.json`, `.claude/worktrees/*`, `.superpowers/brainstorm/*`, `perf-results.tsv`, `results.tsv`
- `.claude/settings.local.json` includes `"Allow All"`.

These files create repo noise, slow tooling, and may encode local tool permissions or server state.

Remediation:

- `git rm --cached` local agent/worktree artifacts.
- Add `.claude/`, `.superpowers/`, `.gstack/`, and generated TSV/state files to `.gitignore` as appropriate.

### L-04: Signed external S3 URLs are committed in docs

Evidence:

- `points-tracking-marketing-campaigns.md:27`
- `points-tracking-marketing-campaigns.md:96`

The URLs include `AWSAccessKeyId`, `Signature`, and `x-amz-security-token` query parameters.

Remediation:

- Replace with local/static images or permanent public URLs.
- Do not commit signed URLs, even if expired.

### L-05: Admin page can reject valid older admin sessions client-side

Evidence:

- `src/app/cabal-core/page.tsx:478-506`
- `src/lib/auth.ts:15-20`
- `src/app/api/auth/session/route.ts:6-12`

The page checks `session.isAdmin === true`; older signed tokens may only have `role: 'admin'`.

Remediation:

- Check `session.role === 'admin' || session.isAdmin === true`, or expose a dedicated server-validated admin session endpoint.

## Positive Observations

- Session cookie is HttpOnly, SameSite strict, and HMAC-signed.
- CSRF origin validation is present on most state-changing routes.
- Nonces are signed in a challenge cookie and consumed single-use in the DB.
- Admin API routes generally return 404 for non-admin users.
- Upload validation checks extension, Content-Type, magic bytes, SVG exclusion, suspicious markers, and double extensions.
- React escaping is used; no `dangerouslySetInnerHTML` was found.
- CSV export guards against formula injection.
- Tests cover auth, upload security, payout, and points helpers.
- Live deployment has HSTS, frame denial, content sniffing protection, referrer policy, and a CSP baseline.

## Prioritized Remediation Plan

1. Immediately enable RLS/revokes for server-only Supabase tables and verify direct anon-key access fails.
2. Disable `REWARDS_CLAIM_ENABLED` until payout claim state, daily limits, ambiguous retries, and schema status values are fixed.
3. Patch `/api/profile/[address]`: enforce `public_profile`, remove public caching, add `Vary: Cookie`, and use live admin verification.
4. Upgrade Next.js to `16.2.4` and redeploy.
5. Replace wallet sign-in text with a domain-bound SIWS-style message.
6. Move all points/reward mutations into transactional RPCs with idempotency.
7. Fix quest auto-approval to validate `rules_json` against referenced submission data.
8. Replace stale admin/holder token trust on sensitive routes with live checks or token versioning.
9. Add upload owner/quota tracking.
10. Clean tracked local artifacts and regenerate Supabase database types.

## Suggested Regression Tests

- Direct Supabase anon-key smoke test: every server-only table returns denied.
- Profile cache test: self/admin/private responses include `private, no-store` and are never served to another session.
- Profile privacy test: non-self holder cannot view a disabled public profile.
- Reward claim tests: schema status compatibility, daily limit includes current claim, concurrent claims cannot exceed limit, ambiguous Solana failure cannot retry blindly.
- Quest tests: approved submission only auto-completes quests it actually satisfies.
- Admin revocation test: revoked admin cannot use stale session on any elevated route.
- Reaction visibility test: rejected/private submissions cannot be reacted to by other holders.
- Upload ownership test: art submission rejects another wallet's image path.
- Game vote test: arbitrary unissued video IDs are rejected.
- Search escaping test: commas, parentheses, dots, and operator-looking strings do not alter filters.

