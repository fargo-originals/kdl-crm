import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { calculateScore } from '@/lib/scoring/engine';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('lead_inquiries')
    .select('*, assigned_user:users!assigned_to(first_name, last_name, email)')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const { data: updated, error } = await supabaseServer
    .from('lead_inquiries')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (updated?.contact_id) {
    const contactUpdates: Record<string, unknown> = {};
    if ('phone' in body) contactUpdates.phone = body.phone;
    if ('email' in body) contactUpdates.email = body.email;
    if ('full_name' in body && typeof body.full_name === 'string') {
      const parts = body.full_name.trim().split(/\s+/);
      contactUpdates.first_name = parts[0] ?? '';
      contactUpdates.last_name = parts.slice(1).join(' ') || '';
    }
    if (Object.keys(contactUpdates).length > 0) {
      await supabaseServer
        .from('contacts')
        .update({ ...contactUpdates, updated_at: new Date().toISOString() })
        .eq('id', updated.contact_id);
    }
  }

  // Recalculate score in background (non-blocking)
  const ownerId = updated.assigned_to ?? session.sub;
  calculateScore(updated as Record<string, unknown>, ownerId, 'lead')
    .then(score => supabaseServer.from('lead_inquiries').update({ score }).eq('id', id))
    .catch(console.error);

  return NextResponse.json(updated);
}
