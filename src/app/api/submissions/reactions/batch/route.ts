import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ReactionType = 'fire' | 'hundred' | 'brain' | 'art' | 'clap';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 50;

function emptyCountsMap(): Record<ReactionType, number> {
  return { fire: 0, hundred: 0, brain: 0, art: 0, clap: 0 };
}

// GET /api/submissions/reactions/batch?ids=id1,id2,...
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ error: 'Missing ids query parameter' }, { status: 400 });
  }

  const ids = idsParam.split(',').filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ reactions: {} });
  }

  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Too many IDs. Maximum is ${MAX_IDS}` },
      { status: 400 }
    );
  }

  for (const id of ids) {
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: `Invalid UUID format: ${id}` },
        { status: 400 }
      );
    }
  }

  const supabase = createServerClient();
  const session = await getSessionFromRequest(request);

  // Batch query: get all reaction counts grouped by submission_id and type
  const { data: countRows, error: countError } = await supabase
    .from('reactions')
    .select('submission_id, type')
    .in('submission_id', ids);

  if (countError) {
    console.error('Failed to fetch batch reaction counts:', countError);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }

  // Build counts map
  const reactions: Record<string, { counts: Record<ReactionType, number>; user_reactions: ReactionType[] }> = {};

  // Initialize all requested IDs with empty data
  for (const id of ids) {
    reactions[id] = { counts: emptyCountsMap(), user_reactions: [] };
  }

  // Aggregate counts from rows
  for (const row of (countRows || []) as { submission_id: string; type: ReactionType }[]) {
    if (reactions[row.submission_id]) {
      reactions[row.submission_id].counts[row.type] =
        (reactions[row.submission_id].counts[row.type] || 0) + 1;
    }
  }

  // If user is authenticated, fetch their reactions in one query
  if (session) {
    const { data: userRows, error: userError } = await supabase
      .from('reactions')
      .select('submission_id, type')
      .in('submission_id', ids)
      .eq('wallet_address', session.walletAddress);

    if (!userError && userRows) {
      for (const row of userRows as { submission_id: string; type: ReactionType }[]) {
        if (reactions[row.submission_id]) {
          reactions[row.submission_id].user_reactions.push(row.type);
        }
      }
    }
  }

  return NextResponse.json({ reactions });
}
