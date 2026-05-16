import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { name, url, events, is_active } = await req.json();
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name.trim();
  if (url !== undefined) patch.url = url;
  if (events !== undefined) patch.events = events;
  if (is_active !== undefined) patch.is_active = is_active;

  const { data, error } = await supabaseServer
    .from('webhooks')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', session.sub)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { error } = await supabaseServer
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('owner_id', session.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
