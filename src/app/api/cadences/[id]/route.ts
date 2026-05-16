import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('sales_cadences')
    .select(`*, steps:cadence_steps(*)`)
    .eq('id', id)
    .eq('owner_id', session.sub)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  data.steps = (data.steps ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position);

  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ['name', 'description', 'sector', 'is_active'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await supabaseServer
    .from('sales_cadences')
    .update(update)
    .eq('id', id)
    .eq('owner_id', session.sub)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseServer
    .from('sales_cadences')
    .delete()
    .eq('id', id)
    .eq('owner_id', session.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
