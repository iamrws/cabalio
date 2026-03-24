# Jito Cabal Engagement Platform

Holder-gated community platform for content submissions, points tracking, leaderboard rankings, and admin moderation.

## Core Capabilities

- Wallet signature authentication (`nonce -> sign -> verify`)
- Server-side Jito Cabal NFT holder verification via Helius DAS
- Signed session cookies and middleware route protection
- Hidden admin portal at `/cabal-core` (wallet allowlist + role checks)
- Submission review workflow (`submitted -> approved/rejected/flagged`)
- AI scoring and points crediting on admin approval
- Immutable points ledger entries for approved submissions

## Environment Setup

Copy `.env.example` to `.env.local` and provide values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_JITO_CABAL_COLLECTION_ADDRESS`
- `HELIUS_API_KEY`
- `ANTHROPIC_API_KEY`
- `NEXTAUTH_SECRET`
- `ADMIN_WALLET_ADDRESSES` (comma-separated wallet list)

## Database Setup

Run the schema SQL in [`src/lib/db.ts`](src/lib/db.ts) or apply migration scripts before starting:

- `users` includes holder verification metadata
- `submissions` supports moderation pipeline statuses
- `points_ledger` tracks immutable point events

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Security Model

- Never trust wallet address from client headers.
- Session identity is derived only from signed cookie.
- All protected pages/APIs enforce holder checks server-side.
- Admin routes return `404` for non-admin users.

