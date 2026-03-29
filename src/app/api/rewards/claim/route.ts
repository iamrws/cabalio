import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { isPayoutEnabled, executePayout, checkDailyLimit } from '@/lib/payout';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rewards/claim
 *
 * Claim a reward payout. Gated behind the REWARDS_CLAIM_ENABLED env var.
 * When enabled, executes an on-chain SOL transfer from the treasury to the
 * claimant's wallet and records the transaction.
 *
 * Security measures:
 *  - Feature gate via REWARDS_CLAIM_ENABLED
 *  - Idempotency token to prevent accidental double-submits
 *  - Database-level claimed_at column check (double-claim prevention)
 *  - Per-wallet claim rate limit (max 5 claims per hour)
 *  - Daily payout limit via REWARDS_DAILY_LIMIT_LAMPORTS
 *  - Per-claim max via REWARDS_MAX_PAYOUT_LAMPORTS
 *  - Atomicity via single UPDATE ... WHERE status='claimable' pattern
 */

const claimSchema = z.object({
  rewardId: z.string().uuid(),
  idempotencyKey: z.string().min(16).max(64),
});

async function isClaimRateLimited(
  supabase: ReturnType<typeof createServerClient>,
  walletAddress: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('reward_claims')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_address', walletAddress)
    .gte('created_at', windowStart);

  return count !== null && count >= 5;
}

export async function POST(request: NextRequest) {
  // ── Feature gate ──
  if (!isPayoutEnabled()) {
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

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const supabase = createServerClient();
  if (await isClaimRateLimited(supabase, session.walletAddress)) {
    return NextResponse.json(
      { error: 'Too many claim attempts. Try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = claimSchema.parse(body);
    const walletAddress = session.walletAddress;
    const now = new Date().toISOString();

    // ── Idempotency check: if this key was already processed, return cached result ──
    const { data: existingClaim } = await supabase
      .from('reward_claims')
      .select('id, reward_id, status, tx_signature')
      .eq('idempotency_key', parsed.idempotencyKey)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existingClaim) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        claimId: existingClaim.id,
        status: existingClaim.status,
        txSignature: existingClaim.tx_signature || null,
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

    // ── Daily limit check ──
    const dailyCheck = await checkDailyLimit(supabase);
    if (!dailyCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily payout limit reached. Please try again tomorrow.',
          todayTotal: dailyCheck.todayTotal,
          limit: dailyCheck.limit,
        },
        { status: 429 }
      );
    }

    // ── Atomically mark the reward as processing ──
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

    // ── Execute the on-chain payout ──
    const payoutResult = await executePayout(
      walletAddress,
      updatedReward.reward_amount_lamports
    );

    if (!payoutResult.success) {
      // Payout failed -- roll back the reward status so user can retry
      await supabase
        .from('rewards')
        .update({ status: 'claimable', claimed_at: null })
        .eq('id', parsed.rewardId);

      console.error('Payout failed for reward', parsed.rewardId, payoutResult.error);
      return NextResponse.json(
        { error: payoutResult.error || 'Payout transaction failed' },
        { status: 502 }
      );
    }

    // ── Store the tx signature on the reward ──
    await supabase
      .from('rewards')
      .update({ tx_signature: payoutResult.tx_signature })
      .eq('id', parsed.rewardId);

    // ── Record the claim for idempotency tracking ──
    const { error: claimInsertError } = await supabase
      .from('reward_claims')
      .insert({
        reward_id: parsed.rewardId,
        wallet_address: walletAddress,
        idempotency_key: parsed.idempotencyKey,
        amount_lamports: updatedReward.reward_amount_lamports,
        status: 'paid',
        tx_signature: payoutResult.tx_signature,
        claimed_at: now,
        created_at: now,
      });

    if (claimInsertError) {
      // If this fails the payout already went through -- log but don't error to user
      console.error('Claim record insert error:', claimInsertError);
    }

    // ── Audit log (fire and forget) ──
    supabase
      .from('audit_logs')
      .insert({
        action: 'reward_claimed',
        actor_wallet: walletAddress,
        target_wallet: walletAddress,
        details: {
          reward_id: parsed.rewardId,
          amount_lamports: updatedReward.reward_amount_lamports,
          tx_signature: payoutResult.tx_signature,
          idempotency_key: parsed.idempotencyKey,
        },
        created_at: now,
      })
      .then(() => {}, () => {});

    // ── Notification ──
    const solAmount = (updatedReward.reward_amount_lamports / 1_000_000_000).toFixed(4);
    createNotification({
      wallet_address: walletAddress,
      type: 'reward_claimed',
      title: 'Reward Claimed',
      body: `${solAmount} SOL sent to your wallet`,
      metadata: {
        reward_id: parsed.rewardId,
        amount_lamports: updatedReward.reward_amount_lamports,
        tx_signature: payoutResult.tx_signature,
      },
    });

    return NextResponse.json({
      success: true,
      claimId: updatedReward.id,
      amountLamports: updatedReward.reward_amount_lamports,
      txSignature: payoutResult.tx_signature,
      status: 'paid',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Reward claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
