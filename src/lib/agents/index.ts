import { generateText, stepCountIs } from 'ai';
import { getModel } from './providers/ai';
import { sendWhatsAppTemplate, sendWhatsAppMessage } from './providers/whatsapp';
import { sendEmail, buildAgentEmailHtml } from './providers/email';
import { buildQualifierPrompt } from './prompts/qualifier';
import { proposeSlots } from './tools/proposeSlots';
import { saveAnswer } from './tools/saveAnswer';
import { requestHumanHandoff } from './tools/requestHumanHandoff';
import { supabaseServer } from '@/lib/supabase-server';

export async function enqueueAgentRun(leadId: string) {
  // Get lead data
  const { data: lead } = await supabaseServer
    .from('lead_inquiries')
    .select('*, assigned_to')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return;

  const locale = (lead.locale ?? 'es') as 'es' | 'en';
  const channel = lead.preferred_channel ?? 'email';
  const phone = lead.phone;

  // Create agent session
  const { data: session } = await supabaseServer
    .from('agent_sessions')
    .insert({
      lead_id: leadId,
      channel,
      messages: [],
      status: 'active',
      external_contact_id: channel === 'whatsapp' ? phone : lead.email,
    })
    .select('id')
    .single();

  if (!session) return;

  // Update lead with session id
  await supabaseServer
    .from('lead_inquiries')
    .update({ agent_session_id: session.id, status: 'contacted' })
    .eq('id', leadId);

  // Send first outreach
  const templateName = locale === 'es' ? 'lead_first_contact_es' : 'lead_first_contact_en';

  if (channel === 'whatsapp' && phone) {
    try {
      await sendWhatsAppTemplate(phone, templateName, locale === 'es' ? 'es' : 'en');
    } catch (err) {
      console.error('WhatsApp template send failed, falling back to text:', err);
      // Fallback: only possible within 24h window - log and skip
    }
  } else {
    // Email outreach
    const subject = locale === 'es'
      ? `Hola ${lead.full_name}, recibimos tu solicitud`
      : `Hi ${lead.full_name}, we received your request`;
    const body = locale === 'es'
      ? `Hola ${lead.full_name},\n\nGracias por contactar con KentoDevLab. Nos gustaría conocer mejor tus necesidades para ofrecerte la mejor solución.\n\n¿Cuál sería el mejor momento para hablar?`
      : `Hi ${lead.full_name},\n\nThank you for contacting KentoDevLab. We'd love to learn more about your needs.\n\nWhen would be a good time to talk?`;

    await sendEmail(lead.email, subject, buildAgentEmailHtml(body, lead.full_name));

    // Save first agent message to session
    await supabaseServer
      .from('agent_sessions')
      .update({
        messages: [{ role: 'assistant', content: body, ts: new Date().toISOString() }],
        last_provider_message_id: `email-${Date.now()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);
  }
}

export async function runAgent(sessionId: string, userMessage: string) {
  const { data: session } = await supabaseServer
    .from('agent_sessions')
    .select('*, lead_inquiries(*)')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session || session.status === 'closed') return;

  const lead = session.lead_inquiries as {
    id: string; full_name: string; business_name?: string; business_type?: string;
    service_interest?: string; budget_range?: string; message?: string;
    locale?: string; assigned_to?: string; email: string; phone?: string;
  };

  const locale = (lead?.locale ?? 'es') as 'es' | 'en';
  const existingMessages = (session.messages ?? []) as Array<{ role: string; content: string }>;

  const systemPrompt = buildQualifierPrompt(locale, {
    fullName: lead.full_name,
    businessName: lead.business_name,
    businessType: lead.business_type,
    serviceInterest: lead.service_interest,
    budgetRange: lead.budget_range,
    message: lead.message,
  });

  const messages = [
    ...existingMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const result = await generateText({
    model: getModel(),
    system: systemPrompt,
    messages,
    tools: {
      proposeSlots,
      saveAnswer,
      requestHumanHandoff,
    },
    stopWhen: stepCountIs(5),
  });

  const assistantReply = result.text;

  // Persist updated conversation
  const updatedMessages = [
    ...existingMessages,
    { role: 'user', content: userMessage, ts: new Date().toISOString() },
    { role: 'assistant', content: assistantReply, ts: new Date().toISOString() },
  ];

  await supabaseServer
    .from('agent_sessions')
    .update({
      messages: updatedMessages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // Send reply via channel
  const channel = session.channel;
  if (channel === 'whatsapp' && lead.phone) {
    await sendWhatsAppMessage(lead.phone, assistantReply);
  } else {
    await sendEmail(
      lead.email,
      locale === 'es' ? 'Respuesta de KentoDevLab' : 'Reply from KentoDevLab',
      buildAgentEmailHtml(assistantReply, lead.full_name)
    );
  }

  return assistantReply;
}
