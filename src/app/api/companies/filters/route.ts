import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { SECTORS } from '@/lib/prospecting/sectors';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Sectores: lista canónica de prospección (fuente de verdad)
  const industries = SECTORS.map(s => ({ id: s.id, label: s.label }));

  // Barrios: todos los de prospect_results (no solo los importados)
  const { data: neighborhoodRows } = await supabaseServer
    .from('prospect_results')
    .select('neighborhood')
    .not('neighborhood', 'is', null)
    .neq('neighborhood', '');

  const neighborhoods = [...new Set((neighborhoodRows ?? []).map(r => r.neighborhood).filter(Boolean))].sort();

  return NextResponse.json({ industries, neighborhoods });
}
