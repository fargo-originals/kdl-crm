import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agents';
import { supabaseServer } from '@/lib/supabase-server';
import { Resend } from 'resend';

// Resend email.received webhook payload
interface ResendReceivedPayload {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
  };
}

// Resend Received Email API response
interface ReceivedEmailContent {
  text?: string;
  html?: string;
  from?: string;
}

function extractAddress(from: string): string {
  // "Nombre <email@domain.com>" → "email@domain.com"
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

async function fetchEmailBody(emailId: string): Promise<{ text: string; from: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { text: '', from: '' };

  const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) return { text: '', from: '' };

  const data = await res.json() as ReceivedEmailContent;
  const text = data.text ?? data.html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
  return { text, from: data.from ?? '' };
}

export async function POST(req: NextRequest) {
  const body = await req.json() as ResendReceivedPayload;

  if (body.type !== 'email.received') {
    return NextResponse.json({ ok: true });
  }

  const { email_id, from: rawFrom } = body.data;
  const fromEmail = extractAddress(rawFrom);

  if (!fromEmail || !email_id) return NextResponse.json({ ok: true });

  // Obtener el cuerpo del email desde la API de Resend
  const { text, from: apiFrom } = await fetchEmailBody(email_id);
  const finalFrom = fromEmail || extractAddress(apiFrom);
  const content = text.trim();

  if (!content) return NextResponse.json({ ok: true });

  // Buscar sesión activa por email del remitente
  const { data: session } = await supabaseServer
    .from('agent_sessions')
    .select('id')
    .eq('external_contact_id', finalFrom)
    .eq('status', 'active')
    .eq('channel', 'email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return NextResponse.json({ ok: true });

  await runAgent(session.id, content);
  return NextResponse.json({ ok: true });
}
