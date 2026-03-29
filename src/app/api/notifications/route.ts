import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const postBodySchema = z.object({
  action: z.literal('mark_all_read'),
});

// GET /api/notifications — list notifications for the authenticated user
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Parse query params
  const readFilter = searchParams.get('read');
  const limitParam = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
  const cursor = searchParams.get('cursor');

  const supabase = createServerClient();

  // Build the main query
  let query = supabase
    .from('notifications')
    .select('id, type, title, body, metadata, read, created_at')
    .eq('wallet_address', session.walletAddress)
    .order('created_at', { ascending: false })
    .limit(limitParam + 1); // Fetch one extra to determine has_more

  // Optional read filter
  if (readFilter === 'true') {
    query = query.eq('read', true);
  } else if (readFilter === 'false') {
    query = query.eq('read', false);
  }

  // Cursor-based pagination: fetch notifications older than the cursor
  if (cursor) {
    // Look up the cursor notification's created_at
    const { data: cursorRow } = await supabase
      .from('notifications')
      .select('created_at')
      .eq('id', cursor)
      .eq('wallet_address', session.walletAddress)
      .single();

    if (cursorRow) {
      query = query.lt('created_at', cursorRow.created_at);
    }
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }

  // Determine has_more from the extra row
  const has_more = (rows?.length || 0) > limitParam;
  const notifications = (rows || []).slice(0, limitParam);

  // Unread count (always for the full set, not filtered)
  const { count: unread_count, error: countError } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_address', session.walletAddress)
    .eq('read', false);

  if (countError) {
    console.error('Notifications unread count error:', countError);
  }

  return NextResponse.json({
    notifications,
    unread_count: unread_count ?? 0,
    has_more,
  });
}

// POST /api/notifications — mark all notifications as read
export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message);
    return NextResponse.json({ error: messages.join('; ') }, { status: 400 });
  }

  const supabase = createServerClient();

  // Count unread first so we can report how many were updated
  const { count: beforeCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_address', session.walletAddress)
    .eq('read', false);

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('wallet_address', session.walletAddress)
    .eq('read', false);

  if (error) {
    console.error('Notifications mark_all_read error:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }

  return NextResponse.json({ updated: beforeCount ?? 0 });
}
