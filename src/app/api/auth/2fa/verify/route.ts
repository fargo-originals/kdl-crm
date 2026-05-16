import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyTotp } from '@/lib/auth/totp';
import { signToken, COOKIE } from '@/lib/auth/jwt';
import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-min-32-chars-padding!!');

/**
 * POST /api/auth/2fa/verify
 * Called from the /login/2fa page.
 * Body: { temp_token: string, code: string }
 * On success: sets the session cookie and returns { ok: true }
 */
export async function POST(req: NextRequest) {
  const { temp_token, code } = await req.json();

  if (!temp_token || !code) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Verify temp token (short-lived, twoFactor: 'pending')
  let userId: string;
  try {
    const { payload } = await jwtVerify(temp_token, secret());
    if (payload.twoFactor !== 'pending') throw new Error('invalid');
    userId = payload.sub as string;
  } catch {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
  }

  // Fetch user TOTP info
  const { data: user } = await supabaseServer
    .from('users')
    .select('id, email, role, totp_secret, totp_enabled, totp_recovery_codes, active')
    .eq('id', userId)
    .single();

  if (!user || !user.active) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });
  }

  if (!user.totp_enabled || !user.totp_secret) {
    return NextResponse.json({ error: '2FA no está configurado' }, { status: 400 });
  }

  // Check TOTP code or recovery code
  const normalizedCode = code.toUpperCase().replace(/\s/g, '');
  const validTotp = verifyTotp(code, user.totp_secret);
  const recoveryCodes: string[] = Array.isArray(user.totp_recovery_codes) ? user.totp_recovery_codes : [];
  const recoveryIndex = recoveryCodes.indexOf(normalizedCode);

  if (!validTotp && recoveryIndex === -1) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
  }

  // Consume recovery code if used
  if (recoveryIndex !== -1) {
    await supabaseServer
      .from('users')
      .update({ totp_recovery_codes: recoveryCodes.filter((_, i) => i !== recoveryIndex) })
      .eq('id', userId);
  }

  // Issue full session JWT
  const token = await signToken({ sub: user.id, role: user.role, email: user.email });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
