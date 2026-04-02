import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, verifyAdminStatus } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
      details: { endpoint: '/api/admin/submissions', reason: 'not_admin' },
      created_at: new Date().toISOString(),
    }).then(undefined, (err: unknown) => console.error('Audit log insert failed:', err));

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'submitted';
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(rawLimit, 100) : 50;
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  // L2: Whitelist allowed status values
  const ALLOWED_STATUSES = ['all', 'submitted', 'queued', 'ai_scored', 'human_review', 'approved', 'flagged', 'rejected'];
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  const supabase = createServerClient();
  let query = supabase
    .from('submissions')
    .select('*, users(display_name, avatar_url, level)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Admin submissions query error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}
