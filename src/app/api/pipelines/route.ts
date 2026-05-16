import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseServer
    .from('pipelines')
    .select('*, stages:pipeline_stages(id, name, position, color, probability_default, is_won, is_lost)')
    .eq('is_active', true)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If no pipelines exist, auto-create the default one and migrate existing stages
  if (!data || data.length === 0) {
    const { data: def } = await supabaseServer
      .from('pipelines')
      .insert({ name: 'Pipeline Principal', is_default: true, owner_id: session.sub })
      .select()
      .single();

    if (def) {
      // Assign all existing stages (pipeline_id IS NULL) to the default pipeline
      await supabaseServer
        .from('pipeline_stages')
        .update({ pipeline_id: def.id })
        .is('pipeline_id', null);

      // Assign all existing deals to the default pipeline
      await supabaseServer
        .from('deals')
        .update({ pipeline_id: def.id })
        .is('pipeline_id', null);

      const { data: fresh } = await supabaseServer
        .from('pipelines')
        .select('*, stages:pipeline_stages(id, name, position, color, probability_default, is_won, is_lost)')
        .eq('id', def.id)
        .order('created_at');
      return NextResponse.json(fresh ?? []);
    }
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data, error } = await supabaseServer
    .from('pipelines')
    .insert({ name, description: description ?? null, owner_id: session.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create default stages for the new pipeline
  const defaultStages = [
    { name: 'Nuevo', position: 0, color: '#64748b', probability_default: 10, is_won: false, is_lost: false },
    { name: 'Calificado', position: 1, color: '#2563eb', probability_default: 30, is_won: false, is_lost: false },
    { name: 'Propuesta', position: 2, color: '#f59e0b', probability_default: 60, is_won: false, is_lost: false },
    { name: 'Negociación', position: 3, color: '#f97316', probability_default: 80, is_won: false, is_lost: false },
    { name: 'Cerrado Ganado', position: 4, color: '#16a34a', probability_default: 100, is_won: true, is_lost: false },
    { name: 'Cerrado Perdido', position: 5, color: '#dc2626', probability_default: 0, is_won: false, is_lost: true },
  ].map(s => ({ ...s, pipeline_id: data.id }));

  await supabaseServer.from('pipeline_stages').insert(defaultStages);

  return NextResponse.json(data, { status: 201 });
}
