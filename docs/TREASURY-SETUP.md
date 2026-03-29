# Treasury Setup & Payout Operations

## 1. Overview

The Cabalio rewards system operates in three phases:

1. **Point accumulation** -- Users earn points weekly through community activities (quests, submissions, engagement). Points are tracked in the `ledger` table.
2. **Reward allocation** -- Admins convert accumulated points into claimable reward records in the `rewards` table, denominated in lamports (1 SOL = 1,000,000,000 lamports).
3. **Claiming & payout** -- Holders call `POST /api/rewards/claim` with a `rewardId` and `idempotencyKey`. The endpoint marks the reward as `claimed` and inserts a `reward_claims` record with status `pending_payout`. A separate payout worker reads pending claims and sends SOL from the treasury wallet.

The claim endpoint is gated behind `REWARDS_CLAIM_ENABLED`. It stays `false` until you complete everything in this document.

---

## 2. Treasury Wallet Setup

### Generate a dedicated keypair

Never use a personal wallet for the treasury. Generate a purpose-built keypair:

```bash
# Install Solana CLI if you haven't
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Generate a keypair (writes to a JSON file)
solana-keygen new --outfile treasury-keypair.json --no-bip39-passphrase
```

For a vanity address (recommended for easy identification on explorers):

```bash
# Grind for an address starting with "JC" (case-sensitive, base58)
solana-keygen grind --starts-with JC:1

# Or try "Cabal" (will take longer -- 4+ chars gets exponentially slower)
solana-keygen grind --starts-with Cabal:1
```

### Extract the keys

```bash
# The JSON file contains a 64-byte array: [private_key(32) + public_key(32)]
# Convert to base58 for the env var:
python3 -c "
import json, base64
with open('treasury-keypair.json') as f:
    keypair = json.load(f)
import base58  # pip install base58
print('TREASURY_PRIVATE_KEY=' + base58.b58encode(bytes(keypair)).decode())
print('TREASURY_PUBLIC_KEY=' + base58.b58encode(bytes(keypair[32:])).decode())
"

# Or use solana-keygen to get the public key:
solana-keygen pubkey treasury-keypair.json
```

### Fund the treasury

```bash
# Transfer SOL from your funding wallet
solana transfer <TREASURY_PUBLIC_KEY> 5 --from <FUNDING_KEYPAIR> --url mainnet-beta

# Verify balance
solana balance <TREASURY_PUBLIC_KEY> --url mainnet-beta
```

Budget: each payout transaction costs ~0.000005 SOL (5,000 lamports) in fees. For 200 payouts/week at an average of 0.05 SOL each, you need roughly 10 SOL/week in rewards plus ~0.001 SOL in fees. Start with enough for at least two weeks of payouts.

### Secure the keypair file

```bash
# After extracting the base58 private key to your env, delete the JSON file
shred -u treasury-keypair.json   # Linux
# On macOS: rm -P treasury-keypair.json
```

Do not commit the keypair file to version control. It is already covered by `.gitignore` patterns, but verify:

```bash
echo "treasury-keypair.json" >> .gitignore
```

---

## 3. Security Recommendations

### Wallet architecture

Use a two-tier wallet structure:

| Wallet | Purpose | Holds |
|--------|---------|-------|
| **Cold/multisig treasury** | Long-term fund storage | Bulk SOL for the rewards program |
| **Hot payout wallet** | The `TREASURY_PRIVATE_KEY` wallet | Only enough SOL for ~1 week of payouts |

The hot wallet is the one whose private key lives in your server environment. If it is compromised, the attacker can only drain one week of funds, not the entire treasury.

### Multisig with Squads Protocol

