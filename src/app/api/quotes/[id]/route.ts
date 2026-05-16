import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { calcTotals } from '@/lib/quotes/types';
import type { QuoteItem } from '@/lib/quotes/types';
import { writeAudit } from '@/lib/audit';

const SELECT = `
  *, deal:deals(name), company:companies(name),
  contact:contacts(first_name, last_name, email),
  owner:users(first_name, last_name, email)
`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data, error } = await supabaseServer.from('quotes').select(SELECT).eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { items, discount_pct, status, valid_until, notes, company_id, contact_id, deal_id } = body;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (items !== undefined || discount_pct !== undefined) {
    // Fetch current to recalc
    const { data: cur } = await supabaseServer.from('quotes').select('items, discount_pct').eq('id', id).single();
    const newItems: QuoteItem[] = items ?? cur?.items ?? [];
    const newDiscount: number = discount_pct ?? cur?.discount_pct ?? 0;
    const { subtotal, tax_amount, total } = calcTotals(newItems, newDiscount);
    patch.items = newItems;
    patch.discount_pct = newDiscount;
    patch.subtotal = subtotal;
    patch.tax_amount = tax_amount;
    patch.total = total;
  }
  if (status !== undefined) patch.status = status;
  if (valid_until !== undefined) patch.valid_until = valid_until;
  if (notes !== undefined) patch.notes = notes;
  if (company_id !== undefined) patch.company_id = company_id;
  if (contact_id !== undefined) patch.contact_id = contact_id;
  if (deal_id !== undefined) patch.deal_id = deal_id;

  const { data, error } = await supabaseServer.from('quotes').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAudit({ entityType: 'quote', entityId: id, action: 'update', changedBy: session.sub, newValues: patch });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { error } = await supabaseServer.from('quotes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAudit({ entityType: 'quote', entityId: id, action: 'delete', changedBy: session.sub });
  return NextResponse.json({ ok: true });
}
