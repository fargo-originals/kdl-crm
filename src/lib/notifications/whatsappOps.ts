import { sendWhatsAppMessage } from '@/lib/agents/providers/whatsapp';
import type { NotificationPayload } from './index';

export async function sendNotificationWhatsApp(phone: string, payload: NotificationPayload) {
  try {
    await sendWhatsAppMessage(phone, `${payload.title}\n\n${payload.body}`);
  } catch (err) {
    console.error('WhatsApp ops notification error:', err);
  }
}
