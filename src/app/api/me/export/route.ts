import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/*  CSV helper                                                        */
/* ------------------------------------------------------------------ */

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    // Prevent CSV formula injection (CWE-1236)
    const sanitized = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${sanitized.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/*  Database-backed rate limiter (per-wallet, 5 exports / hour)       */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

async function isRateLimited(
  supabase: ReturnType<typeof createServerClient>,
  wallet: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  const { data: rateLimitRow } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('wallet_address', wallet)
    .eq('action', 'data_export')
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rateLimitRow && rateLimitRow.request_count >= RATE_LIMIT_MAX) {
    return true;
  }

  const nowIso = new Date().toISOString();

  if (rateLimitRow) {
    await supabase
      .from('rate_limits')
      .update({ request_count: rateLimitRow.request_count + 1, updated_at: nowIso })
      .eq('wallet_address', wallet)
      .eq('action', 'data_export')
      .eq('window_start', rateLimitRow.window_start);
  } else {
    await supabase.from('rate_limits').upsert(
      {
        wallet_address: wallet,
        action: 'data_export',
        request_count: 1,
        window_start: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'wallet_address,action' }
    );
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Validation                                                        */
/* ------------------------------------------------------------------ */

const ExportQuerySchema = z.object({
  type: z.enum(['submissions', 'points', 'all']),
});

/* ------------------------------------------------------------------ */
/*  GET /api/me/export?type=submissions|points|all                    */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Validate query params
  const typeParam = request.nextUrl.searchParams.get('type');
  const parsed = ExportQuerySchema.safeParse({ type: typeParam });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid type parameter. Must be one of: submissions, points, all' },
      { status: 400 }
    );
  }

  const { type } = parsed.data;

  const supabase = createServerClient();

  // Rate limit (database-backed, survives serverless cold starts)
  if (await isRateLimited(supabase, session.walletAddress)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 5 exports per hour.' },
      { status: 429 }
    );
  }
  const wallet = session.walletAddress;
  const dateStr = new Date().toISOString().slice(0, 10);

  try {
    let csvContent = '';

    if (type === 'submissions' || type === 'all') {
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select('created_at, type, title, url, status, normalized_score, points_awarded')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: false });

      if (subError) {
        console.error('Export submissions query error:', subError);
        return NextResponse.json({ error: 'Failed to export submissions' }, { status: 500 });
      }

      const subHeaders = ['date', 'type', 'title', 'url', 'status', 'score', 'points_awarded'];
      const subRows = (submissions || []).map((s) => [
        s.created_at ? new Date(s.created_at).toISOString() : '',
        s.type || '',
        s.title || '',
        s.url || '',
        s.status || '',
        s.normalized_score != null ? String(s.normalized_score) : '',
        s.points_awarded != null ? String(s.points_awarded) : '0',
      ]);

      csvContent += toCSV(subHeaders, subRows);
    }

    if (type === 'points' || type === 'all') {
      const { data: ledger, error: ledgerError } = await supabase
        .from('points_ledger')
        .select('created_at, entry_type, points_delta, metadata')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: false });

      if (ledgerError) {
        console.error('Export points query error:', ledgerError);
        return NextResponse.json({ error: 'Failed to export points' }, { status: 500 });
      }

      const ptHeaders = ['date', 'entry_type', 'points_delta', 'description'];
      const ptRows = (ledger || []).map((e) => {
        const meta = (e.metadata as Record<string, unknown>) || {};
        const description = (meta.reason as string) || (meta.description as string) || e.entry_type || '';
        return [
          e.created_at ? new Date(e.created_at).toISOString() : '',
          e.entry_type || '',
          e.points_delta != null ? String(e.points_delta) : '0',
          description,
        ];
      });

      if (type === 'all' && csvContent) {
        csvContent += '\n\n--- Points Ledger ---\n';
      }

      csvContent += toCSV(ptHeaders, ptRows);
    }

    const filename = `cabalio-export-${type}-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
