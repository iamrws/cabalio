import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getISOWeekKey, getISOWeekNumber, getISOWeekYear } from '@/lib/scoring';
import { getTierFromPoints } from '@/lib/points';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AggregatedRow {
  wallet_address: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  total_points: number;
  submission_count: number;
  best_score: number;
}

function parseWeekKey(range: string, requestedWeek: string | null, requestedYear: string | null): string {
  if (range === 'week' && requestedWeek && requestedYear) {
    return `${parseInt(requestedYear, 10)}-${parseInt(requestedWeek, 10)}`;
  }
  return getISOWeekKey(new Date());
}

// GET /api/leaderboard - holder-only leaderboard by weekly or all-time points.
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('range') || 'week';
  const requestedWeek = searchParams.get('week');
  const requestedYear = searchParams.get('year');

  try {
    const supabase = createServerClient();

    const [usersResult, pointsResult, submissionsResult] = await Promise.all([
      supabase
        .from('users')
        .select('wallet_address, display_name, avatar_url, level, is_holder')
        .eq('is_holder', true),
      supabase
        .from('points_ledger')
        .select('wallet_address, points_delta, created_at'),
      supabase
        .from('submissions')
        .select('wallet_address, normalized_score, created_at, status')
        .eq('status', 'approved'),
    ]);

    if (usersResult.error) {
      return NextResponse.json({ error: usersResult.error.message }, { status: 500 });
    }
    if (pointsResult.error) {
      return NextResponse.json({ error: pointsResult.error.message }, { status: 500 });
    }
    if (submissionsResult.error) {
      return NextResponse.json({ error: submissionsResult.error.message }, { status: 500 });
    }

    const users = usersResult.data || [];
    const points = pointsResult.data || [];
    const submissions = submissionsResult.data || [];

    const targetWeekKey = parseWeekKey(timeRange, requestedWeek, requestedYear);

    const aggregated = new Map<string, AggregatedRow>();

    for (const user of users) {
      aggregated.set(user.wallet_address, {
        wallet_address: user.wallet_address,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        level: user.level || 1,
        total_points: 0,
        submission_count: 0,
        best_score: 0,
      });
    }

    for (const pointEntry of points) {
      if (timeRange === 'week') {
        const entryWeek = getISOWeekKey(new Date(pointEntry.created_at));
        if (entryWeek !== targetWeekKey) continue;
      }

      const row = aggregated.get(pointEntry.wallet_address) || {
        wallet_address: pointEntry.wallet_address,
        display_name: null,
        avatar_url: null,
        level: 1,
        total_points: 0,
        submission_count: 0,
        best_score: 0,
      };

      row.total_points += pointEntry.points_delta || 0;
      aggregated.set(pointEntry.wallet_address, row);
    }

    for (const submission of submissions) {
      if (timeRange === 'week') {
        const submissionWeek = getISOWeekKey(new Date(submission.created_at));
        if (submissionWeek !== targetWeekKey) continue;
      }

      const row = aggregated.get(submission.wallet_address) || {
        wallet_address: submission.wallet_address,
        display_name: null,
        avatar_url: null,
        level: 1,
        total_points: 0,
        submission_count: 0,
        best_score: 0,
      };

      row.submission_count += 1;
      row.best_score = Math.max(row.best_score, submission.normalized_score || 0);
      aggregated.set(submission.wallet_address, row);
    }

    const leaderboard = Array.from(aggregated.values())
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.submission_count !== a.submission_count) return b.submission_count - a.submission_count;
        return b.best_score - a.best_score;
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        tier: getTierFromPoints(entry.total_points),
      }));

    return NextResponse.json({
      leaderboard,
      range: timeRange,
      week_number: timeRange === 'week' ? parseInt(targetWeekKey.split('-')[1], 10) : null,
      year: timeRange === 'week' ? parseInt(targetWeekKey.split('-')[0], 10) : null,
      total_participants: leaderboard.length,
      generated_at: new Date().toISOString(),
      current_week_number: getISOWeekNumber(new Date()),
      current_year: getISOWeekYear(new Date()),
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

