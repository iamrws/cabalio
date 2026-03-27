import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { getISOWeekKey } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

/** Base58 alphabet used by Solana wallet addresses. */
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(input: string): boolean {
  return BASE58_REGEX.test(input);
}

function normalizeWalletAddress(input: string): string {
  return input.trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { address } = await params;
  const walletAddress = normalizeWalletAddress(address);

  // L3: Validate Solana wallet address format (base58, 32-44 chars)
  if (!isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
  }

  const isSelf = walletAddress === session.walletAddress;
  const isAdmin = session.role === 'admin';

  const supabase = createServerClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('wallet_address, display_name, avatar_url, level, total_xp, current_streak, longest_streak, badges, created_at')
    .eq('wallet_address', walletAddress)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const submissionsQuery = supabase
    .from('submissions')
    .select('id, type, title, url, points_awarded, normalized_score, status, created_at')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(50);

  const pointsQuery = supabase
    .from('points_ledger')
    .select('id, entry_type, points_delta, metadata, created_at, submission_id')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(100);

  const rewardsQuery = supabase
    .from('rewards')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(25);

  const [submissionsResult, pointsResult, rewardsResult] = await Promise.all([
    submissionsQuery,
    pointsQuery,
    rewardsQuery,
  ]);

  if (submissionsResult.error) {
    console.error('Profile submissions query error:', submissionsResult.error);
    return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 });
  }
  if (pointsResult.error) {
    console.error('Profile points query error:', pointsResult.error);
    return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 });
  }
  if (rewardsResult.error) {
    console.error('Profile rewards query error:', rewardsResult.error);
    return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 });
  }

  const rawSubmissions = submissionsResult.data || [];
  const rawPoints = pointsResult.data || [];
  const rewards = rewardsResult.data || [];

  const submissions = isSelf || isAdmin
    ? rawSubmissions
    : rawSubmissions.filter((submission) => submission.status === 'approved');

  const visiblePoints = isSelf || isAdmin
    ? rawPoints
    : rawPoints.filter((entry) => entry.entry_type === 'submission_approved');

  const approvedSubmissions = rawSubmissions.filter((submission) => submission.status === 'approved');
  const weekKey = getISOWeekKey(new Date());

  const weeklyPoints = visiblePoints.reduce((sum, entry) => {
    const entryWeek = getISOWeekKey(new Date(entry.created_at));
    return entryWeek === weekKey ? sum + (entry.points_delta || 0) : sum;
  }, 0);

  const totalPoints = visiblePoints.reduce((sum, entry) => sum + (entry.points_delta || 0), 0);

  const avgScore =
    approvedSubmissions.length > 0
      ? Math.round(
          (approvedSubmissions.reduce((sum, submission) => sum + (submission.normalized_score || 0), 0) /
            approvedSubmissions.length) *
            10
        ) / 10
      : 0;

  return NextResponse.json({
    wallet_address: walletAddress,
    user,
    rewards: (isSelf || isAdmin) ? rewards : [],
    contributions: submissions,
    points_history: visiblePoints,
    stats: {
      total_submissions: submissions.length,
      approved_submissions: approvedSubmissions.length,
      pending_submissions: submissions.filter((submission) => submission.status === 'submitted').length,
      total_points: totalPoints,
      weekly_points: weeklyPoints,
      avg_score: avgScore,
    },
    viewer: {
      is_self: isSelf,
      is_admin: isAdmin,
    },
  });
}
