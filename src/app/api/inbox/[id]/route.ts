import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('inbox_messages')
    .select(`
      *,
      contact:contacts(id, first_name, last_name, email),
      company:companies(id, name),
      deal:deals(id, name)
    `)
    .eq('id', id)
    .eq('user_id', session.sub)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Mark as read
  if (!data.is_read) {
    await supabaseServer
      .from('inbox_messages')
      .update({ is_read: true })
      .eq('id', id);
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ['is_read', 'contact_id', 'company_id', 'deal_id'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await supabaseServer
    .from('inbox_messages')
    .update(patch)
    .eq('id', id)
    .eq('user_id', session.sub)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
