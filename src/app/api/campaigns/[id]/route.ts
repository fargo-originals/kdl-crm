import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';
import { UpdateCampaignSchema } from '@/lib/campaigns/schemas';

type Params = { params: Promise<{ id: string }> };

async function getCampaign(id: string, userId: string) {
  return supabaseServer
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign, error: dbError } = await getCampaign(id, dbUserId!);
  if (dbError || !campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: recipients } = await supabaseServer
    .from('email_campaign_recipients')
    .select('id, email, status, sent_at, opened_at, clicked_at, variables, contact_id')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ data: { ...campaign, recipients: recipients ?? [] } });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign } = await getCampaign(id, dbUserId!);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'No se puede editar una campaña ya enviada' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateCampaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.sector !== undefined) updates.sector = parsed.data.sector;
  if (parsed.data.tono !== undefined) updates.tono = parsed.data.tono;
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
  if (parsed.data.bodyHtml !== undefined) updates.body_html = parsed.data.bodyHtml;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  const { data, error: dbError } = await supabaseServer
    .from('email_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign } = await getCampaign(id, dbUserId!);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'No se puede eliminar una campaña enviada' }, { status: 400 });
  }

  await supabaseServer.from('email_campaign_recipients').delete().eq('campaign_id', id);
  await supabaseServer.from('email_campaign_events').delete().eq('campaign_id', id);
  const { error: dbError } = await supabaseServer.from('email_campaigns').delete().eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
