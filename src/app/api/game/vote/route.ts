import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { verifyVoteTicket } from '@/lib/game-tickets';

export const dynamic = 'force-dynamic';

const voteSchema = z.object({
  videoId: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/, 'Invalid video ID format'),
  vote: z.enum(['ai', 'human']),
  ticket: z.string().min(10).max(400),
});

async function isVoteRateLimited(supabase: ReturnType<typeof createServerClient>, walletAddress: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('game_votes')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_address', walletAddress)
    .gte('created_at', windowStart);

  return count !== null && count >= 30;
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

  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const supabase = createServerClient();
  if (await isVoteRateLimited(supabase, session.walletAddress)) {
    return NextResponse.json({ error: 'Too many votes. Slow down.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = voteSchema.parse(body);

    const walletAddress = session.walletAddress;

    // M-05: only accept votes for videos served by /api/game/shorts, via a
    // short-lived HMAC-signed ticket bound to (videoId, wallet).
    const ticketCheck = await verifyVoteTicket(parsed.ticket, parsed.videoId, walletAddress);
    if (!ticketCheck.ok) {
      return NextResponse.json(
        { error: 'Invalid or expired vote ticket' },
        { status: 403 }
      );
    }

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

    // Fetch current aggregate consensus for this video using count queries (no rows transferred)
    const { count: aiCount } = await supabase
      .from('game_votes')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', parsed.videoId)
      .eq('vote', 'ai');

    const { count: humanCount } = await supabase
      .from('game_votes')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', parsed.videoId)
      .eq('vote', 'human');

    const totalVotesBefore = (aiCount || 0) + (humanCount || 0);

    // Consensus: what the majority thinks (including the new vote)
    const newAiCount = (aiCount || 0) + (parsed.vote === 'ai' ? 1 : 0);
    const newHumanCount = (humanCount || 0) + (parsed.vote === 'human' ? 1 : 0);
    const totalVotesAfter = newAiCount + newHumanCount;
    const aiPct = totalVotesAfter > 0 ? Math.round((newAiCount / totalVotesAfter) * 100) : 50;

    // N-07: tie breaker. With exactly 50/50 we do NOT award a match bonus to
    // either side; otherwise the 'human' branch got a free win on ties.
    // Need at least 3 prior votes for meaningful consensus; first-movers are
    // treated as matched to avoid punishing early voters.
    let matched: boolean;
    if (totalVotesBefore < 3) {
      matched = true;
    } else if (aiPct === 50) {
      matched = false;
    } else {
      const communityThinks: 'ai' | 'human' = aiPct > 50 ? 'ai' : 'human';
      matched = parsed.vote === communityThinks;
    }

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

    // Update player game state with optimistic lock
    // Try to update existing row first, checking current points haven't changed
    const { data: updatedGameState } = await supabase
      .from('game_player_state')
      .update({
        points: newPoints,
        streak: newStreak,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress)
      .eq('points', currentPoints)  // Optimistic lock
      .select('points')
      .maybeSingle();

    if (!updatedGameState) {
      // Either no row exists (first vote) or concurrent modification
      // Use upsert as fallback — for first vote this creates the row
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
