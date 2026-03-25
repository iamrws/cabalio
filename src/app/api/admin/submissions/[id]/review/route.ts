import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { scoreSubmission } from '@/lib/scoring';
import { calculatePoints, calculateStreak } from '@/lib/points';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'flag']),
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = reviewSchema.parse(body);

    const supabase = createServerClient();
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (parsed.action === 'reject') {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          scored_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    if (parsed.action === 'flag') {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'flagged',
          scored_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'flagged' });
    }

    if (!['x_post', 'blog', 'art'].includes(submission.type)) {
      return NextResponse.json({ error: 'Unsupported submission type' }, { status: 400 });
    }

    const scoringBreakdown = await scoreSubmission(
      submission.content_text,
      submission.type as 'x_post' | 'blog' | 'art'
    );

    const { data: userData } = await supabase
      .from('users')
      .select('current_streak, last_submission_date, total_xp, longest_streak')
      .eq('wallet_address', submission.wallet_address)
      .single();

    const streakInfo = calculateStreak(
      userData?.last_submission_date || null,
      userData?.current_streak || 0
    );

    const points = calculatePoints(scoringBreakdown.weighted_total * 10, streakInfo.newStreak, false);
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const { error: updateSubmissionError } = await supabase
      .from('submissions')
      .update({
        raw_score: scoringBreakdown.weighted_total,
        normalized_score: scoringBreakdown.weighted_total * 10,
        scoring_breakdown: scoringBreakdown,
        points_awarded: points,
        status: 'approved',
        scored_at: now,
      })
      .eq('id', id);

    if (updateSubmissionError) {
      return NextResponse.json({ error: updateSubmissionError.message }, { status: 500 });
    }

    const newTotalXp = (userData?.total_xp || 0) + points;
    const previousLongestStreak = userData?.longest_streak || 0;

    await supabase
      .from('users')
      .update({
        current_streak: streakInfo.newStreak,
        longest_streak: Math.max(streakInfo.newStreak, previousLongestStreak),
        last_submission_date: today,
        total_xp: newTotalXp,
        updated_at: now,
      })
      .eq('wallet_address', submission.wallet_address);

    await supabase.from('points_ledger').insert({
      wallet_address: submission.wallet_address,
      submission_id: submission.id,
      entry_type: 'submission_approved',
      points_delta: points,
      metadata: {
        reviewed_by: session.walletAddress,
        note: parsed.note || null,
      },
      created_at: now,
    });

    // Auto-complete any pending season quest submissions that referenced this submission.
    const pendingSeasonQuestResult = await supabase
      .from('season_quest_submissions')
      .select('id, season_id, quest_id')
      .eq('wallet_address', submission.wallet_address)
      .eq('evidence_type', 'submission_id')
      .eq('evidence_id', submission.id)
      .eq('status', 'submitted');

    if (!pendingSeasonQuestResult.error && (pendingSeasonQuestResult.data || []).length > 0) {
      const questIds = Array.from(new Set((pendingSeasonQuestResult.data || []).map((row) => row.quest_id)));
      const seasonQuestRows = await supabase
        .from('season_quests')
        .select('id, points_reward')
        .in('id', questIds);

      if (!seasonQuestRows.error) {
        const pointsByQuestId = new Map<string, number>();
        for (const quest of seasonQuestRows.data || []) {
          pointsByQuestId.set(quest.id, quest.points_reward || 0);
        }

        for (const questSubmission of pendingSeasonQuestResult.data || []) {
          const questBonusPoints = pointsByQuestId.get(questSubmission.quest_id) || 0;

          await supabase
            .from('season_quest_submissions')
            .update({
              status: 'approved',
              reviewed_at: now,
              reviewed_by: session.walletAddress,
              updated_at: now,
            })
            .eq('id', questSubmission.id);

          await supabase.from('points_ledger').insert({
            wallet_address: submission.wallet_address,
            entry_type: 'quest_bonus',
            points_delta: questBonusPoints,
            metadata: {
              reason_code: 'season_quest_approved',
              season_id: questSubmission.season_id,
              quest_id: questSubmission.quest_id,
              season_quest_submission_id: questSubmission.id,
              approved_via_submission_review: submission.id,
            },
            created_at: now,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
      points_awarded: points,
      scoring: scoringBreakdown,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Admin review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
