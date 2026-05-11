import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const objectType = req.nextUrl.searchParams.get('object_type');
  let query = supabaseServer
    .from('custom_field_definitions')
    .select('*')
    .order('position', { ascending: true });

  if (objectType) query = query.eq('object_type', objectType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { object_type, name, label, field_type, options = [], is_required = false } = body;

  if (!object_type || !name || !label || !field_type) {
    return NextResponse.json({ error: 'object_type, name, label y field_type son requeridos' }, { status: 400 });
  }

  const { data: last } = await supabaseServer
    .from('custom_field_definitions')
    .select('position')
    .eq('object_type', object_type)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  const { data, error } = await supabaseServer
    .from('custom_field_definitions')
    .insert({ owner_id: session.sub, object_type, name, label, field_type, options, is_required, position })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
