import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, verifyAdminStatus, validateCsrfOrigin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = ['new', 'triaged', 'in_progress', 'done', 'wont_do'] as const;
type FeedbackStatus = (typeof ALLOWED_STATUSES)[number];
const ALLOWED_STATUSES_SET = new Set<string>(ALLOWED_STATUSES);

async function requireAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const isAdmin = await verifyAdminStatus(session.walletAddress);
  if (!isAdmin) {
    const supabase = createServerClient();
    supabase
      .from('audit_logs')
      .insert({
        action: 'admin_access_denied',
        actor_wallet: session.walletAddress,
        target_wallet: session.walletAddress,
        details: { endpoint: '/api/admin/feature-requests', reason: 'not_admin' },
        created_at: new Date().toISOString(),
      })
      .then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if ('error' in guard) return guard.error;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status') || 'new';
  if (statusParam !== 'all' && !ALLOWED_STATUSES_SET.has(statusParam)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const supabase = createServerClient();
  let query = supabase
    .from('feature_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusParam !== 'all') {
    query = query.eq('status', statusParam);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Admin feature-requests query error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }

  return NextResponse.json({ items: data || [], total: count ?? 0 });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  admin_notes: z.string().max(4000).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const guard = await requireAdmin(request);
  if ('error' in guard) return guard.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status satisfies FeedbackStatus;
  if (parsed.data.admin_notes !== undefined) updates.admin_notes = parsed.data.admin_notes;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('feature_requests')
    .update(updates)
    .eq('id', parsed.data.id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Admin feature-requests update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}
