import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin, verifyAdminStatus } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  appeal_id: z.string().uuid(),
  action: z.enum(['accept', 'deny']),
  response: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isAdmin = await verifyAdminStatus(session.walletAddress);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const status = request.nextUrl.searchParams.get('status') || 'pending';
  const validStatuses = ['pending', 'accepted', 'denied'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    const { data: appeals, error } = await supabase
      .from('submission_appeals')
      .select(`
        *,
        submissions:submission_id (
          id,
          title,
          type,
          url,
          content_text,
          status
        ),
        users:wallet_address (
          display_name,
          wallet_address,
          avatar_url
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Appeals fetch error:', error);
      return NextResponse.json({ error: 'Failed to load appeals' }, { status: 500 });
    }

    return NextResponse.json({ appeals: appeals || [] });
  } catch (error) {
    console.error('Appeals list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isAdmin = await verifyAdminStatus(session.walletAddress);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.parse(body);

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Fetch the appeal
    const { data: appeal, error: appealError } = await supabase
      .from('submission_appeals')
      .select('*, submissions:submission_id (id, title, wallet_address, status)')
      .eq('id', parsed.appeal_id)
      .eq('status', 'pending')
      .single();

    if (appealError || !appeal) {
      return NextResponse.json({ error: 'Appeal not found or already reviewed' }, { status: 404 });
    }

    const submission = appeal.submissions as { id: string; title: string; wallet_address: string; status: string } | null;
    if (!submission) {
      return NextResponse.json({ error: 'Linked submission not found' }, { status: 404 });
    }

    if (parsed.action === 'accept') {
      // Update appeal status
      const { data: updatedAppeal, error: updateError } = await supabase
        .from('submission_appeals')
        .update({
          status: 'accepted',
          admin_response: parsed.response || null,
          reviewed_by: session.walletAddress,
          reviewed_at: now,
        })
        .eq('id', parsed.appeal_id)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError || !updatedAppeal) {
        return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 });
      }

      // Re-enter submission into the moderation queue
      await supabase
        .from('submissions')
        .update({ status: 'submitted' })
        .eq('id', submission.id);

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'appeal_accepted',
        actor_wallet: session.walletAddress,
        target_wallet: appeal.wallet_address,
        details: {
          appeal_id: parsed.appeal_id,
          submission_id: submission.id,
          admin_response: parsed.response || null,
        },
        created_at: now,
      });

      void createNotification({
        wallet_address: appeal.wallet_address,
        type: 'appeal_accepted',
        title: 'Appeal Accepted',
        body: `Your appeal for "${submission.title}" has been accepted. The submission will be re-reviewed.`,
      });

      return NextResponse.json({ appeal: updatedAppeal });
    }

    if (parsed.action === 'deny') {
      const { data: updatedAppeal, error: updateError } = await supabase
        .from('submission_appeals')
        .update({
          status: 'denied',
          admin_response: parsed.response || null,
          reviewed_by: session.walletAddress,
          reviewed_at: now,
        })
        .eq('id', parsed.appeal_id)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError || !updatedAppeal) {
        return NextResponse.json({ error: 'Failed to update appeal' }, { status: 500 });
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'appeal_denied',
        actor_wallet: session.walletAddress,
        target_wallet: appeal.wallet_address,
        details: {
          appeal_id: parsed.appeal_id,
          submission_id: submission.id,
          admin_response: parsed.response || null,
        },
        created_at: now,
      });

      void createNotification({
        wallet_address: appeal.wallet_address,
        type: 'appeal_denied',
        title: 'Appeal Denied',
        body: parsed.response
          ? `Your appeal for "${submission.title}" was not accepted: ${parsed.response}`
          : `Your appeal for "${submission.title}" was not accepted.`,
      });

      return NextResponse.json({ appeal: updatedAppeal });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Appeal review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
