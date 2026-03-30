import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const appealSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must be 500 characters or fewer'),
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid submission ID format' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = appealSchema.parse(body);

    const supabase = createServerClient();

    // Verify submission exists and belongs to the user
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('id, wallet_address, title, status')
      .eq('id', id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.wallet_address !== session.walletAddress) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify submission is rejected or flagged
    if (!['rejected', 'flagged'].includes(submission.status)) {
      return NextResponse.json(
        { error: 'Only rejected or flagged submissions can be appealed' },
        { status: 400 }
      );
    }

    // Check for existing appeal
    const { data: existingAppeal } = await supabase
      .from('submission_appeals')
      .select('id, status')
      .eq('submission_id', id)
      .maybeSingle();

    if (existingAppeal) {
      return NextResponse.json(
        { error: `An appeal already exists for this submission (status: ${existingAppeal.status})` },
        { status: 409 }
      );
    }

    // Insert appeal
    const { data: appeal, error: insertError } = await supabase
      .from('submission_appeals')
      .insert({
        submission_id: id,
        wallet_address: session.walletAddress,
        reason: parsed.reason,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Appeal insert error:', insertError);
      return NextResponse.json({ error: 'Failed to submit appeal' }, { status: 500 });
    }

    void createNotification({
      wallet_address: session.walletAddress,
      type: 'appeal_submitted',
      title: 'Appeal Submitted',
      body: `Your appeal for "${submission.title}" has been submitted for review.`,
    });

    return NextResponse.json({ appeal }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Appeal submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid submission ID format' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify submission exists and check ownership
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, wallet_address')
    .eq('id', id)
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const isOwner = submission.wallet_address === session.walletAddress;
  const isAdmin = session.role === 'admin';

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const { data: appeal, error } = await supabase
    .from('submission_appeals')
    .select('*')
    .eq('submission_id', id)
    .maybeSingle();

  if (error) {
    console.error('Appeal fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch appeal' }, { status: 500 });
  }

  if (!appeal) {
    return NextResponse.json({ error: 'No appeal found for this submission' }, { status: 404 });
  }

  return NextResponse.json({ appeal });
}
