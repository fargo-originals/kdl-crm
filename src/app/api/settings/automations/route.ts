import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseServer
    .from('automation_rules')
    .select('*')
    .eq('owner_id', session.sub)
    .order('created_at', { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, trigger_type, trigger_config, action_type, action_config } = body;

  if (!name || !trigger_type || !action_type) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('automation_rules')
    .insert({
      owner_id: session.sub,
      name,
      trigger_type,
      trigger_config: trigger_config ?? {},
      action_type,
      action_config: action_config ?? {},
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
