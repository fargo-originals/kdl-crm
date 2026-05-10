import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data: campaign } = await supabaseServer
    .from('email_campaigns')
    .select('id, name, status, recipient_count, sent_count, opened_count, clicked_count, bounced_count, sent_at')
    .eq('id', id)
    .eq('user_id', dbUserId)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Contar estados en tiempo real desde la tabla de destinatarios
  const { data: counts } = await supabaseServer
    .from('email_campaign_recipients')
    .select('status')
    .eq('campaign_id', id);

  const statusCounts = (counts ?? []).reduce(
    (acc: Record<string, number>, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const total = counts?.length ?? 0;
  const sent = statusCounts['sent'] ?? 0;
  const opened = statusCounts['opened'] ?? 0;
  const clicked = statusCounts['clicked'] ?? 0;
  const bounced = statusCounts['bounced'] ?? 0;

  // Eventos recientes (para timeline)
  const { data: events } = await supabaseServer
    .from('email_campaign_events')
    .select('type, created_at, recipient_id')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    data: {
      campaignId: id,
      name: campaign.name,
      status: campaign.status,
      sentAt: campaign.sent_at,
      totals: { total, sent, opened, clicked, bounced },
      rates: {
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
      },
      events: events ?? [],
    },
  });
}
