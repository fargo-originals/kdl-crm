import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseServer
    .from('sales_cadences')
    .select(`*, steps:cadence_steps(*)`)
    .eq('owner_id', session.sub)
    .order('created_at', { ascending: false });

  // Sort steps by position
  const cadences = (data ?? []).map(c => ({
    ...c,
    steps: (c.steps ?? []).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  }));

  return NextResponse.json(cadences);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, description, sector, steps } = body;

  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  // Create cadence
  const { data: cadence, error } = await supabaseServer
    .from('sales_cadences')
    .insert({ owner_id: session.sub, name, description: description ?? null, sector: sector ?? null })
    .select()
    .single();

  if (error || !cadence) return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });

  // Insert steps if provided
  if (Array.isArray(steps) && steps.length > 0) {
    const stepRows = steps.map((s, i) => ({
      cadence_id: cadence.id,
      position: i,
      day_offset: s.day_offset ?? i * 7,
      channel: s.channel ?? 'email',
      template_key: s.template_key ?? null,
      subject: s.subject ?? null,
      message: s.message ?? null,
    }));
    await supabaseServer.from('cadence_steps').insert(stepRows);
  }

  return NextResponse.json(cadence, { status: 201 });
}
