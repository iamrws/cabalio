import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getISOWeekKey } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', session.walletAddress)
    .single();

  if (userError) {
    console.error('Summary user query error:', userError);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }

  const weekKey = getISOWeekKey(new Date());

  const [submissionsResult, rewardsResult, pointsResult] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, type, title, points_awarded, normalized_score, status, created_at')
      .eq('wallet_address', session.walletAddress)
      .order('created_at', { ascending: false }),
    supabase
      .from('rewards')
      .select('*')
      .eq('wallet_address', session.walletAddress)
      .order('created_at', { ascending: false }),
    supabase
      .from('points_ledger')
      .select('id, entry_type, points_delta, metadata, created_at, submission_id')
      .eq('wallet_address', session.walletAddress)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (submissionsResult.error) {
    console.error('Summary submissions query error:', submissionsResult.error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }
  if (rewardsResult.error) {
    console.error('Summary rewards query error:', rewardsResult.error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }
  if (pointsResult.error) {
    console.error('Summary points query error:', pointsResult.error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }

  const submissions = submissionsResult.data || [];
  const rewards = rewardsResult.data || [];
  const pointsHistory = pointsResult.data || [];

  const approved = submissions.filter((submission) => submission.status === 'approved');
  const weeklyPoints = pointsHistory.reduce((sum, entry) => {
    const entryWeek = getISOWeekKey(new Date(entry.created_at));
    return entryWeek === weekKey ? sum + (entry.points_delta || 0) : sum;
  }, 0);
  const totalPoints = pointsHistory.reduce((sum, entry) => sum + (entry.points_delta || 0), 0);

  const avgScore =
    approved.length > 0
      ? Math.round(
          (approved.reduce((sum, submission) => sum + (submission.normalized_score || 0), 0) / approved.length) * 10
        ) / 10
      : 0;

  return NextResponse.json({
    wallet_address: session.walletAddress,
    user,
    rewards,
    contributions: submissions,
    points_history: pointsHistory,
    stats: {
      total_submissions: submissions.length,
      approved_submissions: approved.length,
      pending_submissions: submissions.filter((submission) => submission.status === 'submitted').length,
      total_points: totalPoints,
      weekly_points: weeklyPoints,
      avg_score: avgScore,
    },
  });
}

