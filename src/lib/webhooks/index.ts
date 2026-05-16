import { supabaseServer } from '@/lib/supabase-server';
import { createHmac } from 'crypto';

export type WebhookEvent =
  | 'lead.created'
  | 'lead.status_changed'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'appointment.confirmed';

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  owner_id: string;
}

/**
 * Fire all active webhooks subscribed to `event` for `ownerId`.
 * Non-blocking — never throws.
 */
export function fireWebhook(
  event: WebhookEvent,
  ownerId: string,
  payload: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const { data: hooks } = await supabaseServer
        .from('webhooks')
        .select('id, url, events, secret, owner_id')
        .eq('owner_id', ownerId)
        .eq('is_active', true);

      if (!hooks || hooks.length === 0) return;

      const matching = (hooks as WebhookRow[]).filter(h => h.events.includes(event));
      if (matching.length === 0) return;

      const body = JSON.stringify({ event, data: payload, ts: new Date().toISOString() });

      await Promise.all(matching.map(async hook => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-KDL-Event': event,
        };

        // HMAC-SHA256 signature
        if (hook.secret) {
          const sig = createHmac('sha256', hook.secret).update(body).digest('hex');
          headers['X-KDL-Signature'] = `sha256=${sig}`;
        }

        let statusCode = 0;
        try {
          const res = await fetch(hook.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) });
          statusCode = res.status;
        } catch {
          statusCode = 0;
        }

        // Update last_triggered_at and last_status_code
        void supabaseServer
          .from('webhooks')
          .update({ last_triggered_at: new Date().toISOString(), last_status_code: statusCode })
          .eq('id', hook.id);
      }));
    } catch (err) {
      console.error('[webhooks] fireWebhook error:', err);
    }
  })();
}
