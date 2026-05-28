import { sign } from './sign.js';

async function post(url: string, payload: unknown): Promise<unknown> {
  const body = JSON.stringify(payload);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-voice-signature': sign(body) },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CRM ${url} -> ${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
}

// Cliente firmado hacia los endpoints "tool" + persistencia del CRM.
export function makeCrmClient(toolBaseUrl: string) {
  const base = toolBaseUrl.replace(/\/$/, '');
  return {
    bookAppointment: (p: Record<string, unknown>) => post(`${base}/tools/book-appointment`, p),
    escalate: (p: Record<string, unknown>) => post(`${base}/tools/escalate-to-human`, p),
    logOutcome: (p: Record<string, unknown>) => post(`${base}/tools/log-outcome`, p),
    lookupKnowledge: (p: Record<string, unknown>) => post(`${base}/tools/lookup-knowledge`, p),
    persist: (p: Record<string, unknown>) => post(`${base}/calls/persist`, p),
  };
}

export type CrmClient = ReturnType<typeof makeCrmClient>;
