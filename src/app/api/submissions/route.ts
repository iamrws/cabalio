import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getISOWeekNumber } from '@/lib/scoring';
import { getSessionFromRequest } from '@/lib/auth';
import {
  MAX_SUBMISSIONS_PER_DAY,
  MIN_ART_DESCRIPTION_LENGTH,
  MIN_BLOG_WORDS,
  MIN_TEXT_LENGTH,
} from '@/lib/constants';

export const dynamic = 'force-dynamic';

const submissionSchema = z.object({
  type: z.enum(['x_post', 'blog', 'art']),
  url: z.string().url().optional(),
  title: z.string().min(1).max(200),
  content_text: z.string().min(MIN_TEXT_LENGTH),
  image_path: z.string().optional(),
});

const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_SUBMISSIONS_PER_WINDOW = 20;
const ipSubmissionWindow = new Map<string, { count: number; resetAt: number }>();

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
    return hostname === 'x.com' || hostname.endsWith('.x.com') || hostname === 'twitter.com' || hostname.endsWith('.twitter.com');
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

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const existing = ipSubmissionWindow.get(ip);

  if (!existing || now > existing.resetAt) {
    ipSubmissionWindow.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return false;
  }

  if (existing.count >= IP_MAX_SUBMISSIONS_PER_WINDOW) {
    return true;
  }

  existing.count += 1;
  ipSubmissionWindow.set(ip, existing);
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
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

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
    query = query.eq('status', status);
  }
  if (week) {
    query = query.eq('week_number', parseInt(week, 10));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

// POST /api/submissions - create new submission for review pipeline.
export async function POST(request: NextRequest) {
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
    const requestIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (isIpRateLimited(requestIp)) {
      return NextResponse.json(
        { error: 'Too many submissions from this IP. Try again later.' },
        { status: 429 }
      );
    }

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

    if (normalizedUrl) {
      const duplicateCheck = await supabase
        .from('submissions')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('url', normalizedUrl)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .limit(1);

      if ((duplicateCheck.data || []).length > 0) {
        return NextResponse.json(
          { error: 'Duplicate submission detected for this URL in the last 7 days' },
          { status: 409 }
        );
      }
    } else {
      const duplicateTextCheck = await supabase
        .from('submissions')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('title', parsed.title.trim())
        .eq('content_text', parsed.content_text.trim())
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .limit(1);

      if ((duplicateTextCheck.data || []).length > 0) {
        return NextResponse.json(
          { error: 'Duplicate submission detected in the last 7 days' },
          { status: 409 }
        );
      }
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
        points_awarded: 0,
        status: 'submitted',
        week_number: weekNumber,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
