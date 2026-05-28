import { config } from './config.js';

const API = 'https://api.telnyx.com/v2';

async function tx(path: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.telnyx.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Telnyx ${path} -> ${res.status} ${text}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

// Inicia una llamada saliente con AMD (detección de buzón) y media streaming hacia nuestro WS.
// El bucle de audio NO arranca hasta call.answered por un humano; si AMD detecta máquina, colgamos.
export async function dial(opts: {
  toNumber: string;
  clientState: string; // se devuelve en cada webhook para correlacionar
  streamUrl: string; // WSS de este servicio que recibe el audio
}): Promise<{ callControlId: string }> {
  const data = await tx('/calls', 'POST', {
    connection_id: config.telnyx.connectionId,
    to: opts.toNumber,
    from: config.telnyx.fromNumber,
    answering_machine_detection: 'detect',
    stream_url: opts.streamUrl,
    stream_track: 'both_tracks',
    client_state: Buffer.from(opts.clientState).toString('base64'),
  });
  const call = (data.data ?? {}) as Record<string, unknown>;
  return { callControlId: String(call.call_control_id ?? '') };
}

export async function hangup(callControlId: string): Promise<void> {
  await tx(`/calls/${callControlId}/actions/hangup`, 'POST', {});
}

export function decodeClientState(encoded: string | undefined): string {
  if (!encoded) return '';
  try {
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return '';
  }
}
