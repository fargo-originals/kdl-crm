import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { enrollInCadence } from '@/lib/cadences/engine';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: cadenceId } = await params;

  // Verify ownership
  const { data: cadence } = await supabaseServer
    .from('sales_cadences')
    .select('id')
    .eq('id', cadenceId)
    .eq('owner_id', session.sub)
    .single();

  if (!cadence) return NextResponse.json({ error: 'Cadencia no encontrada' }, { status: 404 });

  const body = await req.json();
  const { lead_id, contact_id, variables } = body;

  if (!lead_id && !contact_id) {
    return NextResponse.json({ error: 'Se requiere lead_id o contact_id' }, { status: 400 });
  }

  const result = await enrollInCadence(cadenceId, lead_id ?? null, contact_id ?? null, variables ?? {});

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, enrollmentId: result.enrollmentId }, { status: 201 });
}
