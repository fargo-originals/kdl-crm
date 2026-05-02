import { NextRequest, NextResponse } from 'next/server';
import { verifyWhatsAppWebhook, parseWhatsAppWebhook } from '@/lib/agents/providers/whatsapp';
import { runAgent } from '@/lib/agents';
import { supabaseServer } from '@/lib/supabase-server';

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Incoming messages (POST)
export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-hub-signature-256')?.replace('sha256=', '') ?? '';

  if (!verifyWhatsAppWebhook(bodyText, signature)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(bodyText);
  const inbound = parseWhatsAppWebhook(body);
  if (!inbound?.text) return NextResponse.json({ ok: true }); // ignore non-text

  // Find active session by phone number
  const { data: session } = await supabaseServer
    .from('agent_sessions')
    .select('id')
    .eq('external_contact_id', inbound.from)
    .eq('status', 'active')
    .eq('channel', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return NextResponse.json({ ok: true });

  await runAgent(session.id, inbound.text);
  return NextResponse.json({ ok: true });
}
