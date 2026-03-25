import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const voteSchema = z.object({
  videoId: z.string().min(1).max(50),
  vote: z.enum(['ai', 'human']),
});

// In-memory rate limiter: max 30 votes per wallet per 10 minutes
const VOTE_WINDOW_MS = 10 * 60 * 1000;
const VOTE_WINDOW_MAX = 30;
const voteRateWindow = new Map<string, { count: number; resetAt: number }>();

function isVoteRateLimited(walletAddress: string): boolean {
  const now = Date.now();
  const state = voteRateWindow.get(walletAddress);

  if (!state || now > state.resetAt) {
    voteRateWindow.set(walletAddress, { count: 1, resetAt: now + VOTE_WINDOW_MS });
    return false;
  }

  if (state.count >= VOTE_WINDOW_MAX) {
    return true;
  }

  state.count += 1;
  return false;
}

/**
 * POST /api/game/vote
 *
 * Records a vote for the AI-or-Not game. Points, streaks, and consensus
 * are all calculated server-side and persisted to Supabase.
 *
 * The `game_votes` table stores every vote. Consensus is derived from
 * the aggregate of all votes for a given videoId.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (isVoteRateLimited(session.walletAddress)) {
    return NextResponse.json({ error: 'Too many votes. Slow down.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = voteSchema.parse(body);

    const supabase = createServerClient();
    const walletAddress = session.walletAddress;

    // Prevent duplicate votes on the same video
    const { data: existingVote } = await supabase
      .from('game_votes')
      .select('id')
      .eq('wallet_address', walletAddress)
      .eq('video_id', parsed.videoId)
      .limit(1)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this video' },
        { status: 409 }
      );
    }

    // Fetch current aggregate consensus for this video
    const { data: aggregateRows } = await supabase
      .from('game_votes')
      .select('vote')
      .eq('video_id', parsed.videoId);

    const votes = aggregateRows || [];
    const aiCount = votes.filter((v) => v.vote === 'ai').length;
    const humanCount = votes.filter((v) => v.vote === 'human').length;
    const totalVotesBefore = aiCount + humanCount;

    // Consensus: what the majority thinks (including the new vote)
    const newAiCount = aiCount + (parsed.vote === 'ai' ? 1 : 0);
    const newHumanCount = humanCount + (parsed.vote === 'human' ? 1 : 0);
    const totalVotesAfter = newAiCount + newHumanCount;
    const aiPct = totalVotesAfter > 0 ? Math.round((newAiCount / totalVotesAfter) * 100) : 50;

    // Determine if vote matches the community majority (need at least 3 prior
    // votes for meaningful consensus; otherwise default to matched)
    const communityThinks = aiPct > 50 ? 'ai' : 'human';
    const matched = totalVotesBefore < 3 ? true : parsed.vote === communityThinks;

    // Fetch the player's current game session state
    const { data: gameState } = await supabase
      .from('game_player_state')
      .select('points, streak')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    const currentStreak = gameState?.streak ?? 0;
    const currentPoints = gameState?.points ?? 0;

    // Points calculation (server-authoritative, no random multiplier for fairness)
    const base = matched ? 10 : 2;
    const streakBonus = matched ? Math.min(currentStreak * 0.5, 5) : 0;
    const earned = Math.round(base + streakBonus);

    const newStreak = matched ? currentStreak + 1 : 0;
    const newPoints = currentPoints + earned;

    // Insert the vote
    const { error: insertError } = await supabase.from('game_votes').insert({
      wallet_address: walletAddress,
      video_id: parsed.videoId,
      vote: parsed.vote,
      points_earned: earned,
      matched_consensus: matched,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      // Handle unique constraint race condition gracefully
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted on this video' },
          { status: 409 }
        );
      }
      console.error('game vote insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
    }

    // Upsert player game state
    const { error: upsertError } = await supabase
      .from('game_player_state')
      .upsert(
        {
          wallet_address: walletAddress,
          points: newPoints,
          streak: newStreak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );

    if (upsertError) {
      console.error('game state upsert error:', upsertError);
      // Vote was recorded; state update is non-critical
    }

    return NextResponse.json({
      success: true,
      vote: parsed.vote,
      aiPct,
      totalVotes: totalVotesAfter,
      matched,
      pointsEarned: earned,
      points: newPoints,
      streak: newStreak,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Game vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
