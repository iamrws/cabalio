import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getISOWeekNumber } from '@/lib/scoring';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import {
  MAX_SUBMISSIONS_PER_DAY,
  MIN_ART_DESCRIPTION_LENGTH,
  MIN_BLOG_WORDS,
  MIN_TEXT_LENGTH,
} from '@/lib/constants';

export const dynamic = 'force-dynamic';

const submissionSchema = z.object({
  type: z.enum(['x_post', 'blog', 'art']),
  url: z.string().url().refine(u => u.startsWith('https://'), { message: 'URL must use HTTPS' }).optional(),
  title: z.string().min(1).max(200),
  content_text: z.string().min(MIN_TEXT_LENGTH),
  image_path: z.string().optional(),
  /** Client-generated idempotency token (UUIDv4). Prevents duplicate submissions across retries. */
  idempotency_token: z.string().uuid().optional(),
});

/** Rate limit window duration in seconds. */
const RATE_LIMIT_WINDOW_SECONDS = 3600;
/** Maximum submissions per wallet per window. */
const RATE_LIMIT_MAX_PER_WINDOW = 20;

function getWordCount(content: string): number {
  return content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isAllowedXUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const exactAllowed = ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.x.com', 'mobile.twitter.com'];
    return exactAllowed.includes(hostname);
  } catch {
    return false;
  }
}

function normalizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function isAllowedUploadedImagePath(imagePath: string): boolean {
  return /^uploads\/[a-z0-9_-]+\/[a-z0-9._-]+\.(png|jpg|jpeg|gif|webp)$/i.test(imagePath);
}

/** Compute a SHA-256 content hash for duplicate detection. */
function computeContentHash(title: string, contentText: string, url: string | null): string {
  const payload = JSON.stringify({ title: title.trim().toLowerCase().normalize('NFC'), content_text: contentText.trim().toLowerCase().normalize('NFC'), url: url || '' });
  return createHash('sha256').update(payload).digest('hex');
}

/** Wallet-based rate limiting backed by Supabase, resilient to serverless cold starts. */
async function isWalletRateLimited(
  supabase: ReturnType<typeof createServerClient>,
  walletAddress: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

  // Check rate_limits table for recent submission count
  const { data: rateLimitRow } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('wallet_address', walletAddress)
    .eq('action', 'submission')
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rateLimitRow && rateLimitRow.request_count >= RATE_LIMIT_MAX_PER_WINDOW) {
    return true;
  }

  const nowIso = new Date().toISOString();

  if (rateLimitRow) {
    // Increment counter
    await supabase
      .from('rate_limits')
      .update({ request_count: rateLimitRow.request_count + 1, updated_at: nowIso })
      .eq('wallet_address', walletAddress)
      .eq('action', 'submission')
      .eq('window_start', rateLimitRow.window_start);
  } else {
    // Create new window
    await supabase.from('rate_limits').upsert(
      {
        wallet_address: walletAddress,
        action: 'submission',
        request_count: 1,
        window_start: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'wallet_address,action' }
    );
  }

  return false;
}

function validateSubmissionByType(parsed: z.infer<typeof submissionSchema>) {
  if (parsed.type === 'x_post') {
    if (!parsed.url) {
      return 'Content URL is required for Jito content submissions';
    }
    if (!isAllowedXUrl(parsed.url)) {
      return 'Jito content submissions must point to x.com or twitter.com';
    }
  }

  if (parsed.type === 'blog') {
    if (!parsed.url) {
      return 'Blog URL is required';
    }
    if (getWordCount(parsed.content_text) < MIN_BLOG_WORDS) {
      return `Blog submissions must be at least ${MIN_BLOG_WORDS} words`;
    }
  }

  if (parsed.type === 'art') {
    if (!parsed.image_path) {
      return 'Artwork submissions require an image path';
    }
    if (!isAllowedUploadedImagePath(parsed.image_path)) {
      return 'Artwork submissions must use an image uploaded through this app';
    }
    if (parsed.content_text.trim().length < MIN_ART_DESCRIPTION_LENGTH) {
      return `Artwork descriptions must be at least ${MIN_ART_DESCRIPTION_LENGTH} characters`;
    }
  }

  return null;
}

