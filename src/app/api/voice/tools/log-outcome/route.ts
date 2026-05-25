import { NextResponse } from 'next/server';
import { verifySignedRequest } from '@/lib/agents/providers/voice';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const { ok, body } = await verifySignedRequest(req);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const callId = data.callId ? String(data.callId) : '';
  if (!callId) return NextResponse.json({ error: 'callId requerido' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.outcome) update.outcome = String(data.outcome);
  if (data.sentiment) update.sentiment = String(data.sentiment);

  const objections: string[] = [];
  if (Array.isArray(data.objections)) objections.push(...(data.objections as string[]));
  if (data.objection) objections.push(String(data.objection));
  if (objections.length) update.objections_detected = objections;

  await supabaseServer.from('voice_calls').update(update).eq('id', callId);

  // Si pide no ser llamado, marca el lead como DNC.
  if (data.outcome === 'dnc') {
    const leadId = data.leadId ? String(data.leadId) : null;
    if (leadId) {
      await supabaseServer.from('lead_inquiries').update({ do_not_call: true }).eq('id', leadId);
    }
  }

  return NextResponse.json({ ok: true });
}
