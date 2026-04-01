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
        .select('id, wallet_address, status')
        .eq('id', normalizedEvidenceId)
        .maybeSingle();

      if (sourceSubmission.error) {
        console.error('Quest source submission lookup error:', sourceSubmission.error);
        return NextResponse.json({ error: 'Failed to look up referenced submission' }, { status: 500 });
      }
      if (!sourceSubmission.data || sourceSubmission.data.wallet_address !== session.walletAddress) {
        return NextResponse.json({ error: 'Referenced submission not found' }, { status: 404 });
      }

      autoApprove = sourceSubmission.data.status === 'approved';
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
      await supabase.from('points_ledger').insert({
        wallet_address: session.walletAddress,
        entry_type: 'quest_bonus',
        points_delta: pointsReward,
        metadata: {
          reason_code: 'season_quest_approved',
          season_id: season.id,
          quest_id: questId,
          season_quest_submission_id: insertResult.data.id,
        },
        created_at: nowIso,
      });

      if (pointsReward > 0) {
        // Update user's total_xp to reflect quest bonus
        const { data: currentUser } = await supabase
          .from('users')
          .select('total_xp')
          .eq('wallet_address', session.walletAddress)
          .single();

        if (currentUser) {
          const { data: updatedUser } = await supabase
            .from('users')
            .update({
              total_xp: (currentUser.total_xp || 0) + pointsReward,
              updated_at: new Date().toISOString(),
            })
            .eq('wallet_address', session.walletAddress)
            .eq('total_xp', currentUser.total_xp || 0) // Optimistic lock
            .select('total_xp')
            .maybeSingle();

          // Retry once on concurrent modification
          if (!updatedUser) {
            const { data: freshUser } = await supabase
              .from('users')
              .select('total_xp')
              .eq('wallet_address', session.walletAddress)
              .single();
            if (freshUser) {
              await supabase
                .from('users')
                .update({
                  total_xp: (freshUser.total_xp || 0) + pointsReward,
                  updated_at: new Date().toISOString(),
                })
                .eq('wallet_address', session.walletAddress)
                .eq('total_xp', freshUser.total_xp || 0);
            }
          }
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
