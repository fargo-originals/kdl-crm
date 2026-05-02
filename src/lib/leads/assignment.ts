import { supabaseServer } from '@/lib/supabase-server';

export async function assignLead(): Promise<string | null> {
  // Simple round-robin: find seller with fewest recent leads
  const { data: sellers } = await supabaseServer
    .from('users')
    .select('id')
    .eq('active', true)
    .order('created_at');

  if (!sellers || sellers.length === 0) return null;

  // Count leads per seller in last 30 days
  const counts = await Promise.all(
    sellers.map(async s => {
      const { count } = await supabaseServer
        .from('lead_inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', s.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      return { id: s.id, count: count ?? 0 };
    })
  );

  counts.sort((a, b) => a.count - b.count);
  return counts[0]?.id ?? null;
}
