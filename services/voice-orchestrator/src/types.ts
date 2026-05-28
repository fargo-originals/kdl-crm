// Payload que el CRM envía a POST /calls (debe coincidir con StartCallPayload del CRM).
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

export interface TranscriptEntry {
  role: 'assistant' | 'user';
  text: string;
  ts: string;
}
