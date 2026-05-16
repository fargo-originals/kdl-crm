import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { name, subject, body_html, category, variables, is_shared } = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) patch.name = name.trim();
  if (subject !== undefined) patch.subject = subject;
  if (body_html !== undefined) patch.body_html = body_html;
  if (category !== undefined) patch.category = category;
  if (variables !== undefined) patch.variables = variables;
  if (is_shared !== undefined) patch.is_shared = is_shared;

  const { data, error } = await supabaseServer
    .from('email_templates')
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
    .from('email_templates')
    .delete()
    .eq('id', id)
    .eq('owner_id', session.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
