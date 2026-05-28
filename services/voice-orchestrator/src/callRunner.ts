import { CallBrain } from './brain.js';
import { makeCrmClient } from './crm.js';
import { dial, hangup } from './telnyx.js';
import { synthesize } from './tts.js';
import { summarizeCall } from './summarize.js';
import { config } from './config.js';
import { getSession, putSession, removeSession, type CallSession } from './sessions.js';
import type { StartCallPayload } from './types.js';

// Crea la sesión y lanza la marcación. El bucle de audio arranca en handleAnswered (vía webhook).
export async function startCall(payload: StartCallPayload): Promise<void> {
  const crm = makeCrmClient(payload.toolBaseUrl);
  const brain = new CallBrain({
    callId: payload.callId,
    leadId: payload.leadId,
    sessionId: payload.sessionId,
    assignedUserId: payload.assignedUserId,
    systemPrompt: payload.systemPrompt,
    firstLine: payload.firstLine,
    crm,
  });

  const session: CallSession = {
    callId: payload.callId,
    payload,
    brain,
    crm,
    transcript: [],
    speaking: false,
    persisted: false,
  };
  putSession(session);

  const streamUrl = `${config.publicUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/media?callId=${encodeURIComponent(payload.callId)}`;
  try {
    const { callControlId } = await dial({
      toNumber: payload.toNumber,
      clientState: payload.callId,
      streamUrl,
    });
    session.callControlId = callControlId;
  } catch (err) {
    await endCall(payload.callId, 'failed', String(err));
  }
}

// AMD detectó buzón/máquina: colgar antes de gastar STT/LLM/TTS (ahorro de coste).
export async function handleMachine(callId: string): Promise<void> {
  const s = getSession(callId);
  if (!s?.callControlId) return;
  await hangup(s.callControlId).catch(() => undefined);
  await endCall(callId, 'voicemail', 'answering_machine_detected');
}

// Llamada contestada por un humano: arranca el saludo.
export async function handleAnswered(callId: string): Promise<void> {
  const s = getSession(callId);
  if (!s) return;
  s.startedAt = Date.now();
  await speak(s, s.brain.greeting(), { addToHistory: false });
}

// Turno del usuario (texto final de Deepgram) → respuesta del agente.
export async function handleUserUtterance(callId: string, text: string): Promise<void> {
  const s = getSession(callId);
  if (!s) return;
  s.transcript.push({ role: 'user', text, ts: new Date().toISOString() });

  // Cap de duración: corta si se excede el máximo.
  if (s.startedAt && (Date.now() - s.startedAt) / 1000 > s.payload.maxDurationSec) {
    if (s.callControlId) await hangup(s.callControlId).catch(() => undefined);
    return;
  }

  const reply = await s.brain.respondTo(text);
  if (reply) await speak(s, reply);
}

async function speak(s: CallSession, text: string, opts: { addToHistory?: boolean } = {}): Promise<void> {
  s.transcript.push({ role: 'assistant', text, ts: new Date().toISOString() });
  try {
    const audio = await synthesize(text);
    s.speaking = true;
    s.sendAudio?.(audio);
  } catch (err) {
    console.error('[call] TTS error', err);
  } finally {
    s.speaking = false;
  }
}

// Cierre: resumen offline + persistencia en el CRM + limpieza. Idempotente.
export async function endCall(callId: string, status: string, endedReason?: string): Promise<void> {
  const s = getSession(callId);
  if (!s || s.persisted) {
    removeSession(callId);
    return;
  }
  s.persisted = true;
  s.stt?.finish();

  let summary = { summary: '', outcome: null as string | null, objections: [] as string[], sentiment: null as string | null };
  if (status === 'completed' && s.transcript.length > 0) {
    try {
      summary = await summarizeCall(s.transcript);
    } catch (err) {
      console.error('[call] summarize error', err);
    }
  }

  const durationSeconds = s.startedAt ? Math.round((Date.now() - s.startedAt) / 1000) : 0;
  try {
    await s.crm.persist({
      callId,
      providerCallId: s.callControlId ?? null,
      status,
      startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
      endedAt: new Date().toISOString(),
      durationSeconds,
      endedReason: endedReason ?? null,
      transcript: s.transcript,
      summary: summary.summary,
      outcome: summary.outcome,
      objectionsDetected: summary.objections,
      sentiment: summary.sentiment,
    });
  } catch (err) {
    console.error('[call] persist error', err);
  }

  removeSession(callId);
}
