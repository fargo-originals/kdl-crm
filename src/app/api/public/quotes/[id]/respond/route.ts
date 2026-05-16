import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/** Public endpoint — client accepts or rejects a quote. No auth required. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json(); // 'accept' | 'reject'

  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: quote } = await supabaseServer
    .from('quotes')
    .select('status')
    .eq('id', id)
    .single();

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only sent quotes can be responded to
  if (quote.status !== 'sent') {
    return NextResponse.json({ error: 'Este presupuesto no está pendiente de respuesta' }, { status: 400 });
  }

  const newStatus = action === 'accept' ? 'accepted' : 'rejected';

  await supabaseServer
    .from('quotes')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true, status: newStatus });
}
