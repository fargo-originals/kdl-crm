import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseServer
    .from('users')
    .select('totp_enabled')
    .eq('id', session.sub)
    .single();

  return NextResponse.json({ totp_enabled: user?.totp_enabled ?? false });
}
