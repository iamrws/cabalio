import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getISOWeekNumber, getISOWeekYear } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

const SOL_PER_POINT = parseFloat(process.env.REWARDS_SOL_PER_POINT || '0.0001');

interface WeekBucket {
  week_number: number;
  year: number;
  points: number;
}

function getWeekBuckets(weeksBack: number): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const now = new Date();
  for (let i = 0; i < weeksBack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    buckets.push({
      week_number: getISOWeekNumber(d),
      year: getISOWeekYear(d),
      points: 0,
    });
  }
  return buckets;
}

function isSameISOWeek(date: Date, weekNum: number, year: number): boolean {
  return getISOWeekNumber(date) === weekNum && getISOWeekYear(date) === year;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Fetch last ~9 weeks of points data (8 full weeks + partial current)
  const nineWeeksAgo = new Date();
  nineWeeksAgo.setDate(nineWeeksAgo.getDate() - 63); // 9 * 7

  const { data: ledgerEntries, error: ledgerError } = await supabase
    .from('points_ledger')
    .select('points_delta, created_at')
    .eq('wallet_address', session.walletAddress)
    .gte('created_at', nineWeeksAgo.toISOString())
    .order('created_at', { ascending: false });

  if (ledgerError) {
    console.error('Reward projections ledger query error:', ledgerError);
    return NextResponse.json({ error: 'Failed to load projections' }, { status: 500 });
  }

  const entries = ledgerEntries || [];

  // Build 8-week history buckets (index 0 = current week, 7 = oldest)
  const buckets = getWeekBuckets(8);

  for (const entry of entries) {
    const entryDate = new Date(entry.created_at);
    for (const bucket of buckets) {
      if (isSameISOWeek(entryDate, bucket.week_number, bucket.year)) {
        bucket.points += entry.points_delta || 0;
        break;
      }
    }
  }

  const currentWeekPoints = buckets[0].points;

  // Last 4 completed weeks for average (skip current week at index 0)
  const last4Weeks = buckets.slice(1, 5);
  const last4Total = last4Weeks.reduce((sum, b) => sum + b.points, 0);
  const avgWeeklyPoints = Math.round(last4Total / 4);

  // Project current week: extrapolate based on day of week
  // Sunday = 0, Monday = 1, ... Saturday = 6
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  // ISO weeks start Monday, so days elapsed: Mon=1, Tue=2, ..., Sun=7
  const daysElapsed = dayOfWeek === 0 ? 7 : dayOfWeek;
  const projectedWeekPoints =
    daysElapsed > 0 ? Math.round((currentWeekPoints / daysElapsed) * 7) : currentWeekPoints;

  // SOL estimates
  const estimatedWeeklySol = avgWeeklyPoints * SOL_PER_POINT;
  const estimatedMonthlySol = estimatedWeeklySol * 4;

  // Trend: compare recent 2 weeks vs prior 2 weeks
  const recent2 = buckets.slice(1, 3).reduce((s, b) => s + b.points, 0);
  const prior2 = buckets.slice(3, 5).reduce((s, b) => s + b.points, 0);
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendPct = 0;
  if (prior2 > 0) {
    trendPct = Math.round(((recent2 - prior2) / prior2) * 100);
    if (trendPct > 10) trend = 'up';
    else if (trendPct < -10) trend = 'down';
  } else if (recent2 > 0) {
    trend = 'up';
    trendPct = 100;
  }

  // Build weeks_history array (oldest first for chart display)
  const weeksHistory = buckets
    .slice()
    .reverse()
    .map((b) => ({
      week_number: b.week_number,
      year: b.year,
      points: b.points,
      reward_sol: parseFloat((b.points * SOL_PER_POINT).toFixed(6)),
    }));

  return NextResponse.json({
    avg_weekly_points: avgWeeklyPoints,
    current_week_points: currentWeekPoints,
    projected_week_points: projectedWeekPoints,
    estimated_weekly_sol: parseFloat(estimatedWeeklySol.toFixed(6)),
    estimated_monthly_sol: parseFloat(estimatedMonthlySol.toFixed(6)),
    trend,
    trend_pct: trendPct,
    weeks_history: weeksHistory,
  });
}
