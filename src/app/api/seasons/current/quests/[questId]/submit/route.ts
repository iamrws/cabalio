import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';
import { ensureSeasonMemberState, getLiveSeason } from '@/lib/seasons';

export const dynamic = 'force-dynamic';

const questSubmitSchema = z.object({
  evidence_type: z.enum(['submission_id', 'url', 'text', 'none']),
  evidence_id: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

const SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const SUBMIT_WINDOW_MAX = 20;
const questSubmitWindow = new Map<string, { count: number; resetAt: number }>();

function isSubmitRateLimited(walletAddress: string): boolean {
  const now = Date.now();
  const state = questSubmitWindow.get(walletAddress);

  if (!state || now > state.resetAt) {
    questSubmitWindow.set(walletAddress, { count: 1, resetAt: now + SUBMIT_WINDOW_MS });
    return false;
  }

  if (state.count >= SUBMIT_WINDOW_MAX) {
    return true;
  }

  state.count += 1;
  questSubmitWindow.set(walletAddress, state);
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  if (isSubmitRateLimited(session.walletAddress)) {
    return NextResponse.json({ error: 'Too many quest submissions. Try again later.' }, { status: 429 });
  }

  try {
    const { questId } = await params;
    const body = await request.json();
    const parsed = questSubmitSchema.parse(body);

    const supabase = createServerClient();
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
      return NextResponse.json({ error: questResult.error.message }, { status: 500 });
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
      const duplicateEvidence = await supabase
        .from('season_quest_submissions')
        .select('id, quest_id, status')
        .eq('season_id', season.id)
        .eq('wallet_address', session.walletAddress)
        .eq('evidence_type', parsed.evidence_type)
        .eq('evidence_id', normalizedEvidenceId)
        .in('status', ['submitted', 'approved'])
        .limit(1);

      if (duplicateEvidence.error) {
        return NextResponse.json({ error: duplicateEvidence.error.message }, { status: 500 });
      }

      if ((duplicateEvidence.data || []).length > 0) {
        return NextResponse.json(
          { error: 'Duplicate evidence detected for this season submission.' },
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
      return NextResponse.json({ error: existingQuestSubmission.error.message }, { status: 500 });
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
        return NextResponse.json({ error: sourceSubmission.error.message }, { status: 500 });
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
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
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

      await trackEngagementEvent(supabase, 'season_quest_approved', session.walletAddress, {
        season_id: season.id,
        quest_id: questId,
        points_awarded: pointsReward,
      });
    }

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
