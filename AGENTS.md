# AGENTS Playbook

This file captures the important outcomes and operating decisions from the March 24, 2026 working session.

## Project Intent

Build a holder-gated Jito Cabal community platform where:

- Public users connect wallet, sign in, and must hold a Jito Cabal NFT on Solana.
- Members submit work for points.
- Admin has a private moderation/review portal.
- Points are awarded only after review approval.

## User Preferences and Collaboration Rules

- Keep this GitHub repo continuously updated as work progresses: `https://github.com/iamrws/cabalio`.
- Prefer shipping production-safe architecture over prototype shortcuts.
- Keep `audit.md` updated as a remediation tracker.
- Keep implementation aligned with Web3-native constraints (wallet auth, holder gating, anti-abuse).

## Source of Truth Files

- Audit tracker: [audit.md](./audit.md)
- Market research context: [points-tracking-marketing-campaigns.md](./points-tracking-marketing-campaigns.md)
- Runtime/migration setup: [README.md](./README.md)

## Security and Auth Decisions

1. Do not trust client-supplied wallet headers for identity.
2. Identity must come from signed session cookies only.
3. Use wallet signature challenge flow:
   - `POST /api/auth/nonce`
   - `POST /api/auth/verify`
   - `GET/DELETE /api/auth/session`
4. Use Helius-based holder verification at login.
5. Remove dependency on `next-auth` for runtime auth.
6. Admin is wallet-allowlist based via env var `ADMIN_WALLET_ADDRESSES`.
7. Non-admin access to admin routes should return `404` (obscurity + authorization).

## Routing and Access Control

- Middleware file: [middleware.ts](./middleware.ts)
- Holder-protected app routes include:
  - `/dashboard`
  - `/submit`
  - `/leaderboard`
  - `/quests`
  - `/rewards`
  - `/profile/*`
- Holder-protected APIs include:
  - `/api/submissions/*`
  - `/api/leaderboard`
- Admin-only surfaces include:
  - `/cabal-core`
  - `/api/admin/*`

## Admin Portal Decision

- Admin portal route is `/cabal-core`.
- It is intentionally absent from normal public/member navigation.
- It provides moderation queue and review actions:
  - `approve` (runs AI scoring and awards points)
  - `reject`
  - `flag`

## Submission and Points Pipeline

Submission lifecycle:

- `submitted`
- `queued` (reserved for future queue worker)
- `ai_scored` (reserved)
- `human_review` (reserved)
- `approved`
- `flagged`
- `rejected`

Behavior:

1. Member submits content.
2. Content enters moderation queue as `submitted`.
3. Admin review triggers approval/rejection/flag.
4. On approval, AI scoring runs and points are awarded.
5. Points are written to immutable `points_ledger`.
6. Leaderboards use approved submissions only.

## Data Model Decisions

- `users` adds `holder_verified_at`.
- `submissions.status` constraint expanded to moderation workflow statuses.
- New `points_ledger` table for immutable point accounting.
- Migration created at:
  - [supabase/migrations/20260324_audit_hardening.sql](./supabase/migrations/20260324_audit_hardening.sql)

## API and Server Patterns

- Use `createServerClient()` for privileged DB operations in API routes.
- Use `getSessionFromRequest()` for authentication in all protected APIs.
- Validate by submission type:
  - `x_post` must be `x.com` / `twitter.com` URL.
  - `blog` requires minimum words.
  - `art` requires image path and minimum description length.
- Enforce anti-abuse:
  - per-wallet daily limits
  - duplicate URL/content detection
  - IP window rate limiting

## Frontend Integration Decisions

- Use `AuthControls` for wallet + sign-in + session state UX.
- Landing hero CTA is auth-aware.
- Core pages now API-backed (not static mock-only):
  - Dashboard
  - Submit
  - Leaderboard
  - Profile
  - Rewards
- Profile self-route fix implemented:
  - `/profile/me` redirects to `/profile/[wallet]`.

## Build and Tooling Decisions

- Google Font network dependency removed from runtime layout for restricted build environments.
- `next.config.ts` includes Turbopack root configuration.
- Required verification before handoff:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`

## Environment Variables Required

Use `.env.local` values matching `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_JITO_CABAL_COLLECTION_ADDRESS`
- `HELIUS_API_KEY`
- `ANTHROPIC_API_KEY`
- `NEXTAUTH_SECRET` (used as auth signing secret in current implementation)
- `ADMIN_WALLET_ADDRESSES`
- `AUTH_SESSION_MAX_AGE_SECONDS` (optional)

## Git Workflow Decision

- Primary remote: `origin -> https://github.com/iamrws/cabalio.git`
- Keep pushing incremental progress to `main` as work proceeds.
- Session push completed with commit:
  - `f0efb9f` (`Implement holder auth, admin moderation, and audit remediations`)

## Current Known Follow-ups

- Replace placeholder art `image_path` input with real upload/storage flow.
- Implement real reward claim transaction flow.
- Expand moderation metadata and audit logs for admin actions.
- Validate Supabase RLS policies against your deployed auth/JWT model.
