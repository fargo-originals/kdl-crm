import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifyToken } from '@/lib/auth/jwt';
import { canAssignRole, isValidRole } from '@/lib/auth/roles';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/',
  '/api/public/',
  '/api/webhooks/',
  '/_next/',
  '/favicon.ico',
];

const ADMIN_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isAdminRole(role: string) {
  return role === 'owner' || role === 'admin';
}

function isUserCreationApi(pathname: string, method: string) {
  return pathname === '/api/users' && method === 'POST';
}

function isAdminOnlyApi(pathname: string, method: string) {
  if (pathname === '/api/users' || pathname.startsWith('/api/users/')) return true;
  if (pathname === '/api/upload' && method === 'POST') return true;
  if (pathname === '/api/integrations/config') return true;
  if (pathname.startsWith('/api/landing/') && ADMIN_METHODS.has(method)) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith('/api/');
  const token = req.cookies.get(COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAdminOnlyApi(pathname, req.method) && !isAdminRole(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isUserCreationApi(pathname, req.method)) {
    const body = await req.clone().json() as { role?: unknown };
    const role = body.role ?? 'seller';

    if (typeof role !== 'string' || !isValidRole(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    if (!canAssignRole(session.role, role)) {
      return NextResponse.json({ error: 'Sin permisos para asignar ese rol' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
