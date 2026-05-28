import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { companyIds } = await req.json() as { companyIds: string[] };
  if (!Array.isArray(companyIds) || companyIds.length === 0) {
    return NextResponse.json({ error: 'companyIds requerido' }, { status: 400 });
  }

  const { data: companies, error: fetchError } = await supabaseServer
    .from('companies')
    .select('id, name, email, phone, industry, website')
    .in('id', companyIds);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const leads = (companies ?? []).map(c => ({
    full_name: c.name,
    email: c.email ?? `empresa-${c.id.slice(0, 8)}@pendiente.crm`,
    phone: c.phone ?? null,
    business_name: c.name,
    business_type: c.industry ?? null,
    service_interest: null,
    preferred_channel: 'email',
    source: 'manual',
    status: 'new',
    locale: 'es',
    assigned_to: session.sub,
    message: c.email ? null : '[Lead generado desde Empresas · sin email registrado — actualiza el email]',
  }));

  const { data: created, error: insertError } = await supabaseServer
    .from('lead_inquiries')
    .insert(leads)
    .select('id');

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ created: created?.length ?? 0 }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const channel = req.nextUrl.searchParams.get('channel');
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');

  let query = supabaseServer
    .from('lead_inquiries')
    .select('*, assigned_user:users!assigned_to(first_name, last_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);

  if (status) query = query.eq('status', status);
  if (channel) query = query.eq('preferred_channel', channel);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [], total: count ?? 0 });
}
