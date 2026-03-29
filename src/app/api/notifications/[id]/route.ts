import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const patchBodySchema = z.object({
  read: z.literal(true),
});

// PATCH /api/notifications/[id] — mark a single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message);
    return NextResponse.json({ error: messages.join('; ') }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: notification, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('wallet_address', session.walletAddress)
    .select('id, type, title, body, metadata, read, created_at')
    .single();

  if (error || !notification) {
    // Could be not found or not owned by user — both return 404
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  return NextResponse.json({ notification });
}
