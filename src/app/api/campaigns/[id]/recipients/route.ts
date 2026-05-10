import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';
import { RecipientSelectionSchema } from '@/lib/campaigns/schemas';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign } = await supabaseServer
    .from('email_campaigns')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', dbUserId)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'La campaña ya fue enviada' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RecipientSelectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Reemplazar lista completa
  await supabaseServer.from('email_campaign_recipients').delete().eq('campaign_id', id);

  const rows = parsed.data.recipients.map(r => ({
    campaign_id: id,
    email: r.email,
    contact_id: r.contactId ?? null,
    variables: r.variables ?? {},
    status: 'pending',
  }));

  const { error: insertError } = await supabaseServer
    .from('email_campaign_recipients')
    .insert(rows);

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await supabaseServer
    .from('email_campaigns')
    .update({ recipient_count: rows.length, updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true, count: rows.length });
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign } = await supabaseServer
    .from('email_campaigns')
    .select('id')
    .eq('id', id)
    .eq('user_id', dbUserId)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data } = await supabaseServer
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ data: data ?? [] });
}
