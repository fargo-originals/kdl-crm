import express, { type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import { verify } from './sign.js';
import { enqueueCall } from './queue.js';
import { openSttStream } from './stt.js';
import { decodeClientState } from './telnyx.js';
import { getSession } from './sessions.js';
import { handleAnswered, handleMachine, handleUserUtterance, endCall } from './callRunner.js';
import type { StartCallPayload } from './types.js';

export function buildServer() {
  const app = express();

  app.get('/healthz', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // POST /calls — firmado por el CRM. Encola/agenda la llamada.
  app.post('/calls', express.text({ type: '*/*' }), async (req: Request, res: Response) => {
    const raw = typeof req.body === 'string' ? req.body : '';
    if (!verify(raw, req.header('x-voice-signature'))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    let payload: StartCallPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: 'Bad JSON' });
    }
    await enqueueCall(payload);
    return res.json({ ok: true });
  });

  // Webhooks de Telnyx Call Control.
  // TODO(live): verificar la firma Ed25519 de Telnyx con su clave pública.
  app.post('/webhooks/telnyx', express.json(), async (req: Request, res: Response) => {
    const event = req.body?.data;
    const type: string = event?.event_type ?? '';
    const callId = decodeClientState(event?.payload?.client_state);
    if (!callId) return res.json({ ok: true });

    switch (type) {
      case 'call.answered':
        await handleAnswered(callId).catch((e) => console.error(e));
        break;
      case 'call.machine.detection.ended': {
        const result = event?.payload?.result;
        if (result === 'machine') await handleMachine(callId).catch((e) => console.error(e));
        break;
      }
      case 'call.hangup':
        await endCall(callId, mapHangupToStatus(event?.payload?.hangup_cause), event?.payload?.hangup_cause).catch(
          (e) => console.error(e),
        );
        break;
      default:
        break;
    }
    return res.json({ ok: true });
  });

  const httpServer = createServer(app);

  // WS de media de Telnyx en /media?callId=...
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    if (url.pathname !== '/media') {
      socket.destroy();
      return;
    }
    const callId = url.searchParams.get('callId') ?? '';
    wss.handleUpgrade(request, socket, head, (ws) => {
      attachMediaStream(ws, callId);
    });
  });

  return httpServer;
}

function attachMediaStream(ws: WebSocket, callId: string) {
  const session = getSession(callId);
  if (!session) {
    ws.close();
    return;
  }

  const stt = openSttStream({
    onFinal: (text) => handleUserUtterance(callId, text).catch((e) => console.error(e)),
  });
  session.stt = stt;

  // Empuja audio TTS a Telnyx en frames mulaw de 20ms (160 bytes).
  session.sendAudio = (audio: Buffer) => {
    const FRAME = 160;
    for (let i = 0; i < audio.length; i += FRAME) {
      const chunk = audio.subarray(i, i + FRAME);
      ws.send(JSON.stringify({ event: 'media', media: { payload: chunk.toString('base64') } }));
    }
  };

  ws.on('message', (raw: Buffer) => {
    let msg: { event?: string; media?: { payload?: string } };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.event === 'media' && msg.media?.payload) {
      stt.send(Buffer.from(msg.media.payload, 'base64'));
    }
  });

  ws.on('close', () => {
    stt.finish();
  });
}

function mapHangupToStatus(cause?: string): string {
  switch (cause) {
    case 'busy':
      return 'busy';
    case 'no_answer':
    case 'timeout':
      return 'no_answer';
    default:
      return 'completed';
  }
}
