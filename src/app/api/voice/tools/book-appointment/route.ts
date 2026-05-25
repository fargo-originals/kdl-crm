import { NextResponse } from 'next/server';
import { verifySignedRequest } from '@/lib/agents/providers/voice';
import { bookAppointment } from '@/lib/agents/voiceActions';

export async function POST(req: Request) {
  const { ok, body } = await verifySignedRequest(req);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const result = await bookAppointment({
    leadId: String(data.leadId ?? ''),
    assignedTo: String(data.assignedUserId ?? data.assignedTo ?? ''),
    confirmedSlot: data.confirmedSlot ? String(data.confirmedSlot) : undefined,
    proposedSlots: Array.isArray(data.proposedSlots) ? (data.proposedSlots as string[]) : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, appointmentId: result.appointmentId });
}
