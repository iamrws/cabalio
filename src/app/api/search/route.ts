import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const searchSchema = z.object({
  q: z.string().min(2).max(100),
  type: z.enum(['x_post', 'blog', 'art']).optional(),
  sort: z.enum(['recent', 'top']).default('recent'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const parseResult = searchSchema.safeParse({
    q: searchParams.get('q'),
    type: searchParams.get('type') || undefined,
    sort: searchParams.get('sort') || undefined,
    limit: searchParams.get('limit') || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.errors }, { status: 400 });
  }

  const { q, type, sort, limit } = parseResult.data;

  const supabase = createServerClient();

  // Sanitize search query to strip PostgREST operator characters and SQL wildcards
  const sanitized = q.replace(/[%_\\'"]/g, '');
  const pattern = `%${sanitized}%`;

  let query = supabase
    .from('submissions')
    .select('id, type, title, content_text, points_awarded, normalized_score, created_at, wallet_address, users(display_name)', { count: 'exact' })
    .eq('status', 'approved')
    .or(`title.ilike.${pattern},content_text.ilike.${pattern}`);

  if (type) {
    query = query.eq('type', type);
  }

  if (sort === 'top') {
    query = query.order('points_awarded', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.limit(limit);

  const { data, count, error } = await query;

  if (error) {
    console.error('Search query error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  // Truncate content_text to 200 chars for the response
  const results = (data || []).map((row) => ({
    ...row,
    content_text: row.content_text && row.content_text.length > 200
      ? row.content_text.slice(0, 200) + '...'
      : row.content_text,
  }));

  const response = NextResponse.json({
    results,
    total: count || 0,
    query: q,
  });

  response.headers.set('Cache-Control', 'private, max-age=10');
  return response;
}
