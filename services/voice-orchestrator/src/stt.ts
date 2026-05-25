import { createClient, LiveTranscriptionEvents, type LiveClient } from '@deepgram/sdk';
import { config } from './config.js';

export interface SttStream {
  send(audio: Buffer): void;
  finish(): void;
}

// Conexión de STT en streaming con Deepgram (nova-2, español).
// Espera audio mulaw 8kHz (el formato típico del media streaming de Telnyx).
// onFinal se dispara con el texto cuando termina un turno (endpointing ~300ms).
export function openSttStream(handlers: {
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}): SttStream {
  const deepgram = createClient(config.deepgram.apiKey);

  const live: LiveClient = deepgram.listen.live({
    model: 'nova-2',
    language: 'es',
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    interim_results: true,
    endpointing: 300,
    smart_format: true,
  });

  live.on(LiveTranscriptionEvents.Transcript, (data: unknown) => {
    const d = data as {
      is_final?: boolean;
      channel?: { alternatives?: Array<{ transcript?: string }> };
    };
    const text = d.channel?.alternatives?.[0]?.transcript?.trim() ?? '';
    if (!text) return;
    if (d.is_final) handlers.onFinal(text);
    else handlers.onInterim?.(text);
  });

  live.on(LiveTranscriptionEvents.Error, (err: unknown) => {
    console.error('[stt] deepgram error', err);
  });

  return {
    send(audio: Buffer) {
      // Deepgram espera ArrayBuffer/Blob, no Buffer de Node.
      live.send(new Uint8Array(audio).buffer);
    },
    finish() {
      live.requestClose();
    },
  };
}
