import crypto from 'crypto';

const secret = () => process.env.VOICE_SHARED_SECRET ?? '';

// HMAC-SHA256 del cuerpo crudo, hex. Mismo patrón que verifyWhatsAppWebhook.
export function signBody(body: string): string {
  return crypto.createHmac('sha256', secret()).update(body).digest('hex');
}

export function verifyVoiceSignature(rawBody: string, signature: string | null): boolean {
  if (!secret() || !signature) return false;
  const expected = signBody(rawBody);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Lee y verifica la firma de una petición entrante del orquestador.
export async function verifySignedRequest(
  req: Request,
): Promise<{ ok: boolean; body: string }> {
  const body = await req.text();
  const sig = req.headers.get('x-voice-signature');
  return { ok: verifyVoiceSignature(body, sig), body };
}

export interface StartCallPayload {
  callId: string;
  leadId: string | null;
  toNumber: string;
  systemPrompt: string;
  firstLine: string;
  knowledge: string;
  assignedUserId: string | null;
  sessionId: string | null;
  maxDurationSec: number;
  toolBaseUrl: string;
  scheduledAt?: string | null;
}

// Encola/inicia una llamada saliente en el orquestador de voz (servicio persistente en Railway).
export async function startOutboundCall(
  payload: StartCallPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = process.env.VOICE_ORCHESTRATOR_URL;
  if (!url) return { ok: false, error: 'VOICE_ORCHESTRATOR_URL no configurado' };

  const body = JSON.stringify(payload);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voice-signature': signBody(body) },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
