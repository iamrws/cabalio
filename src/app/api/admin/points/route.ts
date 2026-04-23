import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin, verifyAdminStatus } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/** Single-admin adjustments are capped at this value. Larger adjustments require a second admin approval. */
const SINGLE_ADMIN_ADJUSTMENT_CAP = 100;

/** Threshold at which anomaly detection flags are raised. */
const ANOMALY_ALERT_THRESHOLD = 500;

const manualAdjustmentSchema = z.object({
  wallet_address: z.string().min(32).max(64),
  points_delta: z.number().int().min(-10000).max(10000).refine((value) => value !== 0, {
    message: 'points_delta must not be 0',
  }),
  note: z.string().min(3).max(500),
  /** Required when |points_delta| > SINGLE_ADMIN_ADJUSTMENT_CAP. Must be a different admin wallet. */
  approving_admin: z.string().min(32).max(64).optional(),
});

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const isAdmin = await verifyAdminStatus(session.walletAddress);
  if (!isAdmin) {
    const supabaseAudit = createServerClient();
    supabaseAudit
      .from('audit_logs')
      .insert({
        action: 'admin_access_denied',
        actor_wallet: session.walletAddress,
        target_wallet: session.walletAddress,
        details: { endpoint: '/api/admin/points', reason: 'not_admin' },
        created_at: new Date().toISOString(),
      })
      .then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = manualAdjustmentSchema.parse(body);
    const walletAddress = parsed.wallet_address.trim();
    const absDelta = Math.abs(parsed.points_delta);

    if (absDelta > SINGLE_ADMIN_ADJUSTMENT_CAP) {
      if (!parsed.approving_admin) {
        return NextResponse.json(
          {
            error: `Adjustments exceeding ${SINGLE_ADMIN_ADJUSTMENT_CAP} points require a second admin approval (approving_admin field)`,
          },
          { status: 403 }
        );
      }
      if (parsed.approving_admin === session.walletAddress) {
        return NextResponse.json(
          { error: 'Approving admin must be a different admin than the requesting admin' },
          { status: 403 }
        );
      }

      const supabaseCheck = createServerClient();
      const { data: approverRow } = await supabaseCheck
        .from('admin_wallets')
        .select('wallet_address')
        .eq('wallet_address', parsed.approving_admin)
        .eq('active', true)
        .maybeSingle();

      const envAdmins = (process.env.ADMIN_WALLET_ADDRESSES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const isApproverAdmin = !!approverRow || envAdmins.includes(parsed.approving_admin);
      if (!isApproverAdmin) {
        return NextResponse.json(
          { error: 'Approving wallet is not a recognized admin' },
          { status: 403 }
        );
      }
    }

    const supabase = createServerClient();

    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('wallet_address, total_xp')
      .eq('wallet_address', walletAddress)
      .single();

    if (userLookupError || !existingUser) {
      return NextResponse.json({ error: 'User not found for wallet address' }, { status: 404 });
    }

    const auditDetails = {
      points_delta: parsed.points_delta,
      note: parsed.note,
      approving_admin: parsed.approving_admin || null,
      previous_total_xp: existingUser.total_xp || 0,
      projected_new_total_xp: (existingUser.total_xp || 0) + parsed.points_delta,
    };

    // Atomic: user update + ledger insert + audit log, all in one transaction.
    const { data: applied, error: applyError } = await supabase.rpc(
      'apply_points_adjustment_atomic',
      {
        p_wallet: walletAddress,
        p_delta: parsed.points_delta,
        p_entry_type: 'manual_adjustment',
        p_submission_id: null,
        p_metadata: {
          note: parsed.note,
          reviewed_by: session.walletAddress,
          approving_admin: parsed.approving_admin || null,
        },
        p_audit_action: 'manual_points_adjustment',
        p_audit_actor: session.walletAddress,
        p_audit_details: auditDetails,
      }
    );

    if (applyError) {
      const message = applyError.message || '';
      if (message.includes('user_not_found')) {
        return NextResponse.json({ error: 'User not found for wallet address' }, { status: 404 });
      }
      console.error('Atomic points adjustment failed:', message);
      return NextResponse.json({ error: 'Failed to apply adjustment' }, { status: 500 });
    }

    // Anomaly detection fires AFTER the authoritative write so it never masks
    // the real result. Fire-and-forget; a failed anomaly log does not undo
    // the adjustment.
    if (absDelta >= ANOMALY_ALERT_THRESHOLD) {
      console.warn(
        `[ANOMALY] Large points adjustment: ${parsed.points_delta} points to ${walletAddress} by admin ${session.walletAddress}` +
          (parsed.approving_admin ? ` (approved by ${parsed.approving_admin})` : '')
      );
      supabase
        .from('audit_logs')
        .insert({
          action: 'anomaly_large_adjustment',
          actor_wallet: session.walletAddress,
          target_wallet: walletAddress,
          details: {
            points_delta: parsed.points_delta,
            note: parsed.note,
            threshold: ANOMALY_ALERT_THRESHOLD,
          },
          created_at: new Date().toISOString(),
        })
        .then(undefined, (err: unknown) => console.error('Anomaly log insert failed:', err));
    }

    void createNotification({
      wallet_address: walletAddress,
      type: 'manual_adjustment',
      title: 'Points Adjusted',
      body: `An admin adjusted your points by ${parsed.points_delta}. Reason: ${parsed.note}`,
      metadata: { points_delta: parsed.points_delta, note: parsed.note },
    });

    return NextResponse.json({
      success: true,
      wallet_address: walletAddress,
      points_delta: parsed.points_delta,
      note: parsed.note,
      applied,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Manual points adjustment error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
