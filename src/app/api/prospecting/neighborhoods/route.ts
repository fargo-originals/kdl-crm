import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';

export async function GET(req: Request) {
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get('sector');

  // Buscar las búsquedas del usuario (filtradas por sector si se especifica)
  let searchQuery = supabaseServer
    .from('prospect_searches')
    .select('id')
    .eq('user_id', dbUserId);

  if (sector) searchQuery = searchQuery.eq('sector', sector);

  const { data: searches } = await searchQuery;
  if (!searches || searches.length === 0) {
    return NextResponse.json({ neighborhoods: [] });
  }

  const searchIds = searches.map(s => s.id);

  // Obtener barrios distintos de los resultados aprobados
  const { data: rows } = await supabaseServer
    .from('prospect_results')
    .select('neighborhood')
    .in('search_id', searchIds)
    .eq('review_status', 'approved')
    .not('neighborhood', 'is', null)
    .neq('neighborhood', '');

  const neighborhoods = [
    ...new Set((rows ?? []).map(r => r.neighborhood).filter(Boolean)),
  ].sort();

  return NextResponse.json({ neighborhoods });
}
