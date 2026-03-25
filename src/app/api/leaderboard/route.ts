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

// --- H5 Fix: Validate week/year parameters ---
function validateWeekYear(
  weekStr: string | null,
  yearStr: string | null
): { week: number; year: number } | null {
  if (!weekStr || !yearStr) return null;

  const week = parseInt(weekStr, 10);
  const year = parseInt(yearStr, 10);

  if (!Number.isFinite(week) || !Number.isFinite(year)) return null;

  // Week must be 1-53 (ISO 8601 allows week 53)
  if (week < 1 || week > 53) return null;

  // Year must be reasonable: not in the future and within the last 2 years
  const currentYear = getISOWeekYear(new Date());
  const currentWeek = getISOWeekNumber(new Date());
  if (year > currentYear || year < currentYear - 2) return null;

  // If requesting current year, week cannot be in the future
  if (year === currentYear && week > currentWeek) return null;

  return { week, year };
}

function parseWeekKey(range: string, requestedWeek: string | null, requestedYear: string | null): string {
  if (range === 'week' && requestedWeek && requestedYear) {
    const validated = validateWeekYear(requestedWeek, requestedYear);
    if (!validated) {
      // Fall back to current week if validation fails
      return getISOWeekKey(new Date());
    }
    return `${validated.year}-${validated.week}`;
  }
  return getISOWeekKey(new Date());
}

// --- L1 Fix: Cache headers for lightweight rate limiting in serverless ---
const CACHE_MAX_AGE_SECONDS = 30;

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

  // H5: Validate range parameter
  if (timeRange !== 'week' && timeRange !== 'all') {
    return NextResponse.json({ error: 'Invalid range parameter. Must be "week" or "all".' }, { status: 400 });
  }

  // H5: Validate week/year if provided
  if (timeRange === 'week' && requestedWeek && requestedYear) {
    const validated = validateWeekYear(requestedWeek, requestedYear);
    if (!validated) {
      return NextResponse.json(
        { error: 'Invalid week/year parameters. Week must be 1-53, year must be within last 2 years and not in the future.' },
        { status: 400 }
      );
    }
  }

  try {
    const supabase = createServerClient();
    const targetWeekKey = parseWeekKey(timeRange, requestedWeek, requestedYear);

    // H3 Fix: Use SQL SUM() aggregation instead of fetching all rows client-side.
    // This eliminates the silent truncation from .limit(100) and is far more efficient.

    let pointsQuery;
    if (timeRange === 'week') {
      // For weekly view, filter by ISO week boundaries and aggregate in SQL
      const [yearStr, weekStr] = targetWeekKey.split('-');
      const targetYear = parseInt(yearStr, 10);
      const targetWeek = parseInt(weekStr, 10);

      // Calculate the ISO week date range for filtering
      const weekStart = isoWeekToDate(targetYear, targetWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

      pointsQuery = supabase.rpc('aggregate_leaderboard_weekly', {
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
      });
    } else {
      pointsQuery = supabase.rpc('aggregate_leaderboard_alltime');
    }

    const [usersResult, pointsResult, submissionsResult] = await Promise.all([
      supabase
        .from('users')
        .select('wallet_address, display_name, avatar_url, level, is_holder')
        .eq('is_holder', true),
      pointsQuery,
      supabase
        .from('submissions')
        .select('wallet_address, normalized_score, created_at, status')
        .eq('status', 'approved'),
    ]);

    if (usersResult.error) {
      // Fallback: if RPC functions don't exist yet, use the safe client-side approach
      if (pointsResult.error?.code === '42883' || pointsResult.error?.message?.includes('function')) {
        return fallbackLeaderboard(supabase, timeRange, targetWeekKey);
      }
      console.error('Leaderboard users query error:', usersResult.error);
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
    }
    if (pointsResult.error) {
      // Fallback to client-side aggregation without limits if RPC not available
      return fallbackLeaderboard(supabase, timeRange, targetWeekKey);
    }
    if (submissionsResult.error) {
      console.error('Leaderboard submissions query error:', submissionsResult.error);
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
    }

    const users = usersResult.data || [];
    const pointsAgg: { wallet_address: string; total_points: number }[] = pointsResult.data || [];
    const submissions = submissionsResult.data || [];

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

    // Apply aggregated points from SQL SUM()
    for (const entry of pointsAgg) {
      const row = aggregated.get(entry.wallet_address) || {
        wallet_address: entry.wallet_address,
        display_name: null,
        avatar_url: null,
        level: 1,
        total_points: 0,
        submission_count: 0,
        best_score: 0,
      };

      row.total_points = entry.total_points || 0;
      aggregated.set(entry.wallet_address, row);
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

    const response = NextResponse.json({
      leaderboard,
      range: timeRange,
      week_number: timeRange === 'week' ? parseInt(targetWeekKey.split('-')[1], 10) : null,
      year: timeRange === 'week' ? parseInt(targetWeekKey.split('-')[0], 10) : null,
      total_participants: leaderboard.length,
      generated_at: new Date().toISOString(),
      current_week_number: getISOWeekNumber(new Date()),
      current_year: getISOWeekYear(new Date()),
    });

    // L1: Add cache headers to reduce repeated identical requests in serverless
    response.headers.set('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=60`);

    return response;
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Convert ISO week number + year to the Monday date of that week.
 */
function isoWeekToDate(year: number, week: number): Date {
  // January 4th is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Monday=1, Sunday=7
  // Monday of week 1
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  // Monday of target week
  const target = new Date(mondayWeek1);
  target.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return target;
}

/**
 * Fallback leaderboard calculation when RPC functions are not yet deployed.
 * H3 Fix: Uses complete data without .limit() — fetches all points via pagination.
 */
async function fallbackLeaderboard(
  supabase: ReturnType<typeof createServerClient>,
  timeRange: string,
  targetWeekKey: string,
): Promise<NextResponse> {
  // Fetch ALL points with pagination to avoid silent truncation (H3 fix)
  const allPoints: { wallet_address: string; points_delta: number; created_at: string }[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('points_ledger')
      .select('wallet_address, points_delta, created_at')
      .range(offset, offset + PAGE_SIZE - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Leaderboard fallback points query error:', error);
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allPoints.push(...data);
      offset += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    }
  }

  const [usersResult, submissionsResult] = await Promise.all([
    supabase
      .from('users')
      .select('wallet_address, display_name, avatar_url, level, is_holder')
      .eq('is_holder', true),
    supabase
      .from('submissions')
      .select('wallet_address, normalized_score, created_at, status')
      .eq('status', 'approved'),
  ]);

  if (usersResult.error) {
    console.error('Leaderboard fallback users query error:', usersResult.error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
  if (submissionsResult.error) {
    console.error('Leaderboard fallback submissions query error:', submissionsResult.error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }

  const users = usersResult.data || [];
  const submissions = submissionsResult.data || [];

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

  for (const pointEntry of allPoints) {
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

  const response = NextResponse.json({
    leaderboard,
    range: timeRange,
    week_number: timeRange === 'week' ? parseInt(targetWeekKey.split('-')[1], 10) : null,
    year: timeRange === 'week' ? parseInt(targetWeekKey.split('-')[0], 10) : null,
    total_participants: leaderboard.length,
    generated_at: new Date().toISOString(),
    current_week_number: getISOWeekNumber(new Date()),
    current_year: getISOWeekYear(new Date()),
  });

  response.headers.set('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=60`);

  return response;
}
