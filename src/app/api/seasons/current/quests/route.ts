import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';
import { ensureSeasonMemberState, getLiveSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  const supabase = createServerClient();
  const nowIso = new Date().toISOString();

  try {
    const season = await getLiveSeason(supabase);
    if (!season) {
      return NextResponse.json({ season: null, quests: [] });
    }

    const memberState = await ensureSeasonMemberState(supabase, season.id, session.walletAddress);

    let questQuery = supabase
      .from('season_quests')
      .select('id, role_key, title, rules_json, points_reward, active, starts_at, ends_at')
      .eq('season_id', season.id)
      .eq('active', true)
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso)
      .order('starts_at', { ascending: true });

    if (memberState.role_key) {
      questQuery = questQuery.or(`role_key.is.null,role_key.eq.${memberState.role_key}`);
    } else {
      questQuery = questQuery.is('role_key', null);
    }

    const questResult = await questQuery;
    if (questResult.error) {
      return NextResponse.json({ error: questResult.error.message }, { status: 500 });
    }

    const quests = questResult.data || [];
    const questIds = quests.map((quest) => quest.id);

    const submissionResult = questIds.length
      ? await supabase
          .from('season_quest_submissions')
          .select('id, quest_id, status, evidence_type, evidence_id, created_at, reviewed_at')
          .eq('season_id', season.id)
          .eq('wallet_address', session.walletAddress)
          .in('quest_id', questIds)
          .order('created_at', { ascending: false })
      : { data: [], error: null };

    if (submissionResult.error) {
      return NextResponse.json({ error: submissionResult.error.message }, { status: 500 });
    }

    const latestSubmissionByQuest = new Map<string, (typeof submissionResult.data)[number]>();
    for (const submission of submissionResult.data || []) {
      if (!latestSubmissionByQuest.has(submission.quest_id)) {
        latestSubmissionByQuest.set(submission.quest_id, submission);
      }
    }

    const items = quests.map((quest) => {
      const submission = latestSubmissionByQuest.get(quest.id) || null;
      return {
        id: quest.id,
        role_key: quest.role_key,
        title: quest.title,
        rules: quest.rules_json || {},
        points_reward: quest.points_reward,
        starts_at: quest.starts_at,
        ends_at: quest.ends_at,
        can_submit: !submission || submission.status === 'rejected' || submission.status === 'flagged',
        submission_status: submission?.status || null,
        last_submission: submission,
      };
    });

    await trackEngagementEvent(supabase, 'season_quest_viewed', session.walletAddress, {
      season_id: season.id,
      role_key: memberState.role_key,
      quest_count: items.length,
    });

    return NextResponse.json({
      season,
      member_state: memberState,
      quests: items,
    });
  } catch (error) {
    console.error('Season quests fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
