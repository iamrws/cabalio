import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createServerClient } from '@/lib/db';

interface PayoutResult {
  success: boolean;
  tx_signature?: string;
  error?: string;
}

/**
 * Check if rewards claiming is enabled via env var.
 */
export function isPayoutEnabled(): boolean {
  return process.env.REWARDS_CLAIM_ENABLED === 'true';
}

/**
 * Decode a base58-encoded string to Uint8Array.
 * Uses a minimal decoder to avoid requiring bs58 as a direct dependency.
 */
function decodeBase58(input: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = 58;

  const bytes: number[] = [0];
  for (const char of input) {
    const value = ALPHABET.indexOf(char);
    if (value === -1) throw new Error(`Invalid base58 character: ${char}`);

    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * BASE;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Handle leading '1's (zeros in base58)
  for (const char of input) {
    if (char !== '1') break;
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Get the treasury keypair from env.
 * Supports base58-encoded private key (standard Solana CLI format)
 * or base64-encoded private key (set TREASURY_KEY_ENCODING=base64).
 */
function getTreasuryKeypair(): Keypair {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) throw new Error('TREASURY_PRIVATE_KEY not configured');

  const encoding = process.env.TREASURY_KEY_ENCODING || 'base58';
  if (encoding === 'base64') {
    return Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKey, 'base64')));
  }
  return Keypair.fromSecretKey(decodeBase58(privateKey));
}

/**
 * Get Solana connection (reuses the same pattern as src/lib/solana.ts).
 */
let _payoutConnection: Connection | null = null;
function getConnection(): Connection {
  if (!_payoutConnection) {
    const rpcUrl =
      process.env.SOLANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      'https://api.mainnet-beta.solana.com';
    _payoutConnection = new Connection(rpcUrl, 'confirmed');
  }
  return _payoutConnection;
}

/**
 * Check treasury SOL balance (in lamports).
 */
export async function getTreasuryBalance(): Promise<number> {
  const treasury = getTreasuryKeypair();
  const connection = getConnection();
  return connection.getBalance(treasury.publicKey);
}

/**
 * Check if the daily payout limit has been reached.
 * Returns { allowed: boolean, todayTotal: number, limit: number }.
 */
export async function checkDailyLimit(
  supabase: ReturnType<typeof createServerClient>
): Promise<{ allowed: boolean; todayTotal: number; limit: number }> {
  const limit = Number(process.env.REWARDS_DAILY_LIMIT_LAMPORTS) || 0;
  // If no limit is configured, allow all payouts
  if (limit <= 0) {
    return { allowed: true, todayTotal: 0, limit: 0 };
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('reward_claims')
    .select('amount_lamports')
    .eq('status', 'paid')
    .gte('created_at', todayStart.toISOString());

  const todayTotal = (data || []).reduce(
    (sum: number, row: { amount_lamports: number }) => sum + (row.amount_lamports || 0),
    0
  );

  return { allowed: todayTotal < limit, todayTotal, limit };
}

/**
 * Execute a SOL payout from the treasury to a recipient wallet.
 */
export async function executePayout(
  recipientAddress: string,
  amountLamports: number
): Promise<PayoutResult> {
  try {
    // Validate amount
    const maxPayout = Number(process.env.REWARDS_MAX_PAYOUT_LAMPORTS) || 1_000_000_000; // 1 SOL default
    if (amountLamports <= 0) {
      return { success: false, error: 'Invalid payout amount' };
    }
    if (amountLamports > maxPayout) {
      return { success: false, error: `Payout exceeds maximum (${maxPayout} lamports)` };
    }

    // Validate recipient address
    let recipient: PublicKey;
    try {
      recipient = new PublicKey(recipientAddress);
      if (!PublicKey.isOnCurve(recipient)) {
        return { success: false, error: 'Recipient address is not on curve' };
      }
    } catch {
      return { success: false, error: 'Invalid recipient wallet address' };
    }

    const treasury = getTreasuryKeypair();
    const connection = getConnection();

    // Check treasury balance (amount + fee buffer)
    const balance = await connection.getBalance(treasury.publicKey);
    const requiredBalance = amountLamports + 10_000; // fee buffer
    if (balance < requiredBalance) {
      return { success: false, error: 'Insufficient treasury balance' };
    }

    // Build and send the transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: recipient,
        lamports: amountLamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasury],
      { commitment: 'confirmed', maxRetries: 3 }
    );

    return { success: true, tx_signature: signature };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payout transaction failed';
    console.error('Payout execution error:', message);
    return { success: false, error: message };
  }
}
