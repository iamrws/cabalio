# Audit Remediation Tracker

## Security and Auth

- [x] Wallet header spoofing removed from write APIs
- [x] Wallet-signature auth implemented (`/api/auth/nonce`, `/api/auth/verify`)
- [x] Signed session cookies implemented
- [x] Server-side middleware protection for holder-only routes and APIs
- [x] NFT holder verification enforced during login
- [x] Collection address moved to environment variable

## Admin and Authorization

- [x] Hidden admin portal implemented at `/cabal-core`
- [x] Admin-only API namespace added (`/api/admin/*`)
- [x] Admin wallet allowlist support via `ADMIN_WALLET_ADDRESSES`
- [x] Non-admin access to admin routes returns `404`

## Submission Pipeline and Points

- [x] Submission flow moved to moderation-first (`status: submitted`)
- [x] Admin review actions added (`approve`, `reject`, `flag`)
- [x] AI scoring moved to admin approval step
- [x] Points awarded only on approval
- [x] Immutable `points_ledger` table integrated in review flow
- [x] Duplicate checks and IP wallet rate limiting added

## Data and Schema

- [x] Schema updated for moderation statuses and holder verification timestamps
- [x] Points ledger schema added
- [x] Supabase migration file added: `supabase/migrations/20260324_audit_hardening.sql`
- [x] RLS baseline policies added in migration script

## Product Surface Wiring

- [x] Submit page wired to real API flow
- [x] Dashboard wired to real submissions feed
- [x] Leaderboard wired to API
- [x] Leaderboard upgraded to aggregate from `points_ledger` (weekly/all-time holder points)
- [x] Profile wired to per-user API (`/api/profile/[address]`)
- [x] Rewards wired to authenticated summary API
- [x] Sidebar/Header stats wired to API

## Requested Product Requirements

- [x] Account profile page for each user wallet
- [x] Contribution tracking (submission history on profile + summary APIs)
- [x] Admin point distribution flow (manual adjustments + review-based awarding)
- [x] User point visibility (weekly/total stats + points history)
- [x] Leaderboard showing everyone’s points

## Ops and Quality

- [x] Removed forbidden CommonJS `require` usage in `solana.ts`
- [x] Added Turbopack root config in `next.config.ts`
- [x] README replaced with architecture and setup instructions
- [x] Build no longer depends on Google Fonts fetch in restricted environments
