import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scoped = session.role === 'seller';

  const [stagesRes, dealsRes] = await Promise.all([
    supabaseServer
      .from('pipeline_stages')
      .select('name, color, position, is_won, is_lost')
      .order('position'),
    scoped
      ? supabaseServer
          .from('deals')
          .select('stage, value, probability, expected_close_date, created_at')
          .eq('owner_id', session.sub)
      : supabaseServer
          .from('deals')
          .select('stage, value, probability, expected_close_date, created_at, owner:users(first_name, last_name)'),
  ]);

  const stages = stagesRes.data ?? [];
  const deals = dealsRes.data ?? [];

  // Group deals by stage
  const byStage = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage.name);
    const totalValue = stageDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
    const weightedValue = stageDeals.reduce(
      (s, d) => s + Number(d.value ?? 0) * (Number(d.probability ?? 50) / 100),
      0,
    );
    return {
      stage: stage.name,
      color: stage.color,
      is_won: stage.is_won,
      is_lost: stage.is_lost,
      count: stageDeals.length,
      total_value: totalValue,
      weighted_value: weightedValue,
    };
  });

  const totalActiveValue = byStage
    .filter(s => !s.is_won && !s.is_lost)
    .reduce((s, st) => s + st.total_value, 0);

  const wonValue = byStage.filter(s => s.is_won).reduce((s, st) => s + st.total_value, 0);
  const lostValue = byStage.filter(s => s.is_lost).reduce((s, st) => s + st.total_value, 0);
  const wonCount = byStage.filter(s => s.is_won).reduce((s, st) => s + st.count, 0);
  const lostCount = byStage.filter(s => s.is_lost).reduce((s, st) => s + st.count, 0);
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  return NextResponse.json({
    stages: byStage,
    summary: {
      total_deals: deals.length,
      active_pipeline_value: totalActiveValue,
      won_value: wonValue,
      lost_value: lostValue,
      win_rate: winRate,
    },
  });
}
