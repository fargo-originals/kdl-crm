import crypto from 'crypto';

const BASE = 'https://graph.facebook.com/v20.0';
const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID!;
const TOKEN = () => process.env.WHATSAPP_ACCESS_TOKEN!;

export async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch(`${BASE}/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
  return data as { messages: [{ id: string }] };
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: unknown[] = []
) {
  const res = await fetch(`${BASE}/${PHONE_ID()}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp template error: ${JSON.stringify(data)}`);
  return data as { messages: [{ id: string }] };
}

export function verifyWhatsAppWebhook(body: string, signature: string): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export interface WhatsAppInboundMessage {
  from: string;
  text?: string;
  messageId: string;
}

export function parseWhatsAppWebhook(body: unknown): WhatsAppInboundMessage | null {
  try {
    const entry = (body as { entry: unknown[] }).entry?.[0];
    const change = (entry as { changes: unknown[] })?.changes?.[0];
    const value = (change as { value: unknown })?.value as {
      messages?: Array<{ from: string; id: string; text?: { body: string }; type: string }>;
    };
    const msg = value?.messages?.[0];
    if (!msg) return null;
    return {
      from: msg.from,
      text: msg.type === 'text' ? msg.text?.body : undefined,
      messageId: msg.id,
    };
  } catch {
    return null;
  }
}
