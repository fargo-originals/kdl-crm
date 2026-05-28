import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8080),
  publicUrl: process.env.PUBLIC_URL ?? '',
  sharedSecret: process.env.VOICE_SHARED_SECRET ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  telnyx: {
    apiKey: process.env.TELNYX_API_KEY ?? '',
    connectionId: process.env.TELNYX_CONNECTION_ID ?? '',
    fromNumber: process.env.VOICE_FROM_NUMBER ?? '',
  },
  deepgram: { apiKey: process.env.DEEPGRAM_API_KEY ?? '' },
  cartesia: {
    apiKey: process.env.CARTESIA_API_KEY ?? '',
    voiceId: process.env.CARTESIA_VOICE_ID ?? '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.VOICE_LLM_MODEL ?? 'gpt-4o-mini',
  },
  maxConcurrentCalls: Number(process.env.VOICE_MAX_CONCURRENT ?? 5),
};
