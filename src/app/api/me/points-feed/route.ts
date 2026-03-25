import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { resolvePointReasonDetails, PointReasonCatalogRow } from '@/lib/engagement';

export const dynamic = 'force-dynamic';

function parseLimit(raw: string | null): number {
  const parsed = Number(raw || '20');
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 100);
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = parseLimit(searchParams.get('limit'));

  try {
    let cursorCreatedAt: string | null = null;

    if (cursor) {
      const cursorResult = await supabase
        .from('points_ledger')
        .select('id, created_at')
        .eq('wallet_address', session.walletAddress)
        .eq('id', cursor)
        .maybeSingle();

      if (cursorResult.error) {
        return NextResponse.json({ error: cursorResult.error.message }, { status: 500 });
      }
      cursorCreatedAt = cursorResult.data?.created_at || null;
    }

    let query = supabase
      .from('points_ledger')
      .select('id, entry_type, points_delta, metadata, created_at, submission_id')
      .eq('wallet_address', session.walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursorCreatedAt) {
      query = query.lt('created_at', cursorCreatedAt);
    }

    const entriesResult = await query;
    if (entriesResult.error) {
      return NextResponse.json({ error: entriesResult.error.message }, { status: 500 });
    }

    const entries = entriesResult.data || [];

    const reasonCodes = Array.from(
      new Set(
        entries.map((entry) => {
          const metadata = (entry.metadata || {}) as Record<string, unknown>;
          if (typeof metadata.reason_code === 'string') return metadata.reason_code;
          return entry.entry_type;
        })
      )
    );

    const catalogResult = await supabase
      .from('point_reason_catalog')
      .select('reason_code, label, description_template')
      .in('reason_code', reasonCodes);

    if (catalogResult.error) {
      return NextResponse.json({ error: catalogResult.error.message }, { status: 500 });
    }

    const catalogMap = new Map<string, PointReasonCatalogRow>();
    for (const row of catalogResult.data || []) {
      catalogMap.set(row.reason_code, row as PointReasonCatalogRow);
    }

    const items = entries.map((entry) => {
      const metadata = (entry.metadata || {}) as Record<string, unknown>;
      const reason = resolvePointReasonDetails(
        entry.entry_type,
        entry.points_delta || 0,
        metadata,
        catalogMap
      );

      return {
        ledger_id: entry.id,
        created_at: entry.created_at,
        points: entry.points_delta,
        reason_code: reason.reasonCode,
        reason_label: reason.reasonLabel,
        explanation: reason.explanation,
        source_type: entry.submission_id ? 'submission' : 'system',
        source_id: entry.submission_id,
      };
    });

    const nextCursor = items.length === limit ? items[items.length - 1].ledger_id : null;

    return NextResponse.json({
      items,
      next_cursor: nextCursor,
    });
  } catch (error) {
    console.error('Points feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
