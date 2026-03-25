import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

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
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { seasonId } = await params;
    const body = await request.json();
    const parsed = signalStormSchema.parse(body);

    const supabase = createServerClient();

    const seasonResult = await supabase
      .from('seasons')
      .select('id, status')
      .eq('id', seasonId)
      .maybeSingle();

    if (seasonResult.error) {
      return NextResponse.json({ error: seasonResult.error.message }, { status: 500 });
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
        return NextResponse.json({ error: closeResult.error.message }, { status: 500 });
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
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
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
