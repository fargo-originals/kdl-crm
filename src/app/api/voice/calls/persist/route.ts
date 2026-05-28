import { NextResponse } from 'next/server';
import { verifySignedRequest } from '@/lib/agents/providers/voice';
import { supabaseServer } from '@/lib/supabase-server';
import { triggerOutboundCall, MAX_CALL_ATTEMPTS } from '@/lib/agents/voiceCall';
import { nextValidCallTime } from '@/lib/agents/callHours';

const RETRY_STATUSES = new Set(['no_answer', 'busy', 'voicemail']);
const TERMINAL_STATUSES = ['completed', 'no_answer', 'busy', 'failed', 'voicemail'];

export async function POST(req: Request) {
  const { ok, body } = await verifySignedRequest(req);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const callId = data.callId ? String(data.callId) : '';
  const providerCallId = data.providerCallId ? String(data.providerCallId) : null;
  if (!callId && !providerCallId) {
    return NextResponse.json({ error: 'callId o providerCallId requerido' }, { status: 400 });
  }

  const builder = supabaseServer.from('voice_calls').select('*');
  const { data: call } = await (callId
    ? builder.eq('id', callId)
    : builder.eq('provider_call_id', providerCallId as string)
  ).maybeSingle();

  if (!call) return NextResponse.json({ error: 'Llamada no encontrada' }, { status: 404 });

  // Idempotencia: ya finalizada y mismo providerCallId → no reprocesar (los webhooks reintentan).
  if (TERMINAL_STATUSES.includes(call.status) && providerCallId && call.provider_call_id === providerCallId) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const status = data.status ? String(data.status) : 'completed';
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (providerCallId) update.provider_call_id = providerCallId;
  if (data.startedAt) update.started_at = data.startedAt;
  if (data.endedAt) update.ended_at = data.endedAt;
  if (data.durationSeconds != null) update.duration_seconds = Number(data.durationSeconds);
  if (data.endedReason) update.ended_reason = String(data.endedReason);
  if (data.recordingUrl) update.recording_url = String(data.recordingUrl);
  if (data.transcript) update.transcript = data.transcript;
  if (data.summary) update.summary = String(data.summary);
  if (data.outcome) update.outcome = String(data.outcome);
  if (data.objectionsDetected) update.objections_detected = data.objectionsDetected;
  if (data.sentiment) update.sentiment = String(data.sentiment);
  if (data.cost != null) update.cost = data.cost;

  await supabaseServer.from('voice_calls').update(update).eq('id', call.id);

  if (call.agent_session_id) {
    await supabaseServer
      .from('agent_sessions')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', call.agent_session_id);
  }

  // Actividad en el timeline del lead (type 'call').
  if (call.lead_id) {
    const durationMin =
      data.durationSeconds != null ? Math.round(Number(data.durationSeconds) / 60) : null;
    await supabaseServer.from('activities').insert({
      type: 'call',
      subject: 'Llamada del agente de voz',
      content: data.summary ? String(data.summary) : null,
      direction: 'outbound',
      duration: durationMin,
      outcome: data.outcome ? String(data.outcome) : status,
      lead_id: call.lead_id,
      user_id: call.assigned_to ?? null,
    });
  }

  // Reintento: sin respuesta y quedan intentos → reprogramar en la próxima ventana válida.
  let retryScheduledAt: string | null = null;
  if (RETRY_STATUSES.has(status) && call.lead_id) {
    const { data: lead } = await supabaseServer
      .from('lead_inquiries')
      .select('call_attempts, do_not_call, preferred_time_window, assigned_to')
      .eq('id', call.lead_id)
      .maybeSingle();

    if (lead && !lead.do_not_call && (lead.call_attempts ?? 0) < MAX_CALL_ATTEMPTS) {
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
      retryScheduledAt = nextValidCallTime(timezone, lead.preferred_time_window).toISOString();
      await triggerOutboundCall(call.lead_id, { scheduledAt: retryScheduledAt, skipWindowCheck: true });
    }
  }

  return NextResponse.json({ ok: true, retryScheduledAt });
}
