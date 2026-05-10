import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Resend envía el header "svix-signature" (o "resend-signature")
// para verificar autenticidad. Si RESEND_WEBHOOK_SECRET está configurado, validamos.
async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // Sin secret, aceptar todo (solo para dev)

  const signature = req.headers.get('svix-signature') ?? req.headers.get('resend-signature');
  if (!signature) return false;

  // Verificación básica HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const msgId = req.headers.get('svix-id') ?? '';
  const timestamp = req.headers.get('svix-timestamp') ?? '';
  const toSign = `${msgId}.${timestamp}.${rawBody}`;
  const sigBytes = Buffer.from(signature.split(',').pop()?.replace('v1,', '') ?? '', 'base64');

  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(toSign));
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const isValid = await verifySignature(req, rawBody);
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = event;
  const email = (data.to as string[] | undefined)?.[0] ?? (data.email_id as string | undefined) ?? '';
  const resendEmailId = data.email_id as string | undefined;

  // Mapeo de eventos de Resend a nuestros status
  const statusMap: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'sent',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'bounced',
  };

  const newStatus = statusMap[type];
  if (!newStatus) return NextResponse.json({ ok: true }); // Evento no relevante

  // Buscar destinatario por email (busca el más reciente en estado anterior)
  const { data: recipients } = await supabaseServer
    .from('email_campaign_recipients')
    .select('id, campaign_id, status')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ ok: true }); // No encontrado — ignorar
  }

  const recipient = recipients[0];
  const now = new Date().toISOString();

  const update: Record<string, unknown> = {
    status: newStatus,
    last_activity_at: now,
  };
  if (type === 'email.opened' || type === 'email.delivered') update.opened_at = now;
  if (type === 'email.clicked') update.clicked_at = now;

  await supabaseServer
    .from('email_campaign_recipients')
    .update(update)
    .eq('id', recipient.id);

  await supabaseServer
    .from('email_campaign_events')
    .insert({
      campaign_id: recipient.campaign_id,
      recipient_id: recipient.id,
      type: newStatus,
      metadata: { resend_email_id: resendEmailId, raw_type: type },
      created_at: now,
    });

  // Actualizar contadores en la campaña
  if (newStatus === 'opened') {
    await supabaseServer.rpc('increment_campaign_opened', { campaign_id: recipient.campaign_id });
  } else if (newStatus === 'clicked') {
    await supabaseServer.rpc('increment_campaign_clicked', { campaign_id: recipient.campaign_id });
  } else if (newStatus === 'bounced') {
    await supabaseServer.rpc('increment_campaign_bounced', { campaign_id: recipient.campaign_id });
  }

  return NextResponse.json({ ok: true });
}
