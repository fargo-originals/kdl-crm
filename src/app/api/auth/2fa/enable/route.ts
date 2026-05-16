import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyTotp, generateRecoveryCodes } from '@/lib/auth/totp';
import { NextRequest } from 'next/server';

/**
 * POST /api/auth/2fa/enable
 * Verifies first TOTP code after scanning QR.
 * Enables 2FA and returns recovery codes.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

  // Fetch stored secret
  const { data: user } = await supabaseServer
    .from('users')
    .select('totp_secret, totp_enabled')
    .eq('id', session.sub)
    .single();

  if (!user?.totp_secret) {
    return NextResponse.json({ error: 'Configura el 2FA primero' }, { status: 400 });
  }
  if (user.totp_enabled) {
    return NextResponse.json({ error: '2FA ya está activado' }, { status: 400 });
  }

  const valid = verifyTotp(code, user.totp_secret);
  if (!valid) {
    return NextResponse.json({ error: 'Código incorrecto. Inténtalo de nuevo.' }, { status: 400 });
  }

  const recoveryCodes = generateRecoveryCodes();

  await supabaseServer
    .from('users')
    .update({
      totp_enabled: true,
      totp_recovery_codes: recoveryCodes,
    })
    .eq('id', session.sub);

  return NextResponse.json({ ok: true, recovery_codes: recoveryCodes });
}
