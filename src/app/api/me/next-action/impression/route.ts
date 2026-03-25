import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/db';
import { getSessionFromRequest, validateCsrfOrigin } from '@/lib/auth';
import { trackEngagementEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

const impressionSchema = z.object({
  action_id: z.string().min(1).max(100),
  placement: z.string().min(1).max(120),
});

export async function POST(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = impressionSchema.parse(body);

    const supabase = createServerClient();
    await trackEngagementEvent(supabase, 'next_action_seen', session.walletAddress, {
      action_id: parsed.action_id,
      placement: parsed.placement,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error('Next action impression error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
