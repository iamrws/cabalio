import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, verifyAdminStatus } from '@/lib/auth';
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

/**
 * Never cache publicly. Response depends on the requesting session (self/admin/
 * other holder vary). Vary: Cookie tells any upstream CDN that the payload is
 * cookie-dependent. Closes H-01.
 */
const PRIVATE_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: PRIVATE_HEADERS }
    );
  }

  const { address } = await params;
  const walletAddress = normalizeWalletAddress(address);

  if (!isValidSolanaAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address format' },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const isSelf = walletAddress === session.walletAddress;
  // Live admin check (not the stale session.role). Closes M-01 for this route.
  const isAdmin = await verifyAdminStatus(session.walletAddress, session);

  const supabase = createServerClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select(
      'wallet_address, display_name, avatar_url, level, total_xp, current_streak, longest_streak, badges, is_holder, holder_verified_at, created_at, preferences'
    )
    .eq('wallet_address', walletAddress)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404, headers: PRIVATE_HEADERS }
    );
  }

  // H-01: honor preferences.privacy.public_profile. Default is true (public).
  const prefs = (user.preferences as Record<string, unknown>) || {};
  const privacy = (prefs.privacy as Record<string, unknown>) || {};
  const publicProfile = privacy.public_profile !== false;
  if (!publicProfile && !isSelf && !isAdmin) {
    // 404 (not 403) to avoid leaking existence of the private profile.
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404, headers: PRIVATE_HEADERS }
    );
  }

  const submissionsQuery = supabase
    .from('submissions')
    .select(
      'id, type, title, url, points_awarded, normalized_score, scoring_breakdown, status, created_at'
    )
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

  if (submissionsResult.error || pointsResult.error || rewardsResult.error) {
    console.error('Profile query failures:', {
      submissions: submissionsResult.error?.message,
      points: pointsResult.error?.message,
      rewards: rewardsResult.error?.message,
    });
    return NextResponse.json(
      { error: 'Failed to load profile data' },
      { status: 500, headers: PRIVATE_HEADERS }
    );
  }

  const rawSubmissions = submissionsResult.data || [];
  const rawPoints = pointsResult.data || [];
  const rewards = rewardsResult.data || [];

  const submissions =
    isSelf || isAdmin
      ? rawSubmissions
      : rawSubmissions.filter((submission) => submission.status === 'approved');

  const visiblePoints =
    isSelf || isAdmin
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
          (approvedSubmissions.reduce(
            (sum, submission) => sum + (submission.normalized_score || 0),
            0
          ) /
            approvedSubmissions.length) *
            10
        ) / 10
      : 0;

  // Strip preferences from the user payload: it's needed for the privacy
  // gate but shouldn't leak a user's notification settings etc. to admins.
  const { preferences: _preferences, ...publicUser } = user;
  void _preferences;

  return NextResponse.json(
    {
      wallet_address: walletAddress,
      user: publicUser,
      rewards: isSelf || isAdmin ? rewards : [],
      contributions: submissions,
      points_history: visiblePoints,
      stats: {
        total_submissions: submissions.length,
        approved_submissions: approvedSubmissions.length,
        pending_submissions:
          isSelf || isAdmin
            ? submissions.filter((submission) => submission.status === 'submitted').length
            : 0,
        total_points: totalPoints,
        weekly_points: weeklyPoints,
        avg_score: avgScore,
      },
      viewer: {
        is_self: isSelf,
        is_admin: isAdmin,
      },
    },
    { headers: PRIVATE_HEADERS }
  );
}
