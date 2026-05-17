import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

/** GET /api/appointments — list appointments for current user (optional ?month=YYYY-MM) */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM

  let query = supabaseServer
    .from('appointments')
    .select('id, confirmed_slot, status, notes, lead:lead_inquiries(full_name, email, phone)')
    .eq('assigned_to', session.sub)
    .neq('status', 'cancelled')
    .order('confirmed_slot', { ascending: true });

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1).toISOString();
    const end = new Date(year, mon, 1).toISOString();
    query = query.gte('confirmed_slot', start).lt('confirmed_slot', end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
