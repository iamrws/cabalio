import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  type: 'submission' | 'points';
  actor_name: string;
  actor_wallet: string;
  title: string;
  description: string;
  points: number;
  created_at: string;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  submission_approved: 'submission approved',
  quest_bonus: 'quest bonus',
};

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createServerClient();

  const [submissionsResult, pointsResult] = await Promise.allSettled([
    supabase
      .from('submissions')
      .select('id, wallet_address, type, title, points_awarded, created_at, users(display_name)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('points_ledger')
      .select('id, wallet_address, entry_type, points_delta, metadata, created_at, users(display_name)')
      .in('entry_type', ['submission_approved', 'quest_bonus'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const items: ActivityItem[] = [];

  if (submissionsResult.status === 'fulfilled' && submissionsResult.value.data) {
    for (const row of submissionsResult.value.data) {
      const user = row.users as unknown as { display_name: string | null } | null;
      const typeLabel = row.type === 'x_post' ? 'X Post' : row.type === 'blog' ? 'Blog' : 'Art';
      items.push({
        id: `sub-${row.id}`,
        type: 'submission',
        actor_name: user?.display_name || `${row.wallet_address.slice(0, 4)}...${row.wallet_address.slice(-4)}`,
        actor_wallet: row.wallet_address,
        title: row.title,
        description: `submitted ${typeLabel}: ${row.title}`,
        points: row.points_awarded || 0,
        created_at: row.created_at,
      });
    }
  }

  if (pointsResult.status === 'fulfilled' && pointsResult.value.data) {
    for (const row of pointsResult.value.data) {
      const user = row.users as unknown as { display_name: string | null } | null;
      const label = ENTRY_TYPE_LABELS[row.entry_type] || row.entry_type;
      const meta = (row.metadata || {}) as Record<string, string>;
      items.push({
        id: `pts-${row.id}`,
        type: 'points',
        actor_name: user?.display_name || `${row.wallet_address.slice(0, 4)}...${row.wallet_address.slice(-4)}`,
        actor_wallet: row.wallet_address,
        title: label,
        description: `earned +${row.points_delta} pts for ${meta.reason || label}`,
        points: row.points_delta,
        created_at: row.created_at,
      });
    }
  }

  // Sort by created_at DESC and take first 25
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const merged = items.slice(0, 25);

  return NextResponse.json(
    { items: merged },
    {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    }
  );
}
