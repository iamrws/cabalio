import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { getDefaultSeasonRoles } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

const roleInputSchema = z.object({
  role_key: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  perk_json: z.record(z.string(), z.unknown()).optional(),
});

const createSeasonSchema = z.object({
  name: z.string().min(2).max(120),
  theme: z.string().min(2).max(120),
  status: z.enum(['upcoming', 'live', 'ended']).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  recap_ends_at: z.string().datetime(),
  config_json: z.record(z.string(), z.unknown()).optional(),
  roles: z.array(roleInputSchema).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createServerClient();
  const seasonsResult = await supabase
    .from('seasons')
    .select('id, name, theme, status, starts_at, ends_at, recap_ends_at, created_at')
    .order('starts_at', { ascending: false })
    .limit(50);

  if (seasonsResult.error) {
    console.error('Admin seasons query error:', seasonsResult.error);
    return NextResponse.json({ error: 'Failed to load seasons' }, { status: 500 });
  }

  return NextResponse.json({ seasons: seasonsResult.data || [] });
}

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = createSeasonSchema.parse(body);

    const startsAt = new Date(parsed.starts_at);
    const endsAt = new Date(parsed.ends_at);
    const recapEndsAt = new Date(parsed.recap_ends_at);

    if (endsAt <= startsAt) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 });
    }
    if (recapEndsAt <= endsAt) {
      return NextResponse.json({ error: 'recap_ends_at must be after ends_at' }, { status: 400 });
    }

    const supabase = createServerClient();
    const nowIso = new Date().toISOString();

    const insertSeason = await supabase
      .from('seasons')
      .insert({
        name: parsed.name,
        theme: parsed.theme,
        status: parsed.status || 'upcoming',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        recap_ends_at: recapEndsAt.toISOString(),
        config_json: parsed.config_json || {},
        created_by: session.walletAddress,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (insertSeason.error) {
      if (insertSeason.error.message.toLowerCase().includes('idx_single_live_season')) {
        return NextResponse.json({ error: 'Only one live season is allowed at a time' }, { status: 409 });
      }
      console.error('Season insert error:', insertSeason.error);
      return NextResponse.json({ error: 'Failed to create season' }, { status: 500 });
    }

    const roleRows = (parsed.roles && parsed.roles.length > 0 ? parsed.roles : getDefaultSeasonRoles()).map(
      (role) => ({
        season_id: insertSeason.data.id,
        role_key: role.role_key,
        title: role.title,
        description: role.description,
        perk_json: role.perk_json || {},
        created_at: nowIso,
        updated_at: nowIso,
      })
    );

    const insertRoles = await supabase.from('season_roles').insert(roleRows).select('*');
    if (insertRoles.error) {
      console.error('Season roles insert error:', insertRoles.error);
      return NextResponse.json({ error: 'Failed to create season roles' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      season: insertSeason.data,
      roles: insertRoles.data || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Create season error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
