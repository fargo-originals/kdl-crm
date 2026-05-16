import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { generateTotpSecret, getTotpUri, getQrCodeUrl } from '@/lib/auth/totp';
import { NextRequest } from 'next/server';

/**
 * POST /api/auth/2fa/setup
 * Generates a TOTP secret and stores it (unconfirmed) in the DB.
 * Returns the QR code URL and the raw secret for manual entry.
 * The 2FA is NOT yet enabled — the user must call /enable after scanning.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const secret = generateTotpSecret();
  const uri = getTotpUri(session.email, secret);
  const qrUrl = getQrCodeUrl(uri);

  // Store secret temporarily (not yet enabled)
  await supabaseServer
    .from('users')
    .update({ totp_secret: secret, totp_enabled: false })
    .eq('id', session.sub);

  return NextResponse.json({ secret, qr_url: qrUrl });
}
