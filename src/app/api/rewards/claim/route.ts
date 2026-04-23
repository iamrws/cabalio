import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { isPayoutEnabled, executePayout } from '@/lib/payout';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rewards/claim
 *
 * Claim a reward payout. Gated behind the REWARDS_CLAIM_ENABLED env var.
 *
 * The reservation + daily-limit check + reward transition runs inside a
 * single Postgres RPC (record_reward_claim_atomic) under an advisory lock,
 * so concurrent claims serialize on the daily budget. After payout we call
 * finalize_reward_claim_atomic with the tx signature. Ambiguous on-chain
 * failures leave the claim in 'failed' state for ops reconciliation; the
 * reward row is NEVER rolled back to 'claimable' automatically.
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

function mapRpcError(message: string): { status: number; error: string } {
  if (message.includes('idempotency_key_reused_for_different_reward')) {
    return { status: 409, error: 'Idempotency key already used for a different reward' };
  }
  if (message.includes('idempotency_key_already_used')) {
    return { status: 409, error: 'Idempotency key already used' };
  }
  if (message.includes('reward_not_found')) {
    return { status: 404, error: 'Reward not found' };
  }
  if (message.includes('reward_not_owned_by_wallet')) {
    return { status: 403, error: 'Reward does not belong to this wallet' };
  }
  if (message.includes('reward_not_claimable')) {
    return { status: 409, error: 'Reward is not claimable' };
  }
  if (message.includes('daily_limit_exceeded')) {
    return { status: 429, error: 'Daily payout limit reached. Please try again tomorrow.' };
  }
  return { status: 500, error: 'Failed to reserve claim' };
}

export async function POST(request: NextRequest) {
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

    // Idempotency cache hit. Only return cached result if the prior claim
    // was for the SAME reward (N-02). Any cache hit also emits an audit log
    // so replay attempts are forensically visible (N-03).
    const { data: existingClaim } = await supabase
      .from('reward_claims')
      .select('id, reward_id, status, tx_signature')
      .eq('idempotency_key', parsed.idempotencyKey)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existingClaim) {
      supabase
        .from('audit_logs')
        .insert({
          action: 'reward_claim_idempotency_hit',
          actor_wallet: walletAddress,
          target_wallet: walletAddress,
          details: {
            claim_id: existingClaim.id,
            reward_id_requested: parsed.rewardId,
            reward_id_existing: existingClaim.reward_id,
            idempotency_key: parsed.idempotencyKey,
            status: existingClaim.status,
            mismatch: existingClaim.reward_id !== parsed.rewardId,
          },
          created_at: now,
        })
        .then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));

      if (existingClaim.reward_id !== parsed.rewardId) {
        return NextResponse.json(
          { error: 'Idempotency key already used for a different reward' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        claimId: existingClaim.id,
        status: existingClaim.status,
        txSignature: existingClaim.tx_signature || null,
      });
    }

    // Preflight: confirm the reward exists and read its amount. The RPC
    // re-verifies under a row lock, so this is advisory only. We still need
    // the amount to pass into the RPC for the daily-limit calculation.
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('id, status, claimed_at, reward_amount_lamports')
      .eq('id', parsed.rewardId)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (rewardError) {
      console.error('Reward lookup error:', rewardError.message);
      return NextResponse.json({ error: 'Failed to verify reward' }, { status: 500 });
    }
    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }
    if (reward.status !== 'claimable' || reward.claimed_at) {
      return NextResponse.json(
        { error: `Reward is not claimable (current status: ${reward.status})` },
        { status: 409 }
      );
    }

    const dailyLimit = Number(process.env.REWARDS_DAILY_LIMIT_LAMPORTS) || 0;

    // Atomic reservation. Inside the RPC: advisory lock, idempotency check,
    // reward lock + transition, daily-limit check including this claim,
    // insert reward_claims row with status='processing'.
    const { data: reserveData, error: reserveError } = await supabase.rpc(
      'record_reward_claim_atomic',
      {
        p_reward_id: parsed.rewardId,
        p_wallet: walletAddress,
        p_idempotency_key: parsed.idempotencyKey,
        p_amount_lamports: reward.reward_amount_lamports,
        p_daily_limit_lamports: dailyLimit,
      }
    );

    if (reserveError) {
      const mapped = mapRpcError(reserveError.message || '');
      if (mapped.status >= 500) {
        console.error('Reserve claim RPC error:', reserveError.message);
      }
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    const claimId = reserveData as unknown as string;
    if (!claimId) {
      return NextResponse.json({ error: 'Failed to reserve claim' }, { status: 500 });
    }

    // Execute the on-chain payout now that we hold the reservation.
    const payoutResult = await executePayout(
      walletAddress,
      reward.reward_amount_lamports
    );

    if (!payoutResult.success) {
      // Mark the claim as 'failed' but do NOT auto-rollback the reward to
      // 'claimable'. Ambiguous failures (timeout / partial confirm) need
      // human reconciliation before a re-attempt is safe.
      await supabase.rpc('finalize_reward_claim_atomic', {
        p_claim_id: claimId,
        p_tx_signature: null,
        p_status: 'failed',
      });

      console.error('Payout failed for reward', parsed.rewardId, {
        claim_id: claimId,
        error: payoutResult.error,
      });
      return NextResponse.json(
        {
          error: payoutResult.error || 'Payout transaction failed',
          claimId,
          status: 'failed',
        },
        { status: 502 }
      );
    }

    // Success path. Finalize the claim + stamp the reward with the tx sig.
    const { error: finalizeError } = await supabase.rpc(
      'finalize_reward_claim_atomic',
      {
        p_claim_id: claimId,
        p_tx_signature: payoutResult.tx_signature,
        p_status: 'completed',
      }
    );

    if (finalizeError) {
      // Payout landed on-chain but we couldn't mark it completed. Surface
      // the tx signature so the user / support can reconcile manually.
      console.error('CRITICAL: payout completed but finalize failed', {
        claim_id: claimId,
        tx_signature: payoutResult.tx_signature,
        error: finalizeError.message,
      });
      return NextResponse.json(
        {
          error: 'Payout completed but record update failed. Contact support.',
          txSignature: payoutResult.tx_signature,
          claimId,
          status: 'processing',
        },
        { status: 500 }
      );
    }

    supabase
      .from('audit_logs')
      .insert({
        action: 'reward_claimed',
        actor_wallet: walletAddress,
        target_wallet: walletAddress,
        details: {
          reward_id: parsed.rewardId,
          claim_id: claimId,
          amount_lamports: reward.reward_amount_lamports,
          tx_signature: payoutResult.tx_signature,
          idempotency_key: parsed.idempotencyKey,
        },
        created_at: now,
      })
      .then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));

    const solAmount = (reward.reward_amount_lamports / 1_000_000_000).toFixed(4);
    createNotification({
      wallet_address: walletAddress,
      type: 'reward_claimed',
      title: 'Reward Claimed',
      body: `${solAmount} SOL sent to your wallet`,
      metadata: {
        reward_id: parsed.rewardId,
        claim_id: claimId,
        amount_lamports: reward.reward_amount_lamports,
        tx_signature: payoutResult.tx_signature,
      },
    });

    return NextResponse.json({
      success: true,
      claimId,
      amountLamports: reward.reward_amount_lamports,
      txSignature: payoutResult.tx_signature,
      status: 'completed',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Reward claim error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
