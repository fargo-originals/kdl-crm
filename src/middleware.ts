import { NextResponse, type NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/',
  '/api/public/',
  '/api/webhooks/',
  '/_next/',
  '/favicon.ico',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
