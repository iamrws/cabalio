import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const worldBossProgressSchema = z.object({
  metric_key: z.string().min(1).max(80),
  idempotency_key: z.string().min(8).max(120),
  delta_value: z.number().optional(),
  current_value: z.number().optional(),
  target_value: z.number().positive().optional(),
}).refine((payload) => payload.delta_value !== undefined || payload.current_value !== undefined, {
  message: 'Either delta_value or current_value is required',
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
    const parsed = worldBossProgressSchema.parse(body);

    const supabase = createServerClient();
    const nowIso = new Date().toISOString();

    const seasonResult = await supabase
      .from('seasons')
      .select('id')
      .eq('id', seasonId)
      .maybeSingle();

    if (seasonResult.error) {
      return NextResponse.json({ error: seasonResult.error.message }, { status: 500 });
    }
    if (!seasonResult.data) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    const existingUpdate = await supabase
      .from('season_world_boss_updates')
      .select('id')
      .eq('season_id', seasonId)
      .eq('metric_key', parsed.metric_key)
      .eq('idempotency_key', parsed.idempotency_key)
      .maybeSingle();

    if (existingUpdate.error) {
      return NextResponse.json({ error: existingUpdate.error.message }, { status: 500 });
    }

    if (existingUpdate.data) {
      const progressResult = await supabase
        .from('season_world_boss_progress')
        .select('*')
        .eq('season_id', seasonId)
        .eq('metric_key', parsed.metric_key)
        .maybeSingle();

      if (progressResult.error) {
        return NextResponse.json({ error: progressResult.error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        idempotent: true,
        progress: progressResult.data,
      });
    }

    const currentProgressResult = await supabase
      .from('season_world_boss_progress')
      .select('*')
      .eq('season_id', seasonId)
      .eq('metric_key', parsed.metric_key)
      .maybeSingle();

    if (currentProgressResult.error) {
      return NextResponse.json({ error: currentProgressResult.error.message }, { status: 500 });
    }

    const existing = currentProgressResult.data;
    const baselineCurrent = Number(existing?.current_value || 0);
    const baselineTarget = Number(existing?.target_value || parsed.target_value || 100);
    const nextCurrent =
      parsed.current_value !== undefined
        ? parsed.current_value
        : baselineCurrent + (parsed.delta_value || 0);
    const nextTarget = parsed.target_value || baselineTarget;

    let progressRow = null;

    if (existing) {
      const updateProgress = await supabase
        .from('season_world_boss_progress')
        .update({
          current_value: nextCurrent,
          target_value: nextTarget,
          updated_by: session.walletAddress,
          updated_at: nowIso,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateProgress.error) {
        return NextResponse.json({ error: updateProgress.error.message }, { status: 500 });
      }
      progressRow = updateProgress.data;
    } else {
      const insertProgress = await supabase
        .from('season_world_boss_progress')
        .insert({
          season_id: seasonId,
          metric_key: parsed.metric_key,
          current_value: nextCurrent,
          target_value: nextTarget,
          updated_by: session.walletAddress,
          updated_at: nowIso,
        })
        .select('*')
        .single();

      if (insertProgress.error) {
        return NextResponse.json({ error: insertProgress.error.message }, { status: 500 });
      }
      progressRow = insertProgress.data;
    }

    const updateLogInsert = await supabase.from('season_world_boss_updates').insert({
      season_id: seasonId,
      metric_key: parsed.metric_key,
      idempotency_key: parsed.idempotency_key,
      delta_value: parsed.delta_value || 0,
      created_by: session.walletAddress,
      created_at: nowIso,
    });

    if (updateLogInsert.error) {
      return NextResponse.json({ error: updateLogInsert.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      idempotent: false,
      progress: progressRow,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('World boss progress admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
