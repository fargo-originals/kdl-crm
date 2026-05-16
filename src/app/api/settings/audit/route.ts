import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseServer
    .from('audit_logs')
    .select('*, user:users(first_name, last_name, email)')
    .order('changed_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
