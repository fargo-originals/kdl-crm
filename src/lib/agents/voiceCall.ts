import { supabaseServer } from '@/lib/supabase-server';
import { buildVoiceSalesPrompt, buildVoiceFirstLine } from './prompts/voice-sales';
import { buildSalesKnowledge } from './knowledge/salesKnowledge';
import { isWithinCallWindow } from './callHours';
import { startOutboundCall } from './providers/voice';

const MAX_CALL_DURATION_SEC = Number(process.env.VOICE_MAX_CALL_SECONDS ?? 300);
export const MAX_CALL_ATTEMPTS = Number(process.env.VOICE_MAX_ATTEMPTS ?? 3);

export interface TriggerResult {
  ok: boolean;
  callId?: string;
  error?: string;
  status?: number;
}

// Punto único de entrada para lanzar una llamada saliente: valida, crea sesión + registro,
// compone prompt/conocimiento y delega en el orquestador. Lo usan el botón manual y el reintento.
export async function triggerOutboundCall(
  leadId: string,
  opts: { scheduledAt?: string | null; skipWindowCheck?: boolean } = {},
): Promise<TriggerResult> {
  const { data: lead } = await supabaseServer
    .from('lead_inquiries')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: 'Lead no encontrado', status: 404 };
  if (!lead.phone) return { ok: false, error: 'El lead no tiene teléfono', status: 400 };
  if (lead.do_not_call) return { ok: false, error: 'Lead marcado como No Llamar (DNC)', status: 409 };

  let timezone = 'Europe/Madrid';
  if (lead.assigned_to) {
    const { data: avail } = await supabaseServer
      .from('sales_availability')
      .select('timezone')
      .eq('user_id', lead.assigned_to)
      .limit(1)
      .maybeSingle();
    if (avail?.timezone) timezone = avail.timezone;
  }

  // Si la llamada es inmediata (no programada), debe estar dentro de la ventana horaria.
  if (!opts.skipWindowCheck && !opts.scheduledAt && !isWithinCallWindow(timezone, lead.preferred_time_window)) {
    return { ok: false, error: 'Fuera del horario de llamada permitido', status: 409 };
  }

  const { data: agentSession } = await supabaseServer
    .from('agent_sessions')
    .insert({
      lead_id: leadId,
      channel: 'phone',
      messages: [],
      status: 'active',
      external_contact_id: lead.phone,
    })
    .select('id')
    .single();

  const { data: call } = await supabaseServer
    .from('voice_calls')
    .insert({
      lead_id: leadId,
      agent_session_id: agentSession?.id ?? null,
      direction: 'outbound',
      provider: 'telnyx',
      to_number: lead.phone,
      from_number: process.env.VOICE_FROM_NUMBER ?? null,
      status: 'queued',
      assigned_to: lead.assigned_to ?? null,
    })
    .select('id')
    .single();

  if (!call) return { ok: false, error: 'No se pudo crear la llamada', status: 500 };

  const knowledge = await buildSalesKnowledge(lead.locale ?? 'es');
  const leadData = {
    fullName: lead.full_name,
    businessName: lead.business_name,
    businessType: lead.business_type,
    serviceInterest: lead.service_interest,
    budgetRange: lead.budget_range,
    message: lead.message,
    assignedUserId: lead.assigned_to ?? null,
    sessionId: agentSession?.id ?? null,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const result = await startOutboundCall({
    callId: call.id,
    leadId,
    toNumber: lead.phone,
    systemPrompt: buildVoiceSalesPrompt(leadData, knowledge.distilled),
    firstLine: buildVoiceFirstLine(leadData),
    knowledge: knowledge.full,
    assignedUserId: lead.assigned_to ?? null,
    sessionId: agentSession?.id ?? null,
    maxDurationSec: MAX_CALL_DURATION_SEC,
    toolBaseUrl: `${appUrl.replace(/\/$/, '')}/api/voice`,
    scheduledAt: opts.scheduledAt ?? null,
  });

  if (!result.ok) {
    await supabaseServer
      .from('voice_calls')
      .update({ status: 'failed', ended_reason: result.error ?? 'orchestrator_error' })
      .eq('id', call.id);
    return { ok: false, error: result.error, status: 502 };
  }

  await supabaseServer
    .from('lead_inquiries')
    .update({
      status: 'contacted',
      last_call_at: new Date().toISOString(),
      call_attempts: (lead.call_attempts ?? 0) + 1,
      agent_session_id: agentSession?.id,
    })
    .eq('id', leadId);

  return { ok: true, callId: call.id };
}
