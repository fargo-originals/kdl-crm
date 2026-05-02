import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agents';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  // Resend inbound email webhook payload
  const body = await req.json();
  const fromEmail = body.from?.address ?? body.sender;
  const text = body.text ?? body.html?.replace(/<[^>]+>/g, '') ?? '';

  if (!fromEmail || !text) return NextResponse.json({ ok: true });

  // Find active session by email
  const { data: session } = await supabaseServer
    .from('agent_sessions')
    .select('id')
    .eq('external_contact_id', fromEmail.toLowerCase())
    .eq('status', 'active')
    .eq('channel', 'email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return NextResponse.json({ ok: true });

  await runAgent(session.id, text.trim());
  return NextResponse.json({ ok: true });
}
