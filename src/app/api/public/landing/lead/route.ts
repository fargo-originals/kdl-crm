import { NextRequest, NextResponse } from 'next/server';
import { LeadInquirySchema } from '@/lib/landing/schemas';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  // CORS
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = process.env.NEXT_PUBLIC_LANDING_URL ?? '';
  if (allowedOrigin && !origin.includes(new URL(allowedOrigin).hostname)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = LeadInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { honeypot, ...data } = parsed.data;
  if (honeypot) return NextResponse.json({ ok: true }); // silently ignore bots

  // Upsert contact
  const contactUpsert = await supabaseServer
    .from('contacts')
    .upsert({
      first_name: data.fullName.split(' ')[0] ?? data.fullName,
      last_name: data.fullName.split(' ').slice(1).join(' ') || '',
      email: data.email.toLowerCase(),
      phone: data.phone,
      source: 'landing_form',
      lifecycle_stage: 'lead',
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select('id')
    .single();

  // Assign to first available seller (round-robin simplified: first owner/seller)
  const { data: sellers } = await supabaseServer
    .from('users')
    .select('id')
    .eq('active', true)
    .order('created_at')
    .limit(1);

  const assignedTo = sellers?.[0]?.id ?? null;

  // Insert lead inquiry
  const { data: lead, error } = await supabaseServer
    .from('lead_inquiries')
    .insert({
      contact_id: contactUpsert.data?.id ?? null,
      full_name: data.fullName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      business_name: data.businessName,
      business_type: data.businessType,
      service_interest: data.serviceInterest,
      budget_range: data.budgetRange,
      message: data.message,
      preferred_channel: data.preferredChannel,
      preferred_time_window: data.preferredTimeWindow,
      locale: data.locale,
      utm: data.utm ?? {},
      source: 'landing_form',
      status: 'new',
      assigned_to: assignedTo,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Lead insert error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Log activity
  await supabaseServer.from('activities').insert({
    type: 'lead_received',
    subject: `Nuevo lead desde la landing: ${data.fullName}`,
    content: data.message ?? '',
    contact_id: contactUpsert.data?.id ?? null,
    user_id: assignedTo,
  });

  return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_LANDING_URL ?? '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
