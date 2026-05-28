import { config } from './config.js';

// Síntesis de voz con Cartesia Sonic en español, salida mulaw 8kHz para encajar con Telnyx.
// Devuelve el audio completo (bytes). Para latencia mínima se puede migrar al endpoint
// WebSocket de Cartesia y emitir chunks; este REST es el punto de partida más simple.
export async function synthesize(text: string): Promise<Buffer> {
  const res = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      'X-API-Key': config.cartesia.apiKey,
      'Cartesia-Version': '2024-11-13',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-2',
      transcript: text,
      voice: { mode: 'id', id: config.cartesia.voiceId },
      language: 'es',
      output_format: {
        container: 'raw',
        encoding: 'pcm_mulaw',
        sample_rate: 8000,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Cartesia TTS -> ${res.status} ${errText}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
