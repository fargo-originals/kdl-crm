import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/** Public endpoint — no auth required. Returns quote data for client-facing page. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('quotes')
    .select(`
      id, number, status, items, subtotal, discount_pct, tax_amount, total, valid_until, notes, created_at,
      company:companies(name, website),
      contact:contacts(first_name, last_name, email),
      owner:users(first_name, last_name, email)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}
