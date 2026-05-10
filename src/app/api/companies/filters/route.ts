import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Sectores/industrias distintos de companies
  const { data: industryRows } = await supabaseServer
    .from('companies')
    .select('industry')
    .not('industry', 'is', null)
    .neq('industry', '');

  const industries = [...new Set((industryRows ?? []).map(r => r.industry).filter(Boolean))].sort();

  // Barrios desde prospect_results (vía imported_company_id)
  const { data: neighborhoodRows } = await supabaseServer
    .from('prospect_results')
    .select('neighborhood')
    .not('imported_company_id', 'is', null)
    .not('neighborhood', 'is', null)
    .neq('neighborhood', '');

  const neighborhoods = [...new Set((neighborhoodRows ?? []).map(r => r.neighborhood).filter(Boolean))].sort();

  return NextResponse.json({ industries, neighborhoods });
}
