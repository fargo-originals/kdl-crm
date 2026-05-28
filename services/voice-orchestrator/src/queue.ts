import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';
import { startCall } from './callRunner.js';
import type { StartCallPayload } from './types.js';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

export const callQueue = new Queue<StartCallPayload>('outbound-calls', { connection });

// Encola una llamada; si viene scheduledAt, la retrasa hasta esa hora (reintentos/ventanas).
export async function enqueueCall(payload: StartCallPayload): Promise<void> {
  const delay = payload.scheduledAt
    ? Math.max(0, new Date(payload.scheduledAt).getTime() - Date.now())
    : 0;
  await callQueue.add('call', payload, {
    delay,
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: 100,
  });
}

export function startWorker(): Worker<StartCallPayload> {
  return new Worker<StartCallPayload>(
    'outbound-calls',
    async (job: Job<StartCallPayload>) => {
      await startCall(job.data);
    },
    { connection, concurrency: config.maxConcurrentCalls },
  );
}
