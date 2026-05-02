import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

const TABLE = 'landing_testimonials';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseServer.from(TABLE).select('*').order('position');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { data: last } = await supabaseServer.from(TABLE).select('position').order('position', { ascending: false }).limit(1).maybeSingle();
  const position = (last?.position ?? 0) + 1;

  const { data, error } = await supabaseServer.from(TABLE).insert({ ...body, position, created_by: session.sub }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
