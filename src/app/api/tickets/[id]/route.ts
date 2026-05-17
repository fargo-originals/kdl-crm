import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('tickets')
    .select(`
      *,
      reporter:users!tickets_reporter_id_fkey(id, first_name, last_name),
      assignee:users!tickets_assignee_id_fkey(id, first_name, last_name),
      company:companies(id, name),
      contact:contacts(id, first_name, last_name, email, phone)
    `)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ['title', 'description', 'status', 'priority', 'category', 'resolution', 'assignee_id', 'contact_id', 'company_id'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Set resolved_at when status changes to resolved
  if (body.status === 'resolved' && !body.resolved_at) {
    update.resolved_at = new Date().toISOString();
  } else if (body.status && body.status !== 'resolved') {
    update.resolved_at = null;
  }

  let query = supabaseServer.from('tickets').update(update).eq('id', id);

  if (session.role !== 'owner' && session.role !== 'admin') {
    query = query.or(`assignee_id.eq.${session.sub},reporter_id.eq.${session.sub}`);
  }

  const { data, error } = await query.select(`
    *,
    reporter:users!tickets_reporter_id_fkey(id, first_name, last_name),
    assignee:users!tickets_assignee_id_fkey(id, first_name, last_name),
    company:companies(id, name),
    contact:contacts(id, first_name, last_name, email, phone)
  `).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseServer.from('tickets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
