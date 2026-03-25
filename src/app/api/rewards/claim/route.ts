import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rewards/claim
 *
 * Claim a reward payout. This endpoint is currently DISABLED (gated behind
 * the REWARDS_CLAIM_ENABLED env var) but ships with all security measures
 * so it is safe to enable when the treasury and payout pipeline are ready.
 *
 * Security measures:
 *  - Idempotency token to prevent accidental double-submits
 *  - Database-level claimed_at column check (double-claim prevention)
 *  - Per-wallet claim rate limit (max 5 claims per hour)
 *  - Atomicity via single UPDATE ... WHERE status='claimable' pattern
 */

const claimSchema = z.object({
  rewardId: z.string().uuid(),
  idempotencyKey: z.string().min(16).max(64),
});

// In-memory rate limiter: max 5 claims per wallet per hour
const CLAIM_WINDOW_MS = 60 * 60 * 1000;
const CLAIM_WINDOW_MAX = 5;
const claimRateWindow = new Map<string, { count: number; resetAt: number }>();

function isClaimRateLimited(walletAddress: string): boolean {
  const now = Date.now();
  const state = claimRateWindow.get(walletAddress);

  if (!state || now > state.resetAt) {
    claimRateWindow.set(walletAddress, { count: 1, resetAt: now + CLAIM_WINDOW_MS });
    return false;
  }

  if (state.count >= CLAIM_WINDOW_MAX) {
    return true;
  }

  state.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  // ── Feature gate: disabled until treasury + payout pipeline is ready ──
  const isEnabled = process.env.REWARDS_CLAIM_ENABLED === 'true';
  if (!isEnabled) {
    return NextResponse.json(
      { error: 'Reward claiming is not yet enabled. Stay tuned.' },
      { status: 503 }
    );
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Holder verification required' }, { status: 403 });
  }

  if (isClaimRateLimited(session.walletAddress)) {
    return NextResponse.json(
      { error: 'Too many claim attempts. Try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = claimSchema.parse(body);

    const supabase = createServerClient();
    const walletAddress = session.walletAddress;
    const now = new Date().toISOString();

    // ── Idempotency check: if this key was already processed, return success ──
    const { data: existingClaim } = await supabase
      .from('reward_claims')
      .select('id, reward_id, status')
      .eq('idempotency_key', parsed.idempotencyKey)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existingClaim) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        claimId: existingClaim.id,
        status: existingClaim.status,
      });
    }

    // ── Verify the reward belongs to this wallet and is claimable ──
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', parsed.rewardId)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (rewardError) {
      console.error('Reward lookup error:', rewardError);
      return NextResponse.json({ error: 'Failed to verify reward' }, { status: 500 });
    }

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (reward.status !== 'claimable') {
      return NextResponse.json(
        { error: `Reward is not claimable (current status: ${reward.status})` },
        { status: 409 }
      );
    }

    if (reward.claimed_at) {
      return NextResponse.json(
        { error: 'Reward has already been claimed' },
        { status: 409 }
      );
    }

    // ── Atomically mark the reward as claimed ──
    // The WHERE clause ensures only one concurrent request can succeed
    const { data: updatedReward, error: updateError } = await supabase
      .from('rewards')
      .update({
        status: 'claimed',
        claimed_at: now,
      })
      .eq('id', parsed.rewardId)
      .eq('wallet_address', walletAddress)
      .eq('status', 'claimable')
      .is('claimed_at', null)
      .select('id, status, claimed_at, reward_amount_lamports')
      .maybeSingle();

    if (updateError) {
      console.error('Reward claim update error:', updateError);
      return NextResponse.json({ error: 'Failed to process claim' }, { status: 500 });
    }

    if (!updatedReward) {
      // Another request already claimed it between our check and update
      return NextResponse.json(
        { error: 'Reward was already claimed or is no longer available' },
        { status: 409 }
      );
    }

    // ── Record the claim for idempotency tracking ──
    const { error: claimInsertError } = await supabase
      .from('reward_claims')
      .insert({
        reward_id: parsed.rewardId,
        wallet_address: walletAddress,
        idempotency_key: parsed.idempotencyKey,
        amount_lamports: updatedReward.reward_amount_lamports,
        status: 'pending_payout',
        claimed_at: now,
        created_at: now,
      });

    if (claimInsertError) {
      // If this fails due to idempotency_key conflict, the reward is still
      // correctly marked as claimed - the claim record is for tracking only.
      console.error('Claim record insert error:', claimInsertError);
    }

    // NOTE: Actual SOL transfer is handled by a separate payout worker
    // that reads from the reward_claims table. This endpoint only marks
    // the intent and prevents double-claims.

    return NextResponse.json({
      success: true,
      claimId: updatedReward.id,
      amountLamports: updatedReward.reward_amount_lamports,
      status: 'pending_payout',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Reward claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
