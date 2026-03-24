import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getISOWeekNumber } from '@/lib/scoring';

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
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const weekNumber = getISOWeekNumber(new Date());

  const [submissionsResult, rewardsResult] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, points_awarded, normalized_score, status, created_at')
      .eq('wallet_address', session.walletAddress)
      .order('created_at', { ascending: false }),
    supabase
      .from('rewards')
      .select('*')
      .eq('wallet_address', session.walletAddress)
      .order('created_at', { ascending: false }),
  ]);

  if (submissionsResult.error) {
    return NextResponse.json({ error: submissionsResult.error.message }, { status: 500 });
  }
  if (rewardsResult.error) {
    return NextResponse.json({ error: rewardsResult.error.message }, { status: 500 });
  }

  const submissions = submissionsResult.data || [];
  const rewards = rewardsResult.data || [];

  const approved = submissions.filter((submission) => submission.status === 'approved');
  const weeklyPoints = approved
    .filter((submission) => {
      const created = new Date(submission.created_at);
      return getISOWeekNumber(created) === weekNumber;
    })
    .reduce((sum, submission) => sum + (submission.points_awarded || 0), 0);

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
    stats: {
      total_submissions: submissions.length,
      approved_submissions: approved.length,
      pending_submissions: submissions.filter((submission) => submission.status === 'submitted').length,
      weekly_points: weeklyPoints,
      avg_score: avgScore,
    },
  });
}
