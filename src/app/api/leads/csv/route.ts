import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

/** POST /api/leads/csv — create a single lead from CSV import */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { full_name, email, phone, business_name, business_type, message } = await req.json();

  if (!full_name?.trim()) return NextResponse.json({ error: 'full_name required' }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const { data, error } = await supabaseServer
    .from('lead_inquiries')
    .insert({
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      business_name: business_name || null,
      business_type: business_type || null,
      message: message || null,
      status: 'new',
      source: 'import',
      preferred_channel: 'email',
      locale: 'es',
      assigned_to: session.sub,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
