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
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

/** Rate-limit window and caps — applied per wallet OR per IP hash. */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
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

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);
  const walletAddress = session?.walletAddress ?? null;
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  const supabase = createServerClient();

  // Rate limit: count recent rows matching either the wallet or the IP hash
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const filter = walletAddress
    ? `wallet_address.eq.${walletAddress},ip_hash.eq.${ipHash}`
    : `ip_hash.eq.${ipHash}`;

  const { count: recentCount, error: rateErr } = await supabase
    .from('feature_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', windowStart)
    .or(filter);

  if (rateErr) {
    console.error('Feature request rate-limit check failed:', rateErr);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  if ((recentCount || 0) >= RATE_LIMIT_MAX) {
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
      email: parsed.data.email ?? null,
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
