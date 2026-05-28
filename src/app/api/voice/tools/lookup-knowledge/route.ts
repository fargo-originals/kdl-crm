import { NextResponse } from 'next/server';
import { verifySignedRequest } from '@/lib/agents/providers/voice';
import { buildSalesKnowledge } from '@/lib/agents/knowledge/salesKnowledge';

export async function POST(req: Request) {
  const { ok, body } = await verifySignedRequest(req);
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  let data: Record<string, unknown> = {};
  try {
    if (body) data = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const locale = data.locale ? String(data.locale) : 'es';
  const knowledge = await buildSalesKnowledge(locale);
  return NextResponse.json({ ok: true, knowledge: knowledge.full });
}
