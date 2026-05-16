import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyPassword } from '@/lib/auth/password';
import { signToken, COOKIE } from '@/lib/auth/jwt';
import { SignJWT } from 'jose';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-padding!!');

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const { data: user } = await supabaseServer
    .from('users')
    .select('id, email, role, password_hash, active, totp_enabled')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json({ error: 'Account disabled' }, { status: 403 });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // ── 2FA check ──────────────────────────────────────────────────────────────
  if (user.totp_enabled) {
    // Issue a short-lived "pending" token — no cookie yet
    const tempToken = await new SignJWT({ sub: user.id, twoFactor: 'pending' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret());

    return NextResponse.json({ requires_two_factor: true, temp_token: tempToken });
  }

  // ── Normal login ───────────────────────────────────────────────────────────
  const token = await signToken({ sub: user.id, role: user.role, email: user.email });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
