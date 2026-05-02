import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, COOKIE } from '@/lib/auth/jwt';

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

  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
