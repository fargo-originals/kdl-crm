import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { verifyTotp } from '@/lib/auth/totp';
import { NextRequest } from 'next/server';

/**
 * POST /api/auth/2fa/disable
 * Requires current TOTP code or a recovery code to disable 2FA.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

  const { data: user } = await supabaseServer
    .from('users')
    .select('totp_secret, totp_enabled, totp_recovery_codes')
    .eq('id', session.sub)
    .single();

  if (!user?.totp_enabled) {
    return NextResponse.json({ error: '2FA no está activado' }, { status: 400 });
  }

  // Check TOTP code first, then recovery codes
  const validTotp = user.totp_secret && verifyTotp(code, user.totp_secret);
  const recoveryCodes: string[] = Array.isArray(user.totp_recovery_codes) ? user.totp_recovery_codes : [];
  const recoveryIndex = recoveryCodes.indexOf(code.toUpperCase().replace(/\s/g, ''));

  if (!validTotp && recoveryIndex === -1) {
    return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 });
  }

  // If recovery code used, remove it
  const updatedCodes = recoveryIndex !== -1
    ? recoveryCodes.filter((_, i) => i !== recoveryIndex)
    : recoveryCodes;

  await supabaseServer
    .from('users')
    .update({
      totp_enabled: false,
      totp_secret: null,
      totp_recovery_codes: updatedCodes,
    })
    .eq('id', session.sub);

  return NextResponse.json({ ok: true });
}
