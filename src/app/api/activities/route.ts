import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

const VALID_TYPES = ['note', 'call', 'email', 'meeting', 'whatsapp', 'task'] as const;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('lead_id');
  const contactId = searchParams.get('contact_id');
  const dealId = searchParams.get('deal_id');
  const companyId = searchParams.get('company_id');

  let query = supabaseServer
    .from('activities')
    .select('*, user:users(first_name, last_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (leadId) query = query.eq('lead_id', leadId);
  else if (contactId) query = query.eq('contact_id', contactId);
  else if (dealId) query = query.eq('deal_id', dealId);
  else if (companyId) query = query.eq('company_id', companyId);
  else return NextResponse.json({ error: 'Provide at least one entity filter' }, { status: 400 });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, subject, content, lead_id, contact_id, deal_id, company_id, duration, outcome } = body;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Tipo de actividad inválido' }, { status: 400 });
  }
  if (!subject?.trim()) {
    return NextResponse.json({ error: 'El asunto es obligatorio' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('activities')
    .insert({
      type,
      subject: subject.trim(),
      content: content?.trim() || null,
      lead_id: lead_id ?? null,
      contact_id: contact_id ?? null,
      deal_id: deal_id ?? null,
      company_id: company_id ?? null,
      user_id: session.sub,
      duration: duration ?? null,
      outcome: outcome ?? null,
    })
    .select('*, user:users(first_name, last_name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
