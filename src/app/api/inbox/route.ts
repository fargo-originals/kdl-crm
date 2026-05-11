import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? 50);
  const offset = Number(searchParams.get('offset') ?? 0);
  const isRead = searchParams.get('is_read');
  const contactId = searchParams.get('contact_id');
  const companyId = searchParams.get('company_id');

  let query = supabaseServer
    .from('inbox_messages')
    .select(`
      id, gmail_id, thread_id, from_email, from_name, to_emails,
      subject, snippet, is_read, received_at, labels,
      contact_id, company_id, deal_id,
      contact:contacts(id, first_name, last_name),
      company:companies(id, name)
    `, { count: 'exact' })
    .eq('user_id', session.sub)
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (isRead !== null) query = query.eq('is_read', isRead === 'true');
  if (contactId) query = query.eq('contact_id', contactId);
  if (companyId) query = query.eq('company_id', companyId);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [], total: count ?? 0 });
}
