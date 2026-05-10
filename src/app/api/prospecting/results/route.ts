import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getCurrentDbUserId } from '@/lib/prospecting/auth';

export async function GET(req: Request) {
  const { dbUserId, error } = await getCurrentDbUserId();
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get('sector');
  const hasEmail = searchParams.get('hasEmail') === 'true';
  const webFilter = searchParams.get('web'); // 'none' | 'has' | null (todos)
  const limit = Math.min(500, parseInt(searchParams.get('limit') ?? '300'));

  // Obtener IDs de búsquedas del usuario (aprobadas, con filtro de sector si viene)
  let searchQuery = supabaseServer
    .from('prospect_searches')
    .select('id, sector')
    .eq('user_id', dbUserId);

  if (sector) searchQuery = searchQuery.eq('sector', sector);

  const { data: searches } = await searchQuery;
  if (!searches || searches.length === 0) {
    return NextResponse.json({ data: [], stats: { total: 0, withEmail: 0, phoneOnly: 0, noWeb: 0 } });
  }

  const searchIds = searches.map(s => s.id);

  let query = supabaseServer
    .from('prospect_results')
    .select('id, name, email, phone, neighborhood, category, google_rating, google_review_count, website, contact_name, enrichment_status, review_status')
    .in('search_id', searchIds)
    .eq('review_status', 'approved')
    .order('google_review_count', { ascending: false })
    .limit(limit);

  if (hasEmail) query = query.not('email', 'is', null).neq('email', '');
  if (webFilter === 'none') query = query.or('website.is.null,website.eq.');
  if (webFilter === 'has') query = query.not('website', 'is', null).neq('website', '');

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const rows = data ?? [];
  const stats = {
    total: rows.length,
    withEmail: rows.filter(r => r.email).length,
    phoneOnly: rows.filter(r => !r.email && r.phone).length,
    noWeb: rows.filter(r => !r.website).length,
  };

  return NextResponse.json({ data: rows, stats });
}
