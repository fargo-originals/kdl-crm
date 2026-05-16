import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('lead_id');
  const contactId = searchParams.get('contact_id');
  const cadenceId = searchParams.get('cadence_id');

  // Get cadences for this owner
  const { data: cadences } = await supabaseServer
    .from('sales_cadences')
    .select('id')
    .eq('owner_id', session.sub);

  const cadenceIds = (cadences ?? []).map(c => c.id);
  if (cadenceIds.length === 0) return NextResponse.json([]);

  let query = supabaseServer
    .from('cadence_enrollments')
    .select(`
      *,
      cadence:sales_cadences(id, name),
      executions:cadence_step_executions(id, status, scheduled_for, sent_at, step:cadence_steps(position, channel, template_key, day_offset))
    `)
    .in('cadence_id', cadenceIds)
    .order('enrolled_at', { ascending: false });

  if (leadId) query = query.eq('lead_id', leadId);
  if (contactId) query = query.eq('contact_id', contactId);
  if (cadenceId) query = query.eq('cadence_id', cadenceId);

  const { data } = await query.limit(50);
  return NextResponse.json(data ?? []);
}
