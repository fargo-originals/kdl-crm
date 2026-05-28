import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import { config } from './config.js';
import { startCall } from './callRunner.js';
import type { StartCallPayload } from './types.js';

const url = new URL(config.redisUrl);
const connection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  username: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  maxRetriesPerRequest: null,
  ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
};

export const callQueue = new Queue<StartCallPayload, unknown, string>('outbound-calls', { connection });

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

export function startWorker(): Worker<StartCallPayload, unknown, string> {
  return new Worker<StartCallPayload, unknown, string>(
    'outbound-calls',
    async (job: Job<StartCallPayload, unknown, string>) => {
      await startCall(job.data);
    },
    { connection, concurrency: config.maxConcurrentCalls },
  );
}
