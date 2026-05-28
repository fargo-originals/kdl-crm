import type { CallBrain } from './brain.js';
import type { CrmClient } from './crm.js';
import type { SttStream } from './stt.js';
import type { StartCallPayload, TranscriptEntry } from './types.js';

export interface CallSession {
  callId: string;
  payload: StartCallPayload;
  brain: CallBrain;
  crm: CrmClient;
  callControlId?: string;
  startedAt?: number;
  transcript: TranscriptEntry[];
  speaking: boolean;
  persisted: boolean;
  stt?: SttStream;
  sendAudio?: (audio: Buffer) => void; // lo fija el handler WS para empujar audio TTS a Telnyx
}

const sessions = new Map<string, CallSession>();

export function putSession(s: CallSession): void {
  sessions.set(s.callId, s);
}

export function getSession(callId: string): CallSession | undefined {
  return sessions.get(callId);
}

export function removeSession(callId: string): void {
  sessions.delete(callId);
}

export function activeCount(): number {
  return sessions.size;
}
