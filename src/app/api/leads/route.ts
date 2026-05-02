import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const channel = req.nextUrl.searchParams.get('channel');
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');

  let query = supabaseServer
    .from('lead_inquiries')
    .select('*, assigned_user:users!assigned_to(first_name, last_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);

  if (status) query = query.eq('status', status);
  if (channel) query = query.eq('preferred_channel', channel);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [], total: count ?? 0 });
}
