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

export async function requireSession(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireOwner(): Promise<JWTPayload> {
  const session = await requireSession();
  if (session.role !== 'owner') redirect('/dashboard');
  return session;
}
