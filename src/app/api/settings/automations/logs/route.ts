import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get rule IDs for this owner
  const { data: rules } = await supabaseServer
    .from('automation_rules')
    .select('id')
    .eq('owner_id', session.sub);

  if (!rules || rules.length === 0) return NextResponse.json([]);

  const ruleIds = rules.map(r => r.id);

  const { data } = await supabaseServer
    .from('automation_logs')
    .select('*, rule:automation_rules(name)')
    .in('rule_id', ruleIds)
    .order('executed_at', { ascending: false })
    .limit(50);

  return NextResponse.json(data ?? []);
}
