import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scoped = session.role === 'seller';

  const now = new Date();
  const end90 = addDays(now, 90);

  const [stagesRes, dealsRes] = await Promise.all([
    supabaseServer.from('pipeline_stages').select('name, is_won, is_lost'),
    scoped
      ? supabaseServer
          .from('deals')
          .select('stage, value, probability, expected_close_date')
          .eq('owner_id', session.sub)
          .not('expected_close_date', 'is', null)
          .lte('expected_close_date', end90.toISOString())
      : supabaseServer
          .from('deals')
          .select('stage, value, probability, expected_close_date')
          .not('expected_close_date', 'is', null)
          .lte('expected_close_date', end90.toISOString()),
  ]);

  const stages = stagesRes.data ?? [];
  const wonStages = new Set(stages.filter(s => s.is_won).map(s => s.name));
  const lostStages = new Set(stages.filter(s => s.is_lost).map(s => s.name));

  const deals = (dealsRes.data ?? []).filter(d => !lostStages.has(d.stage));

  const end30 = addDays(now, 30);
  const end60 = addDays(now, 60);

  function bucket(cutoff: Date) {
    return deals.filter(d => d.expected_close_date && new Date(d.expected_close_date) <= cutoff);
  }

  function calcBucket(ds: typeof deals) {
    return {
      count: ds.length,
      total_value: ds.reduce((s, d) => s + Number(d.value ?? 0), 0),
      weighted_value: ds.reduce(
        (s, d) => {
          const prob = wonStages.has(d.stage) ? 100 : Number(d.probability ?? 50);
          return s + Number(d.value ?? 0) * (prob / 100);
        },
        0,
      ),
    };
  }

  // Monthly breakdown for the 90-day period
  const monthly: Array<{ month: string; total_value: number; weighted_value: number; count: number }> = [];
  for (let i = 0; i < 3; i++) {
    const start = addDays(now, i * 30);
    const end = addDays(now, (i + 1) * 30);
    const monthDeals = deals.filter(d => {
      const cd = new Date(d.expected_close_date!);
      return cd >= start && cd < end;
    });
    const label = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    monthly.push({ month: label, ...calcBucket(monthDeals) });
  }

  return NextResponse.json({
    next_30: calcBucket(bucket(end30)),
    next_60: calcBucket(bucket(end60)),
    next_90: calcBucket(bucket(end90)),
    monthly,
  });
}
