import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabaseServer
    .from('contacts')
    .select('*, company:companies(id, name)')
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

  const allowed = [
    'first_name', 'last_name', 'email', 'phone', 'job_title', 'department',
    'company_id', 'lifecycle_stage', 'status', 'notes', 'custom_fields', 'lead_score',
  ];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await supabaseServer
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, company:companies(id, name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leadUpdates: Record<string, unknown> = {};
  if ('phone' in updates) leadUpdates.phone = updates.phone;
  if ('email' in updates) leadUpdates.email = updates.email;
  if ('first_name' in updates || 'last_name' in updates) {
    const fn = (updates.first_name as string | undefined) ?? data.first_name ?? '';
    const ln = (updates.last_name as string | undefined) ?? data.last_name ?? '';
    leadUpdates.full_name = `${fn} ${ln}`.trim();
  }
  if (Object.keys(leadUpdates).length > 0) {
    await supabaseServer
      .from('lead_inquiries')
      .update({ ...leadUpdates, updated_at: new Date().toISOString() })
      .eq('contact_id', id);
  }

  return NextResponse.json(data);
}
