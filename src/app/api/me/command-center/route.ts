import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import {
  BRACKET_SIZE,
  getBracketName,
  getTierProgress,
  getUtcWeekWindow,
  isNextActionEligible,
  NextActionTemplateRow,
} from '@/lib/engagement';
import { trackEngagementEvent } from '@/lib/analytics';
import { getLiveSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

interface WeeklyRankRow {
  wallet_address: string;
  points: number;
}

function toDateOnly(isoString: string): string {
  return new Date(isoString).toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  const supabase = createServerClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const { weekStart, weekEnd } = getUtcWeekWindow(now);

  try {
    const [
      userResult,
      streakResult,
      templatesResult,
      submissionsResult,
      allPointsResult,
      weeklyPointsResult,
      holdersResult,
      liveSeason,
    ] = await Promise.all([
      supabase
        .from('users')
        .select('wallet_address, current_streak, last_submission_date')
        .eq('wallet_address', session.walletAddress)
        .maybeSingle(),
      supabase
        .from('member_streak_state')
        .select('*')
        .eq('wallet_address', session.walletAddress)
        .maybeSingle(),
      supabase
        .from('next_action_templates')
        .select('*')
        .eq('active', true)
        .order('priority_weight', { ascending: false }),
      supabase
        .from('submissions')
        .select('status, created_at')
        .eq('wallet_address', session.walletAddress)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('points_ledger')
        .select('points_delta, created_at')
        .eq('wallet_address', session.walletAddress)
        .order('created_at', { ascending: false }),
      supabase
        .from('points_ledger')
        .select('wallet_address, points_delta, created_at')
        .gte('created_at', weekStart)
        .lt('created_at', weekEnd),
      supabase
        .from('users')
        .select('wallet_address')
        .eq('is_holder', true),
      getLiveSeason(supabase),
    ]);

    if (userResult.error) { console.error('Command center user query error:', userResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }
    if (streakResult.error) { console.error('Command center streak query error:', streakResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }
    if (templatesResult.error) { console.error('Command center templates query error:', templatesResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }
    if (submissionsResult.error) { console.error('Command center submissions query error:', submissionsResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }
    if (allPointsResult.error) { console.error('Command center points query error:', allPointsResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }
    if (weeklyPointsResult.error) { console.error('Command center weekly points query error:', weeklyPointsResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }
    if (holdersResult.error) { console.error('Command center holders query error:', holdersResult.error); return NextResponse.json({ error: 'Failed to load command center' }, { status: 500 }); }

    const user = userResult.data;
    const allPoints = allPointsResult.data || [];
    const weeklyPointsEntries = weeklyPointsResult.data || [];
    const submissions = submissionsResult.data || [];
    const holderRows = holdersResult.data || [];
    const templates = (templatesResult.data || []) as NextActionTemplateRow[];

    const totalPoints = allPoints.reduce((sum, item) => sum + (item.points_delta || 0), 0);
    const tierProgress = getTierProgress(totalPoints);

    const streakState = streakResult.data;
    const currentStreakDays = streakState?.current_days ?? user?.current_streak ?? 0;
    const shieldCount = streakState?.shields_available ?? 1;
    let lastActivityAt = streakState?.last_activity_at ?? null;
    let comebackBonusReady = false;

    if (!streakState) {
      const seedLastActivity = user?.last_submission_date
        ? new Date(`${user.last_submission_date}T00:00:00.000Z`).toISOString()
        : null;
      await supabase.from('member_streak_state').upsert(
        {
          wallet_address: session.walletAddress,
          current_days: currentStreakDays,
          shields_available: 1,
          last_activity_at: seedLastActivity,
          updated_at: nowIso,
        },
        { onConflict: 'wallet_address' }
      );
      lastActivityAt = seedLastActivity;
    } else if (streakState.broken_at) {
      comebackBonusReady =
        !streakState.comeback_bonus_used_at ||
        new Date(streakState.comeback_bonus_used_at).getTime() <
          new Date(streakState.broken_at).getTime();
    }

    const weeklyPointMap = new Map<string, number>();
    for (const holder of holderRows) {
      weeklyPointMap.set(holder.wallet_address, 0);
    }
    if (!weeklyPointMap.has(session.walletAddress)) {
      weeklyPointMap.set(session.walletAddress, 0);
    }
    for (const entry of weeklyPointsEntries) {
      const key = entry.wallet_address;
      weeklyPointMap.set(key, (weeklyPointMap.get(key) || 0) + (entry.points_delta || 0));
    }

    const rankedRows: WeeklyRankRow[] = Array.from(weeklyPointMap.entries()).map(([wallet, points]) => ({
      wallet_address: wallet,
      points,
    }));

    rankedRows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.wallet_address.localeCompare(b.wallet_address);
    });

    const userRankIndex = rankedRows.findIndex((row) => row.wallet_address === session.walletAddress);
    const safeRankIndex = userRankIndex >= 0 ? userRankIndex : rankedRows.length;
    const bracketIndex = Math.floor(safeRankIndex / BRACKET_SIZE);
    const bracketStart = bracketIndex * BRACKET_SIZE;
    const bracketRows = rankedRows.slice(bracketStart, bracketStart + BRACKET_SIZE);
    const withinBracketIndex = Math.max(0, safeRankIndex - bracketStart);
    const prevRow = withinBracketIndex > 0 ? bracketRows[withinBracketIndex - 1] : null;

    const weeklyPointsForUser = weeklyPointMap.get(session.walletAddress) || 0;
    const pointsToNextRank = prevRow ? Math.max(0, prevRow.points - weeklyPointsForUser + 1) : 0;

    const approvedSubmissions = submissions.filter((item) => item.status === 'approved').length;
    const hasContributionToday = submissions.some(
      (item) => toDateOnly(item.created_at) === toDateOnly(nowIso)
    );

    const chosenAction =
      templates.find((template) =>
        isNextActionEligible(template, {
          approvedSubmissions,
          hasLiveSeason: Boolean(liveSeason && liveSeason.status === 'live'),
          streakDays: currentStreakDays,
          hasContributionToday,
        })
      ) || null;

    const fallbackAction = {
      action_id: 'submit_quality_content',
      title: 'Submit one high-quality contribution',
      reason: 'Consistent quality contributions build long-term trust and progression.',
      estimated_points: 10,
      expires_in_hours: 24,
    };

    const action = chosenAction || fallbackAction;
    const expiresAt = new Date(now.getTime() + action.expires_in_hours * 60 * 60 * 1000).toISOString();

    await trackEngagementEvent(supabase, 'command_center_viewed', session.walletAddress, {
      tier: tierProgress.current,
      streak_days: currentStreakDays,
      bracket_name: getBracketName(bracketIndex),
      weekly_points: weeklyPointsForUser,
    });

    return NextResponse.json(
      {
        wallet_address: session.walletAddress,
        tier: {
          current: tierProgress.current,
          current_points: tierProgress.currentPoints,
          next_tier: tierProgress.nextTier,
          points_to_next: tierProgress.pointsToNext,
          progress: tierProgress.progress,
          unlocks_preview: tierProgress.unlocksPreview,
        },
        streak: {
          current_days: currentStreakDays,
          shield_available: shieldCount > 0,
          shields_available: shieldCount,
          comeback_bonus_ready: comebackBonusReady,
          last_meaningful_activity_at: lastActivityAt,
        },
        bracket: {
          week_start: weekStart,
          week_end: weekEnd,
          name: getBracketName(bracketIndex),
          rank: safeRankIndex + 1,
          members: bracketRows.length,
          points: weeklyPointsForUser,
          points_to_next_rank: pointsToNextRank,
        },
        next_best_action: {
          action_id: action.action_id,
          title: action.title,
          reason: action.reason,
          estimated_points: action.estimated_points,
          expires_at: expiresAt,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Command center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
