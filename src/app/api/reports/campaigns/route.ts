import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scoped = session.role === 'seller';

  const query = supabaseServer
    .from('email_campaigns')
    .select('id, name, status, sector, sent_count, opened_count, clicked_count, bounced_count, sent_at, created_at')
    .order('created_at', { ascending: false });

  if (scoped) query.eq('user_id', session.sub);

  const { data: campaigns } = await query;
  const all = campaigns ?? [];

  const enriched = all.map(c => ({
    ...c,
    open_rate: c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0,
    click_rate: c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0,
    bounce_rate: c.sent_count > 0 ? Math.round(((c.bounced_count ?? 0) / c.sent_count) * 100) : 0,
  }));

  const sent = all.filter(c => c.status === 'sent');
  const avgOpenRate =
    sent.length > 0
      ? Math.round(sent.reduce((s, c) => s + (c.sent_count > 0 ? (c.opened_count / c.sent_count) * 100 : 0), 0) / sent.length)
      : 0;
  const avgClickRate =
    sent.length > 0
      ? Math.round(sent.reduce((s, c) => s + (c.sent_count > 0 ? (c.clicked_count / c.sent_count) * 100 : 0), 0) / sent.length)
      : 0;
  const totalSent = sent.reduce((s, c) => s + (c.sent_count ?? 0), 0);

  return NextResponse.json({
    campaigns: enriched,
    summary: {
      total: all.length,
      sent: sent.length,
      total_sent_emails: totalSent,
      avg_open_rate: avgOpenRate,
      avg_click_rate: avgClickRate,
    },
  });
}
