import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'submitted';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

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
