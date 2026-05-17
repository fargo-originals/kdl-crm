import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { calcTotals } from '@/lib/quotes/types';
import type { QuoteItem } from '@/lib/quotes/types';

const SELECT = `
  id, number, status, subtotal, discount_pct, tax_amount, total, valid_until, created_at,
  deal:deals(name),
  company:companies(name),
  contact:contacts(first_name, last_name)
`;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dealId = searchParams.get('deal_id');

  let query = supabaseServer.from('quotes').select(SELECT).order('created_at', { ascending: false });
  if (session.role === 'seller') query = query.eq('owner_id', session.sub);
  if (dealId) query = query.eq('deal_id', dealId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { deal_id, contact_id, company_id, items = [], discount_pct = 0, valid_until, notes } = body;

  const typedItems = items as QuoteItem[];
  const { subtotal, tax_amount, total } = calcTotals(typedItems, discount_pct);

  // Generate sequential quote number
  const { count } = await supabaseServer.from('quotes').select('id', { count: 'exact', head: true });
  const number = `PRE-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;

  const { data, error } = await supabaseServer
    .from('quotes')
    .insert({
      deal_id: deal_id ?? null,
      contact_id: contact_id ?? null,
      company_id: company_id ?? null,
      owner_id: session.sub,
      number,
      status: 'draft',
      items: typedItems,
      subtotal,
      discount_pct,
      tax_amount,
      total,
      valid_until: valid_until ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
