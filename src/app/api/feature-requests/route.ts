import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const feedbackSchema = z.object({
  type: z.enum(['feature', 'bug']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
});

/** Rate-limit window and caps — applied per wallet OR per IP hash. */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

/**
 * Only trust X-Forwarded-For when we're explicitly running behind a known
 * reverse proxy (TRUST_PROXY_HEADERS=true). Defaults to 'unknown' so a
 * client cannot forge an IP and evade rate limits. Closes N-15.
 */
function getClientIp(request: NextRequest): string {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') return 'unknown';
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim() || '';
    if (/^[0-9a-fA-F.:]+$/.test(first)) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real && /^[0-9a-fA-F.:]+$/.test(real.trim())) return real.trim();
  return 'unknown';
}

function hashIp(ip: string): string {
  // Salt with the session secret so hashes don't leak raw IPs across redeploys
  // with rotated secrets. Falls back to a static prefix if no secret is present.
  const salt = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'jc_fr_v1';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: 'You must be signed in with your Cabal NFT wallet to submit feedback.' },
      { status: 401 }
    );
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const walletAddress = session.walletAddress;
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  const supabase = createServerClient();

  // Rate limit: 5/hour per wallet (or per IP as a backstop). Two separate
  // count queries instead of raw .or() string interpolation so a wallet
  // containing PostgREST operator chars cannot break out of the filter.
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const [walletCountResult, ipCountResult] = await Promise.all([
    supabase
      .from('feature_requests')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', windowStart)
      .eq('wallet_address', walletAddress),
    ip === 'unknown'
      ? Promise.resolve({ count: 0, error: null })
      : supabase
          .from('feature_requests')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', windowStart)
          .eq('ip_hash', ipHash),
  ]);

  if (walletCountResult.error || ipCountResult.error) {
    console.error(
      'Feature request rate-limit check failed:',
      walletCountResult.error?.message || ipCountResult.error?.message
    );
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  const recentCount = Math.max(walletCountResult.count || 0, ipCountResult.count || 0);
  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    );
  }

  const { data, error } = await supabase
    .from('feature_requests')
    .insert({
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      wallet_address: walletAddress,
      ip_hash: ipHash,
      user_agent: userAgent,
      status: 'new',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Feature request insert error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

/**
 * GET /api/feature-requests — lists feedback items submitted by the current
 * authenticated wallet. Anonymous callers receive an empty list (their prior
 * submissions are unrecoverable without an identifier, by design).
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ items: [] });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('feature_requests')
    .select('id, type, title, description, status, created_at, updated_at, admin_notes')
    .eq('wallet_address', session.walletAddress)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Feature request list error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}
