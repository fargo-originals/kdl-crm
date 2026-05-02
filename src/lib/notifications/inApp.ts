import { supabaseServer } from '@/lib/supabase-server';
import type { NotificationEvent, NotificationPayload } from './index';

export async function createInAppNotification(
  userId: string,
  type: NotificationEvent,
  payload: NotificationPayload
) {
  await supabaseServer.from('notifications').insert({
    user_id: userId,
    type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    read: false,
  });
}
