import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin, verifyAdminStatus } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const signalStormSchema = z.object({
  active: z.boolean(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  multiplier: z.number().min(1).max(5).optional(),
  note: z.string().max(400).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
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
    supabaseAudit.from('audit_logs').insert({
      action: 'admin_access_denied',
      actor_wallet: session.walletAddress,
      target_wallet: session.walletAddress,
      details: { endpoint: '/api/admin/seasons/signal-storm', reason: 'not_admin' },
      created_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const { seasonId } = await params;
    if (!uuidRegex.test(seasonId)) {
      return NextResponse.json({ error: 'Invalid season ID format' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = signalStormSchema.parse(body);

    const supabase = createServerClient();

    const seasonResult = await supabase
      .from('seasons')
      .select('id, status')
      .eq('id', seasonId)
      .maybeSingle();

    if (seasonResult.error) {
      console.error('Signal storm season lookup error:', seasonResult.error);
      return NextResponse.json({ error: 'Failed to look up season' }, { status: 500 });
    }
    if (!seasonResult.data) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    if (!parsed.active) {
      const closeResult = await supabase
        .from('season_events')
        .update({ active: false, ends_at: nowIso })
        .eq('season_id', seasonId)
        .eq('event_type', 'signal_storm')
        .eq('active', true)
        .select('id');

      if (closeResult.error) {
        console.error('Signal storm close error:', closeResult.error);
        return NextResponse.json({ error: 'Failed to close signal storm' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'closed',
        closed_count: (closeResult.data || []).length,
      });
    }

    const startsAt = parsed.starts_at ? new Date(parsed.starts_at).toISOString() : nowIso;
    const endsAt = parsed.ends_at
      ? new Date(parsed.ends_at).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    if (new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 });
    }

    const insertResult = await supabase
      .from('season_events')
      .insert({
        season_id: seasonId,
        event_type: 'signal_storm',
        starts_at: startsAt,
        ends_at: endsAt,
        active: true,
        config_json: {
          multiplier: parsed.multiplier || 2,
          note: parsed.note || null,
        },
        created_by: session.walletAddress,
        created_at: nowIso,
      })
      .select('*')
      .single();

    if (insertResult.error) {
      console.error('Signal storm insert error:', insertResult.error);
      return NextResponse.json({ error: 'Failed to create signal storm event' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: 'opened',
      event: insertResult.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Signal storm admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
