import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { getValidGmailToken, sendGmailReply } from '@/lib/gmail/client';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json() as { body: string };
  if (!body?.trim()) return NextResponse.json({ error: 'body es requerido' }, { status: 400 });

  const { data: msg } = await supabaseServer
    .from('inbox_messages')
    .select('from_email, subject, thread_id, gmail_id')
    .eq('id', id)
    .eq('user_id', session.sub)
    .single();

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = await getValidGmailToken(session.sub);
  if (!token) return NextResponse.json({ error: 'Gmail no conectado' }, { status: 400 });

  const subject = msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;

  try {
    await sendGmailReply(token, {
      to: msg.from_email,
      subject,
      body,
      threadId: msg.thread_id ?? undefined,
      inReplyTo: msg.gmail_id,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