For the cold treasury, use [Squads Protocol](https://squads.so/) (v4):

- Create a 2-of-3 (or 3-of-5) multisig squad.
- All top-ups from cold to hot require multiple approvals.
- Squads supports transaction proposals with descriptions, so every top-up is auditable.

### Operational limits

Enforce these in the payout worker (not just the claim endpoint):

- **Max single payout**: `REWARDS_MAX_PAYOUT_LAMPORTS` (default 1 SOL / 1,000,000,000 lamports). Reject any claim above this.
- **Daily aggregate limit**: `REWARDS_DAILY_LIMIT_LAMPORTS` (default 10 SOL / 10,000,000,000 lamports). Stop processing claims for the day once hit.
- **Rate limit per wallet**: The claim endpoint already enforces max 5 claims per hour per wallet.

### Monitoring

Set up alerts for:

- Treasury balance dropping below a threshold (e.g., 2 SOL remaining).
- Any single payout above 0.5 SOL.
- Daily payout volume exceeding 80% of the daily limit.
- Payout worker errors or claims stuck in `pending_payout` for more than 30 minutes.

Use Helius webhooks or a cron job that checks `solana balance` and posts to Slack/Discord.

---

## 4. Environment Variables

Add these to your `.env` (never commit this file):

```bash
# ── Treasury & Payouts ──────────────────────────────────────────────

# Base58-encoded 64-byte keypair (private + public key) of the hot payout wallet.
# This wallet SENDS SOL to claimants. Keep its balance limited.
TREASURY_PRIVATE_KEY=

# Base58-encoded public key of the payout wallet. Used for balance checks
# and display purposes. Must match the public key in TREASURY_PRIVATE_KEY.
TREASURY_PUBLIC_KEY=

# Master switch for the claim endpoint. Set to 'true' only after the treasury
# is funded and the payout worker is running. Any other value disables claims.
REWARDS_CLAIM_ENABLED=false

# Maximum lamports for a single payout transaction. Claims above this are
# rejected. Default: 1,000,000,000 (1 SOL).
REWARDS_MAX_PAYOUT_LAMPORTS=1000000000

# Maximum total lamports the system will pay out in a rolling 24-hour window.
# Once reached, remaining claims queue until the next day.
# Default: 10,000,000,000 (10 SOL).
REWARDS_DAILY_LIMIT_LAMPORTS=10000000000

# ── Existing vars (for reference) ──────────────────────────────────
# NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# HELIUS_API_KEY=...
```

### Validation checklist

Before enabling claims, verify:

- [ ] `TREASURY_PRIVATE_KEY` is set and decodes to a valid 64-byte keypair.
- [ ] `TREASURY_PUBLIC_KEY` matches the public key derived from `TREASURY_PRIVATE_KEY`.
- [ ] The treasury wallet has sufficient SOL balance.
- [ ] `SOLANA_RPC_URL` or `NEXT_PUBLIC_SOLANA_RPC_URL` points to a reliable RPC provider (Helius, Triton, or similar -- not the public endpoint for production).
- [ ] The payout worker is deployed and processing `pending_payout` claims.
- [ ] `REWARDS_CLAIM_ENABLED` is set to `true`.

---

## 5. Payout Pipeline Architecture

### Flow

```
User clicks "Claim"
    │
    ▼
POST /api/rewards/claim
    ├── Authenticate (session + holder check)
    ├── CSRF origin validation
    ├── Rate limit check (5 claims/hr/wallet)
    ├── Validate input (rewardId: UUID, idempotencyKey: 16-64 chars)
    ├── Idempotency check (return cached result if key exists)
    ├── Verify reward belongs to wallet and status = 'claimable'
    ├── Atomic UPDATE: set status='claimed', claimed_at=now
    │   WHERE status='claimable' AND claimed_at IS NULL
    ├── Insert reward_claims record (status='pending_payout')
    ├── Insert audit_logs record (fire-and-forget)
    └── Return { success, claimId, amountLamports, status: 'pending_payout' }
    │
    ▼
Payout Worker (separate process / cron)
    ├── SELECT claims WHERE status='pending_payout' ORDER BY created_at
    ├── For each claim:
    │   ├── Check REWARDS_MAX_PAYOUT_LAMPORTS
    │   ├── Check REWARDS_DAILY_LIMIT_LAMPORTS (rolling 24h sum)
    │   ├── Build SystemProgram.transfer instruction
    │   ├── Sign with TREASURY_PRIVATE_KEY
    │   ├── Send transaction (preflight checks enabled)
    │   ├── Confirm transaction (wait for 'confirmed' commitment)
    │   ├── UPDATE reward_claims SET status='paid', tx_signature=<sig>
    │   └── On failure: SET status='payout_failed', error_message=<msg>
    └── Log summary
```

### Idempotency

The `idempotencyKey` field (16-64 character string) prevents double payouts:

1. The client generates a unique key per claim attempt (e.g., `crypto.randomUUID()`).
2. Before processing, the endpoint checks `reward_claims` for a matching `(idempotency_key, wallet_address)`.
3. If found, it returns the existing result without creating a new claim.
4. The `rewards` table UPDATE uses a `WHERE status='claimable' AND claimed_at IS NULL` guard, so even without the idempotency check, only one concurrent request can succeed.

### Error handling

| Scenario | Behavior |
|----------|----------|
| Transaction fails to send | Claim stays `pending_payout`. Worker retries on next run. |
| Transaction sent but not confirmed | Worker polls for confirmation. After 3 attempts (~90s), marks `payout_failed`. |
| Transaction confirmed but DB update fails | Worker re-checks on-chain status on next run. If confirmed, updates DB. No double-send since the claim is already `pending_payout`, not `paid`. |
| RPC node down | Worker skips the run. Claims remain queued. |
| Treasury balance insufficient | Worker pauses all payouts. Alert fires. |

### Monitoring queries

```sql
-- Claims stuck in pending_payout for more than 30 minutes
SELECT * FROM reward_claims
WHERE status = 'pending_payout'
  AND created_at < NOW() - INTERVAL '30 minutes';

-- Daily payout volume (rolling 24h)
SELECT SUM(amount_lamports) as total_lamports
FROM reward_claims
WHERE status = 'paid'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Treasury balance (run via CLI or RPC call)
-- solana balance <TREASURY_PUBLIC_KEY> --url mainnet-beta
```

---

## 6. Testing

### Set up a devnet treasury

```bash
# Switch to devnet
solana config set --url devnet

# Generate a devnet-only keypair
solana-keygen new --outfile treasury-devnet.json --no-bip39-passphrase

# Airdrop test SOL (2 SOL per request, can repeat)
solana airdrop 2 $(solana-keygen pubkey treasury-devnet.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey treasury-devnet.json) --url devnet

# Verify
solana balance $(solana-keygen pubkey treasury-devnet.json) --url devnet
```

### Configure the app for devnet

In your `.env.local`:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_PRIVATE_KEY=<base58 from devnet keypair>
TREASURY_PUBLIC_KEY=<pubkey from devnet keypair>
REWARDS_CLAIM_ENABLED=true
REWARDS_MAX_PAYOUT_LAMPORTS=1000000000
REWARDS_DAILY_LIMIT_LAMPORTS=10000000000
```

### Test the claim flow

1. Insert a test reward record in Supabase:
   ```sql
   INSERT INTO rewards (id, wallet_address, status, reward_amount_lamports)
   VALUES (gen_random_uuid(), '<YOUR_TEST_WALLET>', 'claimable', 10000000);
   ```
2. Call the claim endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/rewards/claim \
     -H "Content-Type: application/json" \
     -H "Cookie: <session_cookie>" \
     -d '{"rewardId":"<UUID_FROM_STEP_1>","idempotencyKey":"test-key-1234567890abcdef"}'
   ```
3. Verify the reward status changed to `claimed` and a `reward_claims` row exists with `pending_payout`.
4. Run the payout worker and confirm the SOL transfer on [Solana Explorer (devnet)](https://explorer.solana.com/?cluster=devnet).

### Test idempotency

Send the same request twice with the same `idempotencyKey`. The second request should return `alreadyProcessed: true` without creating a duplicate claim.

### Test rate limiting

Send 6 claim requests within an hour from the same wallet. The 6th should return HTTP 429.

---

## 7. Operational Procedures

### Top up the treasury

Weekly or as needed:

1. Check current balance:
   ```bash
   solana balance <TREASURY_PUBLIC_KEY> --url mainnet-beta
   ```
2. Estimate next week's payouts from pending/upcoming rewards:
   ```sql
   SELECT SUM(reward_amount_lamports) as upcoming_lamports
   FROM rewards WHERE status = 'claimable';
   ```
3. Transfer from cold/multisig treasury to hot wallet (via Squads if using multisig).
4. Verify the transfer landed:
   ```bash
   solana balance <TREASURY_PUBLIC_KEY> --url mainnet-beta
   ```

### Pause payouts

Set the environment variable and redeploy:

```bash
# In your hosting platform (Vercel, Railway, etc.)
REWARDS_CLAIM_ENABLED=false
```

Users will see: "Reward claiming is not yet enabled. Stay tuned." (HTTP 503).

Claims already in `pending_payout` will remain queued. Stop the payout worker separately if you also want to halt outgoing transfers.

### Handle stuck transactions

If claims are stuck in `pending_payout`:

1. Check the payout worker logs for errors.
2. Check RPC health -- is the Solana network congested?
3. If a transaction was sent but not confirmed:
   ```bash
   solana confirm <TX_SIGNATURE> --url mainnet-beta
   ```
4. If the transaction expired (blockhash too old), the worker should retry with a fresh blockhash. If it doesn't:
   ```sql
   -- Reset to allow retry (only if you've confirmed the tx did NOT land)
   UPDATE reward_claims
   SET status = 'pending_payout', tx_signature = NULL, error_message = NULL
   WHERE id = '<CLAIM_ID>' AND status = 'payout_failed';
   ```

### Weekly reconciliation checklist

Run this every Monday (or after each payout cycle):

- [ ] **Treasury balance**: Record the current SOL balance. Compare against last week.
- [ ] **Claims processed**: Count claims by status for the past week:
  ```sql
  SELECT status, COUNT(*), SUM(amount_lamports) as total_lamports
  FROM reward_claims
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY status;
  ```
- [ ] **No stuck claims**: Verify zero `pending_payout` claims older than 1 hour.
- [ ] **On-chain verification**: Spot-check 3-5 `paid` claims by looking up their `tx_signature` on Solana Explorer.
- [ ] **Audit log consistency**: Compare `reward_claims` count against `audit_logs` where `action='reward_claimed'`.
- [ ] **Top-up decision**: If balance is below 2x next week's estimated payouts, initiate a top-up from the cold treasury.
- [ ] **Rate limit review**: Check for any wallets hitting the 5-claims/hour limit repeatedly (possible abuse).
