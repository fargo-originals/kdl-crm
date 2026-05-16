import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: cadenceId, stepId } = await params;

  // Verify ownership via cadence
  const { data: cadence } = await supabaseServer
    .from('sales_cadences')
    .select('id')
    .eq('id', cadenceId)
    .eq('owner_id', session.sub)
    .single();

  if (!cadence) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const allowed = ['position', 'day_offset', 'channel', 'template_key', 'subject', 'message'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await supabaseServer
    .from('cadence_steps')
    .update(update)
    .eq('id', stepId)
    .eq('cadence_id', cadenceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: cadenceId, stepId } = await params;

  const { data: cadence } = await supabaseServer
    .from('sales_cadences')
    .select('id')
    .eq('id', cadenceId)
    .eq('owner_id', session.sub)
    .single();

  if (!cadence) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabaseServer
    .from('cadence_steps')
    .delete()
    .eq('id', stepId)
    .eq('cadence_id', cadenceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
