import { sendNotificationEmail } from './email';
import { sendNotificationSlack } from './slack';
import { createInAppNotification } from './inApp';
import { sendNotificationWhatsApp } from './whatsappOps';
import { supabaseServer } from '@/lib/supabase-server';

export type NotificationEvent =
  | 'lead.received'
  | 'lead.qualified'
  | 'appointment.proposed'
  | 'appointment.confirmed'
  | 'appointment.cancelled';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  leadId?: string;
  appointmentId?: string;
}

export async function notify(userId: string, event: NotificationEvent, payload: NotificationPayload) {
  // Get user preferences + contact info
  const { data: user } = await supabaseServer
    .from('users')
    .select('email, phone, notification_preferences')
    .eq('id', userId)
    .maybeSingle();

  if (!user) return;

  const prefs = (user.notification_preferences as Record<string, boolean>) ?? {};

  const promises: Promise<unknown>[] = [
    createInAppNotification(userId, event, payload),
  ];

  if (prefs.email !== false && user.email) {
    promises.push(sendNotificationEmail(user.email, payload));
  }
  if (prefs.slack !== false) {
    promises.push(sendNotificationSlack(userId, payload));
  }
  if (prefs.whatsapp === true && user.phone) {
    promises.push(sendNotificationWhatsApp(user.phone, payload));
  }

  await Promise.allSettled(promises);
}
