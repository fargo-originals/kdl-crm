import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import {
  getValidGmailToken,
  listGmailMessages,
  getGmailMessage,
  parseGmailMessage,
} from '@/lib/gmail/client';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getValidGmailToken(session.sub);
  if (!token) {
    return NextResponse.json({ error: 'Gmail no conectado', code: 'not_connected' }, { status: 400 });
  }

  const { messages: ids } = await listGmailMessages(token, { maxResults: 50, q: 'in:inbox' });
  if (!ids.length) return NextResponse.json({ synced: 0 });

  // Fetch existing gmail_ids to avoid re-fetching
  const { data: existing } = await supabaseServer
    .from('inbox_messages')
    .select('gmail_id')
    .eq('user_id', session.sub)
    .in('gmail_id', ids.map(m => m.id));

  const existingIds = new Set((existing ?? []).map(e => e.gmail_id));
  const newIds = ids.filter(m => !existingIds.has(m.id));

  // Fetch and store new messages in batches
  let synced = 0;
  const BATCH = 10;

  for (let i = 0; i < newIds.length; i += BATCH) {
    const batch = newIds.slice(i, i + BATCH);
    const fetched = await Promise.allSettled(batch.map(m => getGmailMessage(token, m.id)));

    const rows = fetched
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getGmailMessage>>> => r.status === 'fulfilled')
      .map(r => {
        const msg = r.value;
        const parsed = parseGmailMessage(msg);
        return {
          user_id: session.sub,
          gmail_id: msg.id,
          thread_id: msg.threadId,
          from_email: parsed.fromEmail,
          from_name: parsed.fromName,
          to_emails: parsed.toEmails,
          subject: parsed.subject,
          snippet: msg.snippet,
          body_html: parsed.bodyHtml,
          body_text: parsed.bodyText,
          is_read: !msg.labelIds?.includes('UNREAD'),
          received_at: parsed.receivedAt.toISOString(),
          labels: msg.labelIds ?? [],
        };
      });

    if (rows.length) {
      await supabaseServer
        .from('inbox_messages')
        .upsert(rows, { onConflict: 'user_id,gmail_id', ignoreDuplicates: true });
      synced += rows.length;
    }
  }

  // Auto-link messages to known contacts by from_email
  await supabaseServer.rpc('link_inbox_to_contacts', { p_user_id: session.sub }).maybeSingle();

  return NextResponse.json({ synced });
}
