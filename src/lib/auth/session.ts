import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { verifyToken, COOKIE, type JWTPayload } from './jwt';

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

type RequireOptions = {
  /** Set to null in route handlers to return null instead of issuing a UI redirect. */
  redirectTo?: string | null;
};

export async function requireSession(options: { redirectTo: null }): Promise<JWTPayload | null>;
export async function requireSession(options?: RequireOptions): Promise<JWTPayload>;
export async function requireSession(options: RequireOptions = {}): Promise<JWTPayload | null> {
  const session = await getSession();
  if (!session) {
    if (options.redirectTo === null) return null;
    redirect(options.redirectTo ?? '/login');
  }
  return session;
}

export async function requireOwner(options: { redirectTo: null }): Promise<JWTPayload | null>;
export async function requireOwner(options?: RequireOptions): Promise<JWTPayload>;
export async function requireOwner(options: RequireOptions = {}): Promise<JWTPayload | null> {
  const session = await requireSession(options as { redirectTo: null });
  if (!session) return null;
  if (session.role !== 'owner') {
    if (options.redirectTo === null) return null;
    redirect(options.redirectTo ?? '/dashboard');
  }
  return session;
}

export async function requireAdmin(options: { redirectTo: null }): Promise<JWTPayload | null>;
export async function requireAdmin(options?: RequireOptions): Promise<JWTPayload>;
export async function requireAdmin(options: RequireOptions = {}): Promise<JWTPayload | null> {
  const session = await requireSession(options as { redirectTo: null });
  if (!session) return null;
  if (session.role !== 'owner' && session.role !== 'admin') {
    if (options.redirectTo === null) return null;
    redirect(options.redirectTo ?? '/dashboard');
  }
  return session;
}
