import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

export const WEBHOOK_EVENTS = [
  'lead.created',
  'lead.status_changed',
  'deal.stage_changed',
  'deal.won',
  'quote.accepted',
  'quote.rejected',
  'appointment.confirmed',
] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseServer
    .from('webhooks')
    .select('id, name, url, events, is_active, last_triggered_at, last_status_code, created_at')
    .eq('owner_id', session.sub)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, url, events } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  if (!url?.startsWith('http')) return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un evento' }, { status: 400 });
  }

  const secret = randomBytes(24).toString('hex');

  const { data, error } = await supabaseServer
    .from('webhooks')
    .insert({ name: name.trim(), url, events, owner_id: session.sub, secret })
    .select('id, name, url, events, is_active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, secret }, { status: 201 });
}
