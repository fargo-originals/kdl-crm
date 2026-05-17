import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { fireWebhook } from '@/lib/webhooks';

/**
 * POST /api/leads/bulk
 * Body: { ids: string[], action: 'update_status' | 'assign' | 'delete', value?: string }
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids, action, value } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
  }

  let affected = 0;

  if (action === 'update_status') {
    const valid = ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'];
    if (!valid.includes(value)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    await supabaseServer
      .from('lead_inquiries')
      .update({ status: value, updated_at: new Date().toISOString() })
      .in('id', ids);

    affected = ids.length;

    // Fire webhook (batch, non-blocking)
    fireWebhook('lead.status_changed', session.sub, { ids, new_status: value, count: affected });

  } else if (action === 'assign') {
    if (!value) return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });

    await supabaseServer
      .from('lead_inquiries')
      .update({ assigned_to: value, updated_at: new Date().toISOString() })
      .in('id', ids);

    affected = ids.length;

  } else if (action === 'delete') {
    if (session.role === 'seller') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await supabaseServer
      .from('lead_inquiries')
      .delete()
      .in('id', ids);

    affected = ids.length;

  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, affected });
}
