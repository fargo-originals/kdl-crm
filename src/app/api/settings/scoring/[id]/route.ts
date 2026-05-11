import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { rescoreAllLeads } from '@/lib/scoring/engine';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ['name', 'field', 'operator', 'value', 'points', 'is_active', 'object_type'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await supabaseServer
    .from('scoring_rules')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', session.sub)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  rescoreAllLeads(session.sub).catch(console.error);

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseServer
    .from('scoring_rules')
    .delete()
    .eq('id', id)
    .eq('owner_id', session.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
