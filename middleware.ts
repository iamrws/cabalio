import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

const HOLDER_PROTECTED_PREFIXES = [
  '/dashboard',
  '/submit',
  '/leaderboard',
  '/quests',
  '/rewards',
  '/profile',
  '/api/submissions',
  '/api/leaderboard',
];

const ADMIN_PROTECTED_PREFIXES = [
  '/cabal-core',
  '/api/admin',
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function unauthorizedResponse(request: NextRequest, status: number, message: string) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ error: message }, { status });
  }

  const redirectUrl = new URL('/', request.url);
  redirectUrl.searchParams.set('auth', 'required');
  redirectUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

function notFoundResponse(request: NextRequest) {
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse('Not Found', { status: 404 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const holderProtected = matchesPrefix(pathname, HOLDER_PROTECTED_PREFIXES);
  const adminProtected = matchesPrefix(pathname, ADMIN_PROTECTED_PREFIXES);

  if (!holderProtected && !adminProtected) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);
  if (!session) {
    return unauthorizedResponse(request, 401, 'Authentication required');
  }

  if (!session.isHolder) {
    return unauthorizedResponse(request, 403, 'Jito Cabal holder verification required');
  }

  if (adminProtected && session.role !== 'admin') {
    return notFoundResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/submit/:path*',
    '/leaderboard/:path*',
    '/quests/:path*',
    '/rewards/:path*',
    '/profile/:path*',
    '/cabal-core/:path*',
    '/api/submissions/:path*',
    '/api/leaderboard/:path*',
    '/api/admin/:path*',
  ],
};
