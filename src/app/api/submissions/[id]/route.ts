import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/submissions/[id] - Get a single submission with scoring details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('submissions')
    .select('*, users(display_name, avatar_url, level)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Get reactions
  const { data: reactions } = await supabase
    .from('reactions')
    .select('type')
    .eq('submission_id', id);

  const reactionCounts = ((reactions || []) as { type: string }[]).reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({
    submission: data,
    reactions: reactionCounts,
  });
}
