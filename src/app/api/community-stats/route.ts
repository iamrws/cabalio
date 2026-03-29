import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CACHE_MAX_AGE_SECONDS = 60;

// GET /api/community-stats — public aggregate community metrics (no auth required)
export async function GET() {
  try {
    const supabase = createServerClient();

    const [membersResult, submissionsResult, pointsResult] = await Promise.all([
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_holder', true),
      supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('points_ledger')
        .select('points_delta')
        .gt('points_delta', 0),
    ]);

    const active_members = membersResult.count ?? 0;
    const total_submissions = submissionsResult.count ?? 0;

    let total_points = 0;
    if (!pointsResult.error && pointsResult.data) {
      for (const row of pointsResult.data) {
        total_points += row.points_delta ?? 0;
      }
    }

    const response = NextResponse.json({
      active_members,
      total_submissions,
      total_points,
    });

    response.headers.set(
      'Cache-Control',
      `public, max-age=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=120`,
    );

    return response;
  } catch (err) {
    console.error('Community stats error:', err);
    return NextResponse.json(
      { active_members: 0, total_submissions: 0, total_points: 0 },
      { status: 200 },
    );
  }
}
