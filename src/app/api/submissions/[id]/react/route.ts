import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin, verifyAdminStatus } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const REACTION_TYPES = ['fire', 'hundred', 'brain', 'art', 'clap'] as const;
type ReactionType = (typeof REACTION_TYPES)[number];

const reactionSchema = z.object({
  type: z.enum(REACTION_TYPES),
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function emptyCountsMap(): Record<ReactionType, number> {
  return { fire: 0, hundred: 0, brain: 0, art: 0, clap: 0 };
}

async function getReactionCounts(
  supabase: ReturnType<typeof createServerClient>,
  submissionId: string
): Promise<Record<ReactionType, number>> {
  const { data } = await supabase
    .from('reactions')
    .select('type')
    .eq('submission_id', submissionId);

  const counts = emptyCountsMap();
  for (const row of (data || []) as { type: ReactionType }[]) {
    counts[row.type] = (counts[row.type] || 0) + 1;
  }
  return counts;
}

// POST /api/submissions/[id]/react - Toggle a reaction on a submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid submission ID format' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid reaction type', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { type } = parsed.data;
  const supabase = createServerClient();

  // M-03: verify submission AND enforce the same visibility gate as GET
  // /api/submissions/[id]. Only approved submissions, or own/admin-visible
  // ones, can be reacted to. Otherwise 404 (not 403) to avoid leaking
  // existence of rejected/private submissions.
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, wallet_address, status')
    .eq('id', id)
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const isOwner = submission.wallet_address === session.walletAddress;
  const isAdminUser = await verifyAdminStatus(session.walletAddress, session);
  if (submission.status !== 'approved' && !isOwner && !isAdminUser) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('submission_id', id)
    .eq('wallet_address', session.walletAddress)
    .eq('type', type)
    .maybeSingle();

  let toggled: 'on' | 'off';

  if (existing) {
    // Remove existing reaction (toggle off)
    const { error: deleteError } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('Failed to delete reaction:', deleteError);
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
    }
    toggled = 'off';
  } else {
    // Insert new reaction (toggle on)
    const { error: insertError } = await supabase
      .from('reactions')
      .insert({
        submission_id: id,
        wallet_address: session.walletAddress,
        type,
      });

    if (insertError) {
      console.error('Failed to insert reaction:', insertError);
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
    }
    toggled = 'on';
  }

  const counts = await getReactionCounts(supabase, id);

  return NextResponse.json({ toggled, counts });
}

// GET /api/submissions/[id]/react - Get reaction counts (and optionally user reactions)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid submission ID format' }, { status: 400 });
  }

  const supabase = createServerClient();
  const session = await getSessionFromRequest(request);

  // M-03: reject reads of non-approved submissions for non-owner/non-admin.
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, wallet_address, status')
    .eq('id', id)
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (submission.status !== 'approved') {
    if (!session) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    const isOwner = submission.wallet_address === session.walletAddress;
    const isAdminUser = await verifyAdminStatus(session.walletAddress, session);
    if (!isOwner && !isAdminUser) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
  }

  const counts = await getReactionCounts(supabase, id);

  let userReactions: ReactionType[] = [];
  if (session) {
    const { data: userRows } = await supabase
      .from('reactions')
      .select('type')
      .eq('submission_id', id)
      .eq('wallet_address', session.walletAddress);

    userReactions = ((userRows || []) as { type: ReactionType }[]).map((r) => r.type);
  }

  return NextResponse.json({ counts, user_reactions: userReactions });
}
