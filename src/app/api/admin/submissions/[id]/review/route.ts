import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin, verifyAdminStatus } from '@/lib/auth';
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
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const isAdmin = await verifyAdminStatus(session.walletAddress);
  if (!isAdmin) {
    const supabaseAudit = createServerClient();
    supabaseAudit.from('audit_logs').insert({
      action: 'admin_access_denied',
      actor_wallet: session.walletAddress,
      target_wallet: session.walletAddress,
      details: { endpoint: '/api/admin/submissions/review', reason: 'not_admin' },
      created_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid submission ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.parse(body);

    const supabase = createServerClient();
    // Status is validated below in each action branch via .in('status', [...]) guards
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // L6: Helper to insert an immutable audit log for every admin review action
    const adminWallet = session.walletAddress;
    async function logAdminReviewAction(
      action: string,
      submissionId: string,
      targetWallet: string,
      extra: Record<string, unknown> = {}
    ) {
      const auditNow = new Date().toISOString();
      const { error: auditErr } = await supabase.from('audit_logs').insert({
        action: `submission_${action}`,
        actor_wallet: adminWallet,
        target_wallet: targetWallet,
        details: {
          submission_id: submissionId,
          note: parsed.note || null,
          ...extra,
        },
        created_at: auditNow,
      });
      if (auditErr) {
        console.error('Audit log insert failed for admin review:', auditErr);
      }
    }

    if (parsed.action === 'reject') {
      const now = new Date().toISOString();

      const { data: rejectedSubmission, error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          scored_at: now,
        })
        .eq('id', id)
        .in('status', ['submitted', 'queued', 'ai_scored', 'human_review', 'flagged'])
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Submission reject update error:', error);
        return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
      }

      if (!rejectedSubmission) {
        return NextResponse.json(
          { error: 'Submission has already been reviewed or is in a terminal state' },
          { status: 409 }
        );
      }

      await logAdminReviewAction('rejected', id, submission.wallet_address);

      // ── Cascade-reject: reverse any quest bonuses that were auto-approved
      // based on this submission, and mark those quest submissions as rejected.
      const { data: linkedQuestSubs } = await supabase
        .from('season_quest_submissions')
        .select('id, season_id, quest_id, wallet_address')
        .eq('evidence_type', 'submission_id')
        .eq('evidence_id', id)
        .eq('status', 'approved');

      if (linkedQuestSubs && linkedQuestSubs.length > 0) {
        for (const qs of linkedQuestSubs) {
          // Reject the quest submission
          await supabase
            .from('season_quest_submissions')
            .update({
              status: 'rejected',
              reviewed_at: now,
              reviewed_by: session.walletAddress,
              updated_at: now,
            })
            .eq('id', qs.id);

          // Find the corresponding points_ledger entry and reverse it
          const { data: ledgerEntries } = await supabase
            .from('points_ledger')
            .select('id, points_delta')
            .eq('wallet_address', qs.wallet_address)
            .eq('entry_type', 'quest_bonus')
            .contains('metadata', { season_quest_submission_id: qs.id });

          if (ledgerEntries && ledgerEntries.length > 0) {
            for (const entry of ledgerEntries) {
              await supabase.from('points_ledger').insert({
                wallet_address: qs.wallet_address,
                entry_type: 'penalty',
                points_delta: -Math.abs(entry.points_delta),
                metadata: {
                  reason_code: 'cascade_reject_reversal',
                  reversed_ledger_id: entry.id,
                  season_quest_submission_id: qs.id,
                  season_id: qs.season_id,
                  quest_id: qs.quest_id,
                  source_submission_id: id,
                  rejected_by: session.walletAddress,
                },
                created_at: now,
              });
            }
          }
        }
      }

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    if (parsed.action === 'flag') {
      const { data: flaggedSubmission, error } = await supabase
        .from('submissions')
        .update({
          status: 'flagged',
          scored_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['submitted', 'queued', 'ai_scored', 'human_review'])
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Submission flag update error:', error);
        return NextResponse.json({ error: 'Failed to flag submission' }, { status: 500 });
      }

      if (!flaggedSubmission) {
        return NextResponse.json(
          { error: 'Submission has already been reviewed or is in a terminal state' },
          { status: 409 }
        );
      }

      await logAdminReviewAction('flagged', id, submission.wallet_address);

      return NextResponse.json({ success: true, status: 'flagged' });
    }

    if (!['x_post', 'blog', 'art'].includes(submission.type)) {
      return NextResponse.json({ error: 'Unsupported submission type' }, { status: 400 });
    }

    const scoringBreakdown = await scoreSubmission(
      submission.content_text,
      submission.type as 'x_post' | 'blog' | 'art'
    );

    if (!scoringBreakdown) {
      // Anomaly detected — flag for human review instead of auto-scoring
      await supabase.from('submissions').update({
        status: 'human_review',
        scored_at: new Date().toISOString(),
      }).eq('id', id);

      return NextResponse.json({
        success: true,
        action: 'flagged_for_review',
        message: 'Scoring anomaly detected — submission flagged for manual review',
      });
    }

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

    const { data: updatedSubmission, error: updateSubmissionError } = await supabase
      .from('submissions')
      .update({
        raw_score: scoringBreakdown.weighted_total,
        normalized_score: scoringBreakdown.weighted_total * 10,
        scoring_breakdown: scoringBreakdown,
        points_awarded: points,
        status: 'approved',
        scored_at: now,
      })
      .eq('id', id)
      .in('status', ['submitted', 'queued', 'ai_scored', 'human_review'])
      .select('id')
      .maybeSingle();

    if (updateSubmissionError) {
      console.error('Submission approve update error:', updateSubmissionError);
      return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 });
    }

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: 'Submission has already been reviewed or is in a terminal state' },
        { status: 409 }
      );
    }

    const previousLongestStreak = userData?.longest_streak || 0;
    const newStreak = streakInfo.newStreak;

    // Use optimistic lock: only update if total_xp hasn't changed since we read it
    const { data: updatedUser, error: xpError } = await supabase
      .from('users')
      .update({
        total_xp: (userData?.total_xp || 0) + points,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, previousLongestStreak),
        last_submission_date: today,
        updated_at: now,
      })
      .eq('wallet_address', submission.wallet_address)
      .eq('total_xp', userData?.total_xp || 0)  // Optimistic lock: only update if XP hasn't changed
      .select('total_xp')
      .maybeSingle();

    if (!updatedUser && !xpError) {
      // Concurrent modification detected — re-read and retry once
      const { data: freshUser } = await supabase
        .from('users')
        .select('total_xp, current_streak, longest_streak')
        .eq('wallet_address', submission.wallet_address)
        .single();

      if (freshUser) {
        await supabase.from('users').update({
          total_xp: freshUser.total_xp + points,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, freshUser.longest_streak || 0),
          last_submission_date: today,
          updated_at: now,
        }).eq('wallet_address', submission.wallet_address);
      }
    }

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

    await logAdminReviewAction('approved', id, submission.wallet_address, {
      points_awarded: points,
      scoring_weighted_total: scoringBreakdown.weighted_total,
    });

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
