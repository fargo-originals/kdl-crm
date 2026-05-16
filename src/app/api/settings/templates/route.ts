import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseServer
    .from('email_templates')
    .select('*')
    .or(`owner_id.eq.${session.sub},is_shared.eq.true`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, subject, body_html, category, variables, is_shared } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

  const { data, error } = await supabaseServer
    .from('email_templates')
    .insert({
      owner_id: session.sub,
      name: name.trim(),
      subject: subject?.trim() ?? '',
      body_html: body_html ?? '',
      category: category ?? 'general',
      variables: variables ?? [],
      is_shared: is_shared ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
