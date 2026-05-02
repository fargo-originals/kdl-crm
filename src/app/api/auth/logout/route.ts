import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/auth/jwt';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE);
  return response;
}
