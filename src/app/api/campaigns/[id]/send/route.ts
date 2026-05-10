import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';
import { sendEmail } from '@/lib/agents/providers/email';
import { renderTemplate } from '@/lib/campaigns/templates';
import type { TemplateVars } from '@/lib/campaigns/templates';

type Params = { params: Promise<{ id: string }> };

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 200;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign } = await supabaseServer
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', dbUserId)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'La campaña ya fue enviada' }, { status: 400 });
  }

  const { data: recipients } = await supabaseServer
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', id)
    .eq('status', 'pending');

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ error: 'No hay destinatarios pendientes' }, { status: 400 });
  }

  // Marcar como en envío
  await supabaseServer
    .from('email_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', id);

  let sentCount = 0;
  let failedCount = 0;
  const now = new Date().toISOString();

  // Envío por lotes
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (recipient) => {
        try {
          const vars: TemplateVars = {
            firstName: (recipient.variables as Record<string, string>)?.firstName ?? 'Hola',
            businessName: (recipient.variables as Record<string, string>)?.businessName ?? '',
            neighborhood: (recipient.variables as Record<string, string>)?.neighborhood ?? 'tu zona',
            rating: (recipient.variables as Record<string, string>)?.rating ?? '5.0',
            reviewCount: (recipient.variables as Record<string, string>)?.reviewCount ?? '0',
            websiteUrl: (recipient.variables as Record<string, string>)?.websiteUrl,
            category: (recipient.variables as Record<string, string>)?.category,
            sector: campaign.sector,
          };

          const rendered = renderTemplate(
            campaign.template_type as Parameters<typeof renderTemplate>[0],
            campaign.sector as Parameters<typeof renderTemplate>[1],
            vars,
          );

          await sendEmail(recipient.email, campaign.subject || rendered.subject, rendered.bodyHtml);

          await supabaseServer
            .from('email_campaign_recipients')
            .update({ status: 'sent', sent_at: now, last_activity_at: now })
            .eq('id', recipient.id);

          await supabaseServer
            .from('email_campaign_events')
            .insert({ campaign_id: id, recipient_id: recipient.id, type: 'sent', created_at: now });

          // Crear agent_session para capturar respuestas del prospecto automáticamente
          await supabaseServer
            .from('agent_sessions')
            .insert({
              campaign_recipient_id: recipient.id,
              channel: 'email',
              messages: [{ role: 'assistant', content: rendered.bodyText, ts: now }],
              status: 'active',
              external_contact_id: recipient.email.toLowerCase(),
            });

          sentCount++;
        } catch {
          await supabaseServer
            .from('email_campaign_recipients')
            .update({ status: 'failed', last_activity_at: now })
            .eq('id', recipient.id);
          failedCount++;
        }
      })
    );

    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  const sentAt = new Date().toISOString();
  await supabaseServer
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_count: sentCount,
      sent_at: sentAt,
      updated_at: sentAt,
    })
    .eq('id', id);

  // Log en activities
  await supabaseServer.from('activities').insert({
    type: 'email_campaign_sent',
    subject: `Campaña enviada: ${campaign.name}`,
    content: `${sentCount} emails enviados, ${failedCount} fallidos`,
    user_id: dbUserId,
  });

  return NextResponse.json({ ok: true, sentCount, failedCount });
}
