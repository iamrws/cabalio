import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';
import { ensureSeasonMemberState, getLiveSeason } from '@/lib/seasons';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const questSubmitSchema = z.object({
  evidence_type: z.enum(['submission_id', 'url', 'text', 'none']),
  evidence_id: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

/** Rate limit window in seconds. */
const QUEST_RATE_LIMIT_WINDOW_SECONDS = 3600;
/** Max quest submissions per wallet per window. */
const QUEST_RATE_LIMIT_MAX = 20;

interface QuestRuleCheckInput {
  status: string;
  type: string | null;
  normalized_score: number | null;
  created_at: string | null;
}

interface QuestForRules {
  starts_at: string;
  ends_at: string;
}

/**
 * Evaluate a quest's rules_json against a source submission. Returns true
 * only when every declared rule passes. Unknown rule keys are ignored so
 * stored rules remain forward-compatible. Supported rules:
 *   - requires_type: string  -> submission.type must match
 *   - min_score: number      -> submission.normalized_score must be >=
 *   - requires_created_within_window: boolean
 *                              -> submission.created_at must fall between
 *                                 quest.starts_at and quest.ends_at
 *   - requires_created_after: ISO string
 *                              -> submission.created_at must be newer
 */
function evaluateQuestRules(
  rules: Record<string, unknown>,
  submission: QuestRuleCheckInput,
  quest: QuestForRules
): boolean {
  if (!rules || Object.keys(rules).length === 0) return true;

  const requiresType = typeof rules.requires_type === 'string' ? rules.requires_type : null;
  if (requiresType && submission.type !== requiresType) return false;

  const minScore = typeof rules.min_score === 'number' ? rules.min_score : null;
  if (minScore !== null && (submission.normalized_score ?? 0) < minScore) return false;

  const requiresWithinWindow = rules.requires_created_within_window === true;
  if (requiresWithinWindow) {
    if (!submission.created_at) return false;
    const createdMs = new Date(submission.created_at).getTime();
    const startsMs = new Date(quest.starts_at).getTime();
    const endsMs = new Date(quest.ends_at).getTime();
    if (Number.isNaN(createdMs) || Number.isNaN(startsMs) || Number.isNaN(endsMs)) return false;
    if (createdMs < startsMs || createdMs > endsMs) return false;
  }

  const requiresAfter =
    typeof rules.requires_created_after === 'string' ? rules.requires_created_after : null;
  if (requiresAfter) {
    if (!submission.created_at) return false;
    const afterMs = new Date(requiresAfter).getTime();
    const createdMs = new Date(submission.created_at).getTime();
    if (Number.isNaN(afterMs) || Number.isNaN(createdMs)) return false;
    if (createdMs < afterMs) return false;
  }

  return true;
}

/** Wallet-based rate limiting backed by Supabase (serverless-safe). */
async function isSubmitRateLimited(
  supabase: ReturnType<typeof createServerClient>,
  walletAddress: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - QUEST_RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  const { data: rateLimitRow } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('wallet_address', walletAddress)
    .eq('action', 'quest_submit')
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rateLimitRow && rateLimitRow.request_count >= QUEST_RATE_LIMIT_MAX) {
    return true;
  }

  const nowIso = new Date().toISOString();

  if (rateLimitRow) {
    await supabase
      .from('rate_limits')
      .update({ request_count: rateLimitRow.request_count + 1, updated_at: nowIso })
      .eq('wallet_address', walletAddress)
      .eq('action', 'quest_submit')
      .eq('window_start', rateLimitRow.window_start);
  } else {
    await supabase.from('rate_limits').upsert(
      {
        wallet_address: walletAddress,
        action: 'quest_submit',
        request_count: 1,
        window_start: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'wallet_address,action' }
    );
  }

  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  const supabase = createServerClient();
  if (await isSubmitRateLimited(supabase, session.walletAddress)) {
    return NextResponse.json({ error: 'Too many quest submissions. Try again later.' }, { status: 429 });
  }

  try {
    const { questId } = await params;
    const body = await request.json();
    const parsed = questSubmitSchema.parse(body);
    const season = await getLiveSeason(supabase);
    if (!season) {
      return NextResponse.json({ error: 'No live season found' }, { status: 404 });
    }

    await ensureSeasonMemberState(supabase, season.id, session.walletAddress);

    const questResult = await supabase
      .from('season_quests')
      .select('*')
      .eq('id', questId)
      .eq('season_id', season.id)
      .eq('active', true)
      .maybeSingle();

    if (questResult.error) {
      console.error('Quest lookup error:', questResult.error);
      return NextResponse.json({ error: 'Failed to look up quest' }, { status: 500 });
    }
    if (!questResult.data) {
      return NextResponse.json({ error: 'Quest not found in active season' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    if (questResult.data.starts_at > nowIso || questResult.data.ends_at < nowIso) {
      return NextResponse.json({ error: 'Quest is not currently open' }, { status: 400 });
    }

    const normalizedEvidenceId = parsed.evidence_id?.trim() || null;

    if (normalizedEvidenceId) {
      // Check for evidence reuse across ANY quest for this wallet + season
      // (not just the same quest). This mirrors the database unique index
      // idx_unique_season_wallet_evidence and catches duplicates early.
      const duplicateEvidence = await supabase
        .from('season_quest_submissions')
        .select('id, quest_id, status')
        .eq('season_id', season.id)
        .eq('wallet_address', session.walletAddress)
        .eq('evidence_id', normalizedEvidenceId)
        .in('status', ['submitted', 'approved'])
        .limit(1);

      if (duplicateEvidence.error) {
        console.error('Quest duplicate evidence check error:', duplicateEvidence.error);
        return NextResponse.json({ error: 'Failed to check for duplicate evidence' }, { status: 500 });
      }

      if ((duplicateEvidence.data || []).length > 0) {
        return NextResponse.json(
          { error: 'This evidence has already been used for a quest submission in this season.' },
          { status: 409 }
        );
      }
    }

    const existingQuestSubmission = await supabase
      .from('season_quest_submissions')
      .select('id, status')
      .eq('season_id', season.id)
      .eq('wallet_address', session.walletAddress)
      .eq('quest_id', questId)
      .in('status', ['submitted', 'approved'])
      .limit(1);

    if (existingQuestSubmission.error) {
      console.error('Quest existing submission check error:', existingQuestSubmission.error);
      return NextResponse.json({ error: 'Failed to check for existing submissions' }, { status: 500 });
    }

    if ((existingQuestSubmission.data || []).length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending or approved submission for this quest.' },
        { status: 409 }
      );
    }

    let autoApprove = false;
    if (parsed.evidence_type === 'submission_id') {
      if (!normalizedEvidenceId) {
        return NextResponse.json({ error: 'submission_id evidence requires evidence_id' }, { status: 400 });
      }

      const sourceSubmission = await supabase
        .from('submissions')
        .select('id, wallet_address, status, type, normalized_score, created_at')
        .eq('id', normalizedEvidenceId)
        .maybeSingle();

      if (sourceSubmission.error) {
        console.error('Quest source submission lookup error:', sourceSubmission.error.message);
        return NextResponse.json({ error: 'Failed to look up referenced submission' }, { status: 500 });
      }
      if (!sourceSubmission.data || sourceSubmission.data.wallet_address !== session.walletAddress) {
        return NextResponse.json({ error: 'Referenced submission not found' }, { status: 404 });
      }

      // H-03: evaluate quest rules_json against the referenced submission.
      // Only auto-approve when the submission is approved AND satisfies every
      // declared rule; otherwise fall back to manual review.
      const rulesJson = (questResult.data.rules_json as Record<string, unknown>) || {};
      autoApprove =
        sourceSubmission.data.status === 'approved' &&
        evaluateQuestRules(rulesJson, sourceSubmission.data, questResult.data);
    }

    const insertResult = await supabase
      .from('season_quest_submissions')
      .insert({
        quest_id: questId,
        season_id: season.id,
        wallet_address: session.walletAddress,
        status: autoApprove ? 'approved' : 'submitted',
        evidence_type: parsed.evidence_type,
        evidence_id: normalizedEvidenceId,
        note: parsed.note || null,
        reviewed_at: autoApprove ? nowIso : null,
        reviewed_by: autoApprove ? session.walletAddress : null,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (insertResult.error) {
      // Handle unique constraint violation from idx_unique_season_wallet_evidence
      // which catches race conditions between the check above and this insert.
      if (insertResult.error.code === '23505') {
        return NextResponse.json(
          { error: 'This evidence has already been used for a quest submission.' },
          { status: 409 }
        );
      }
      console.error('Quest submission insert error:', insertResult.error);
      return NextResponse.json({ error: 'Failed to submit quest' }, { status: 500 });
    }

    await trackEngagementEvent(supabase, 'season_quest_submitted', session.walletAddress, {
      season_id: season.id,
      quest_id: questId,
      evidence_type: parsed.evidence_type,
      auto_approved: autoApprove,
    });

    if (autoApprove) {
      const pointsReward = questResult.data.points_reward || 0;
      if (pointsReward > 0) {
        // Atomic: users.total_xp += reward, insert points_ledger entry, insert
        // audit log -- all in one transaction under a per-user row lock.
        const { error: applyError } = await supabase.rpc('apply_points_adjustment_atomic', {
          p_wallet: session.walletAddress,
          p_delta: pointsReward,
          p_entry_type: 'quest_bonus',
          p_submission_id: null,
          p_metadata: {
            reason_code: 'season_quest_approved',
            season_id: season.id,
            quest_id: questId,
            season_quest_submission_id: insertResult.data.id,
          },
          p_audit_action: 'season_quest_auto_approved',
          p_audit_actor: session.walletAddress,
          p_audit_details: {
            season_id: season.id,
            quest_id: questId,
            season_quest_submission_id: insertResult.data.id,
            points_awarded: pointsReward,
            evidence_id: normalizedEvidenceId,
          },
        });

        if (applyError) {
          // Auto-approval already persisted to season_quest_submissions, but
          // the points RPC failed. Roll the submission back to pending review
          // so an admin can re-award manually after investigating.
          console.error(
            'Quest auto-approve points RPC failed; reverting to manual review:',
            applyError.message
          );
          await supabase
            .from('season_quest_submissions')
            .update({
              status: 'submitted',
              reviewed_at: null,
              reviewed_by: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', insertResult.data.id);

          return NextResponse.json(
            {
              success: true,
              season_id: season.id,
              quest_id: questId,
              auto_approved: false,
              submission: { ...insertResult.data, status: 'submitted' },
              note: 'Auto-approval failed; submission queued for manual review.',
            },
            { status: 200 }
          );
        }
      }

      await trackEngagementEvent(supabase, 'season_quest_approved', session.walletAddress, {
        season_id: season.id,
        quest_id: questId,
        points_awarded: pointsReward,
      });
    }

    void createNotification({
      wallet_address: session.walletAddress,
      type: 'quest_completed',
      title: 'Quest Evidence Submitted',
      body: `Your evidence for "${questResult.data.title}" has been submitted for review.`,
    });

    return NextResponse.json({
      success: true,
      season_id: season.id,
      quest_id: questId,
      auto_approved: autoApprove,
      submission: insertResult.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Season quest submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
