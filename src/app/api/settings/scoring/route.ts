import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { rescoreAllLeads } from '@/lib/scoring/engine';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseServer
    .from('scoring_rules')
    .select('*')
    .eq('owner_id', session.sub)
    .order('created_at', { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    name: string;
    object_type?: string;
    field: string;
    operator: string;
    value?: string;
    points: number;
  };

  if (!body.name || !body.field || !body.operator || body.points === undefined) {
    return NextResponse.json({ error: 'name, field, operator y points son requeridos' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('scoring_rules')
    .insert({
      owner_id: session.sub,
      name: body.name,
      object_type: body.object_type ?? 'lead',
      field: body.field,
      operator: body.operator,
      value: body.value ?? null,
      points: body.points,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-score leads asynchronously
  rescoreAllLeads(session.sub).catch(console.error);

  return NextResponse.json(data, { status: 201 });
}