// GET /api/submissions - list submissions.
// - members can see approved community submissions by default
// - members can request their own queue with ?scope=mine
// - admins can query all and filter by wallet/status
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'community';
  const wallet = searchParams.get('wallet');
  const week = searchParams.get('week');
  const status = searchParams.get('status');
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(rawLimit, 100) : 20;
  const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  const supabase = createServerClient();
  let query = supabase
    .from('submissions')
    .select('*, users(display_name, avatar_url, level)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const isAdmin = session.role === 'admin';

  if (!isAdmin) {
    if (scope === 'mine') {
      query = query.eq('wallet_address', session.walletAddress);
    } else {
      query = query.eq('status', 'approved');
    }

    if (wallet && wallet !== session.walletAddress) {
      return NextResponse.json({ error: 'Forbidden wallet scope' }, { status: 403 });
    }
  } else if (wallet) {
    query = query.eq('wallet_address', wallet);
  }

  if (status) {
    // Whitelist allowed status values to prevent injection
    const allowedStatuses = ['submitted', 'queued', 'ai_scored', 'human_review', 'approved', 'flagged', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }
    query = query.eq('status', status);
  }
  if (week) {
    const weekNum = parseInt(week, 10);
    if (!Number.isFinite(weekNum)) {
      return NextResponse.json({ error: 'Invalid week parameter' }, { status: 400 });
    }
    query = query.eq('week_number', weekNum);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Submissions query error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

// POST /api/submissions - create new submission for review pipeline.
export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!session.isHolder) {
    return NextResponse.json({ error: 'Jito Cabal holder verification required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = submissionSchema.parse(body);
    const validationError = validateSubmissionByType(parsed);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createServerClient();
    const walletAddress = session.walletAddress;
    const normalizedUrl = normalizeUrl(parsed.url);

    // Wallet-based rate limiting (persisted in Supabase, survives cold starts)
    if (await isWalletRateLimited(supabase, walletAddress)) {
      return NextResponse.json(
        { error: 'Too many submissions. Try again later.' },
        { status: 429 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const contentHash = computeContentHash(parsed.title, parsed.content_text, normalizedUrl);

    // Batch the independent duplicate-detection queries concurrently.
    // All four checks have no data dependency on each other, so Promise.all
    // cuts sequential round-trips from ~4x to ~1x network latency.
    const [
      dailyCountResult,
      idempotencyResult,
      urlDupResult,
      contentHashResult,
    ] = await Promise.all([
      supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress)
        .gte('created_at', `${today}T00:00:00Z`),
      parsed.idempotency_token
        ? supabase
            .from('submissions')
            .select('id')
            .eq('idempotency_token', parsed.idempotency_token)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null as { id: string } | null }),
      normalizedUrl
        ? supabase
            .from('submissions')
            .select('id')
            .eq('url', normalizedUrl)
            .limit(1)
        : Promise.resolve({ data: [] as { id: string }[] }),
      supabase
        .from('submissions')
        .select('id')
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle(),
    ]);

    if ((dailyCountResult.count || 0) >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SUBMISSIONS_PER_DAY} submissions per day` },
        { status: 429 }
      );
    }

    // Idempotency token check: if client sent a token, reject if already used
    if (parsed.idempotency_token && idempotencyResult.data) {
      return NextResponse.json(
        { error: 'Duplicate submission (idempotency token already used)' },
        { status: 409 }
      );
    }

    // URL-based permanent duplicate check (not time-limited)
    if (normalizedUrl && (urlDupResult.data || []).length > 0) {
      return NextResponse.json(
        { error: 'This URL has already been submitted' },
        { status: 409 }
      );
    }

    // Content-hash based duplicate detection (SHA-256)
    if (contentHashResult.data) {
      return NextResponse.json(
        { error: 'Duplicate submission detected (matching content)' },
        { status: 409 }
      );
    }

    const weekNumber = getISOWeekNumber(new Date());
    const now = new Date().toISOString();

    await supabase.from('users').upsert(
      {
        wallet_address: walletAddress,
        is_holder: true,
        updated_at: now,
      },
      { onConflict: 'wallet_address' }
    );

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        wallet_address: walletAddress,
        type: parsed.type,
        url: normalizedUrl,
        title: parsed.title.trim(),
        content_text: parsed.content_text.trim(),
        image_path: parsed.image_path || null,
        content_hash: contentHash,
        idempotency_token: parsed.idempotency_token || null,
        points_awarded: 0,
        status: 'submitted',
        week_number: weekNumber,
      })
      .select()
      .single();

    if (error) {
      console.error('Submission insert error:', error);
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    return NextResponse.json({
      submission,
      message: 'Submission received and queued for review',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error('Submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
