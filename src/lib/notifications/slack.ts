import { WebClient } from '@slack/web-api';
import { supabaseServer } from '@/lib/supabase-server';
import type { NotificationPayload } from './index';

export async function sendNotificationSlack(userId: string, payload: NotificationPayload) {
  const { data: integration } = await supabaseServer
    .from('integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('type', 'slack')
    .eq('is_active', true)
    .maybeSingle();

  if (!integration?.access_token) return;

  const client = new WebClient(integration.access_token);

  // Get DM channel with the user
  const { data: user } = await supabaseServer
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (!user?.email) return;

  try {
    const response = await client.conversations.open({ users: user.email });
    const channelId = response.channel?.id;
    if (!channelId) return;

    await client.chat.postMessage({
      channel: channelId,
      text: `*${payload.title}*\n${payload.body}`,
    });
  } catch (err) {
    console.error('Slack notification error:', err);
  }
}
