import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

const STATUS_ORDER = ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'] as const;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scoped = session.role === 'seller';

  // All time + last 30 / 90 days
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  const base = scoped
    ? supabaseServer.from('lead_inquiries').select('status, created_at').eq('assigned_to', session.sub)
    : supabaseServer.from('lead_inquiries').select('status, created_at');

  const { data: leads } = await base;
  const all = leads ?? [];

  function countByStatus(subset: typeof all) {
    const counts: Record<string, number> = {};
    for (const s of STATUS_ORDER) counts[s] = 0;
    subset.forEach(l => { if (l.status in counts) counts[l.status]++; });
    return counts;
  }

  const allTime = countByStatus(all);
  const last30 = countByStatus(all.filter(l => new Date(l.created_at) >= d30));
  const last90 = countByStatus(all.filter(l => new Date(l.created_at) >= d90));

  const wonAll = allTime['won'] ?? 0;
  const lostAll = allTime['lost'] ?? 0;
  const conversionRate = wonAll + lostAll > 0 ? Math.round((wonAll / (wonAll + lostAll)) * 100) : 0;

  // Funnel: percentage of total entering each stage vs first stage (new + contacted)
  const total = all.length;
  const funnel = STATUS_ORDER.map(s => ({
    status: s,
    count: allTime[s],
    pct_of_total: total > 0 ? Math.round((allTime[s] / total) * 100) : 0,
  }));

  return NextResponse.json({
    funnel,
    all_time: allTime,
    last_30: last30,
    last_90: last90,
    summary: {
      total,
      conversion_rate: conversionRate,
      won: wonAll,
      lost: lostAll,
    },
  });
}
