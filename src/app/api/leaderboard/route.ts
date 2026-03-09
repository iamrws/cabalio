import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getISOWeekNumber } from '@/lib/scoring';
import { getTierFromPoints } from '@/lib/points';

export const dynamic = 'force-dynamic';

interface SubmissionRow {
  wallet_address: string;
  points_awarded: number;
  normalized_score: number | null;
  users: { display_name: string; avatar_url: string; level: number } | null;
}

function aggregateLeaderboard(data: SubmissionRow[]) {
  const aggregated = new Map<string, {
    wallet_address: string;
    display_name: string | null;
    avatar_url: string | null;
    level: number;
    total_points: number;
    submission_count: number;
    best_score: number;
  }>();

  for (const row of data) {
    const existing = aggregated.get(row.wallet_address);
    const user = row.users;

    if (existing) {
      existing.total_points += row.points_awarded;
      existing.submission_count += 1;
      existing.best_score = Math.max(existing.best_score, row.normalized_score || 0);
    } else {
      aggregated.set(row.wallet_address, {
        wallet_address: row.wallet_address,
        display_name: user?.display_name || null,
        avatar_url: user?.avatar_url || null,
        level: user?.level || 1,
        total_points: row.points_awarded,
        submission_count: 1,
        best_score: row.normalized_score || 0,
      });
    }
  }

  return Array.from(aggregated.values())
    .sort((a, b) => b.total_points - a.total_points)
    .map((entry, i) => ({
      ...entry,
      rank: i + 1,
      tier: getTierFromPoints(entry.total_points),
    }));
}

// GET /api/leaderboard - Get current week or all-time leaderboard
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('range') || 'week';

  try {
    let query = supabase
      .from('submissions')
      .select('wallet_address, points_awarded, normalized_score, users(display_name, avatar_url, level)')
      .eq('status', 'scored');

    if (timeRange === 'week') {
      const weekNumber = getISOWeekNumber(new Date());
      query = query.eq('week_number', weekNumber);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sorted = aggregateLeaderboard((data || []) as unknown as SubmissionRow[]);

    return NextResponse.json({
      leaderboard: sorted,
      ...(timeRange === 'week' ? { week_number: getISOWeekNumber(new Date()) } : {}),
      total_participants: sorted.length,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
