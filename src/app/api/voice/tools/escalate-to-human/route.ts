import { NextResponse } from 'next/server';
import { verifySignedRequest } from '@/lib/agents/providers/voice';
import { escalateToHuman } from '@/lib/agents/voiceActions';

export async function POST(req: Request) {
  const { ok, body } = await verifySignedRequest(req);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  await escalateToHuman({
    sessionId: data.sessionId ? String(data.sessionId) : undefined,
    leadId: data.leadId ? String(data.leadId) : undefined,
    assignedTo: data.assignedUserId ? String(data.assignedUserId) : undefined,
    reason: data.reason ? String(data.reason) : undefined,
  });

  return NextResponse.json({ ok: true });
}
