import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const manualAdjustmentSchema = z.object({
  wallet_address: z.string().min(32).max(64),
  points_delta: z.number().int().min(-10000).max(10000).refine((value) => value !== 0, {
    message: 'points_delta must not be 0',
  }),
  note: z.string().min(3).max(500),
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = manualAdjustmentSchema.parse(body);
    const walletAddress = parsed.wallet_address.trim();

    const supabase = createServerClient();
    const now = new Date().toISOString();

    const { data: existingUser, error: userLookupError } = await supabase
      .from('users')
      .select('wallet_address, total_xp')
      .eq('wallet_address', walletAddress)
      .single();

    if (userLookupError || !existingUser) {
      return NextResponse.json({ error: 'User not found for wallet address' }, { status: 404 });
    }

    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        wallet_address: walletAddress,
        entry_type: 'manual_adjustment',
        points_delta: parsed.points_delta,
        metadata: {
          note: parsed.note,
          reviewed_by: session.walletAddress,
        },
        created_at: now,
      });

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        total_xp: (existingUser.total_xp || 0) + parsed.points_delta,
        updated_at: now,
      })
      .eq('wallet_address', walletAddress);

    if (userUpdateError) {
      return NextResponse.json({ error: userUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      wallet_address: walletAddress,
      points_delta: parsed.points_delta,
      note: parsed.note,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Manual points adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
