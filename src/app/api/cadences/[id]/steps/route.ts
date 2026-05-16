import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: cadenceId } = await params;

  // Verify ownership
  const { data: cadence } = await supabaseServer
    .from('sales_cadences')
    .select('id')
    .eq('id', cadenceId)
    .eq('owner_id', session.sub)
    .single();

  if (!cadence) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  // Get current max position
  const { data: existing } = await supabaseServer
    .from('cadence_steps')
    .select('position')
    .eq('cadence_id', cadenceId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabaseServer
    .from('cadence_steps')
    .insert({
      cadence_id: cadenceId,
      position: body.position ?? nextPosition,
      day_offset: body.day_offset ?? 0,
      channel: body.channel ?? 'email',
      template_key: body.template_key ?? null,
      subject: body.subject ?? null,
      message: body.message ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
