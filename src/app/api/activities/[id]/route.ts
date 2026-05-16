import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  // Only the author or owner/admin can delete
  const { data: act } = await supabaseServer
    .from('activities')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!act) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (act.user_id !== session.sub && session.role === 'seller') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseServer.from('activities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
