import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ session: null }, { status: 200 });
  }

  return NextResponse.json({ session }, { status: 200 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
