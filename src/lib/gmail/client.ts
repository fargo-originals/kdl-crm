import { supabaseServer } from '@/lib/supabase-server';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body: { data?: string }; parts?: { mimeType: string; body: { data?: string } }[] }[];
  };
}

export async function getValidGmailToken(userId: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('type', 'google_gmail')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.access_token) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  if (!expiresAt || expiresAt > new Date(Date.now() + 60_000)) {
    return data.access_token;
  }

  if (!data.refresh_token) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: data.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  const refreshed = await res.json();
  if (!refreshed.access_token) return null;

  await supabaseServer
    .from('integrations')
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('type', 'google_gmail');

  return refreshed.access_token;
}

export async function listGmailMessages(
  token: string,
  options: { maxResults?: number; pageToken?: string; q?: string } = {}
): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    maxResults: String(options.maxResults ?? 50),
    ...(options.pageToken ? { pageToken: options.pageToken } : {}),
    ...(options.q ? { q: options.q } : {}),
  });

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Gmail list error: ${res.status}`);
  const data = await res.json();
  return { messages: data.messages ?? [], nextPageToken: data.nextPageToken };
}

export async function getGmailMessage(token: string, messageId: string): Promise<GmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Gmail get error: ${res.status}`);
  return res.json();
}

export async function sendGmailReply(
  token: string,
  options: { to: string; subject: string; body: string; threadId?: string; inReplyTo?: string }
): Promise<void> {
  const headers = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    ...(options.inReplyTo ? [`In-Reply-To: ${options.inReplyTo}`, `References: ${options.inReplyTo}`] : []),
  ].join('\r\n');

  const raw = btoa(`${headers}\r\n\r\n${options.body}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const body: Record<string, string> = { raw };
  if (options.threadId) body.threadId = options.threadId;

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gmail send error: ${res.status}`);
}

export function parseGmailMessage(msg: GmailMessage): {
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  receivedAt: Date;
} {
  const headers = msg.payload.headers;
  const get = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  const fromRaw = get('From');
  const fromMatch = fromRaw.match(/^(?:"?([^"<]*)"?\s+)?<?([^>]+)>?$/);
  const fromName = fromMatch?.[1]?.trim() ?? '';
  const fromEmail = fromMatch?.[2]?.trim() ?? fromRaw;

  const toRaw = get('To');
  const toEmails = toRaw.split(',').map(e => e.trim()).filter(Boolean);

  const subject = get('Subject');
  const receivedAt = new Date(Number(msg.internalDate));

  let bodyHtml = '';
  let bodyText = '';

  function extractBody(parts: GmailMessage['payload']['parts'] | undefined, body: GmailMessage['payload']['body']): void {
    if (body?.data) {
      bodyText = atob(body.data.replace(/-/g, '+').replace(/_/g, '/'));
      return;
    }
    for (const part of parts ?? []) {
      if (part.mimeType === 'text/html' && part.body.data) {
        bodyHtml = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.mimeType === 'text/plain' && part.body.data) {
        bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (part.parts) {
        extractBody(part.parts, undefined);
      }
    }
  }

  extractBody(msg.payload.parts, msg.payload.body);

  return { fromEmail, fromName, toEmails, subject, bodyHtml, bodyText, receivedAt };
}
