import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db';
import { scoreSubmission, getISOWeekNumber } from '@/lib/scoring';
import { calculatePoints, calculateStreak } from '@/lib/points';

export const dynamic = 'force-dynamic';
import { MAX_SUBMISSIONS_PER_DAY, MIN_TEXT_LENGTH } from '@/lib/constants';

const submissionSchema = z.object({
  type: z.enum(['x_post', 'blog', 'art']),
  url: z.string().url().optional(),
  title: z.string().min(1).max(200),
  content_text: z.string().min(MIN_TEXT_LENGTH),
  image_path: z.string().optional(),
});

// GET /api/submissions - List submissions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const week = searchParams.get('week');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('submissions')
    .select('*, users(display_name, avatar_url, level)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (wallet) query = query.eq('wallet_address', wallet);
  if (week) query = query.eq('week_number', parseInt(week));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

// POST /api/submissions - Create a new submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = submissionSchema.parse(body);
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    // Check rate limit
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_address', walletAddress)
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count || 0) >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SUBMISSIONS_PER_DAY} submissions per day` },
        { status: 429 }
      );
    }

    // Get current week number
    const weekNumber = getISOWeekNumber(new Date());

    // Score with AI
    const scoringBreakdown = await scoreSubmission(
      parsed.content_text,
      parsed.type
    );

    // Get user streak info
    const { data: userData } = await supabase
      .from('users')
      .select('current_streak, last_submission_date, total_xp')
      .eq('wallet_address', walletAddress)
      .single();

    const user = userData as { current_streak: number; last_submission_date: string | null; total_xp: number } | null;

    const streakInfo = calculateStreak(
      user?.last_submission_date || null,
      user?.current_streak || 0
    );

    // Calculate points
    const points = calculatePoints(
      scoringBreakdown.weighted_total * 10,
      streakInfo.newStreak,
      false // quest bonus checked separately
    );

    // Insert submission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submission, error } = await (supabase.from('submissions') as any)
      .insert({
        wallet_address: walletAddress,
        type: parsed.type,
        url: parsed.url || null,
        title: parsed.title,
        content_text: parsed.content_text,
        image_path: parsed.image_path || null,
        raw_score: scoringBreakdown.weighted_total,
        normalized_score: scoringBreakdown.weighted_total * 10,
        scoring_breakdown: scoringBreakdown,
        points_awarded: points,
        status: 'scored',
        week_number: weekNumber,
        scored_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update user streak and XP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any)
      .update({
        current_streak: streakInfo.newStreak,
        longest_streak: Math.max(streakInfo.newStreak, user?.current_streak || 0),
        last_submission_date: today,
        total_xp: (user?.total_xp || 0) + points,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress);

    return NextResponse.json({ submission, scoring: scoringBreakdown, points });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error('Submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
