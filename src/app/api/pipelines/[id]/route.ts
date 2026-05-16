import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { name, description, is_default, is_active } = await req.json();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (is_active !== undefined) patch.is_active = is_active;

  if (is_default === true) {
    // Unset previous default
    await supabaseServer.from('pipelines').update({ is_default: false }).eq('is_default', true);
    patch.is_default = true;
  }

  const { data, error } = await supabaseServer.from('pipelines').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Check there is at least one other active pipeline
  const { count } = await supabaseServer
    .from('pipelines')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: 'No puedes eliminar el único pipeline' }, { status: 400 });
  }

  // Soft-delete: set is_active = false
  await supabaseServer.from('pipelines').update({ is_active: false }).eq('id', id);
  return NextResponse.json({ ok: true });
}
