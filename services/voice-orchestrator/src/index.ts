import { config } from './config.js';
import { buildServer } from './server.js';
import { startWorker } from './queue.js';

const server = buildServer();
const worker = startWorker();

server.listen(config.port, () => {
  console.log(`[voice-orchestrator] escuchando en :${config.port}`);
});

async function shutdown() {
  console.log('[voice-orchestrator] cerrando…');
  await worker.close();
  server.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
