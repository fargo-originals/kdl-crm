import { NextResponse, NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/agents/providers/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: quote } = await supabaseServer
    .from('quotes')
    .select('*, contact:contacts(first_name, email), company:companies(name)')
    .eq('id', id)
    .single();

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const recipientEmail: string = body.email ?? quote.contact?.email ?? '';

  if (!recipientEmail) {
    return NextResponse.json({ error: 'No hay email de destinatario' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.kentodevlab.com';
  const quoteUrl = `${appUrl}/q/${id}`;
  const recipientName = quote.contact?.first_name ?? quote.company?.name ?? 'Cliente';

  const subject = `Presupuesto ${quote.number} — Kento Dev Lab`;
  const bodyHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
      <p>Hola <strong>${recipientName}</strong>,</p>
      <p>Adjunto encontrarás el presupuesto <strong>${quote.number}</strong> que hemos preparado para ti.</p>
      <p>Puedes verlo, aceptarlo o rechazarlo directamente desde el siguiente enlace:</p>
      <p style="margin:24px 0">
        <a href="${quoteUrl}"
           style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          Ver presupuesto →
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">
        Importe total: <strong>€${Number(quote.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
        ${quote.valid_until ? ` · Válido hasta: ${new Date(quote.valid_until).toLocaleDateString('es-ES')}` : ''}
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#64748b;font-size:12px">
        Un saludo,<br/>
        <strong>Felipe Díaz</strong><br/>
        Fundador de Kento Dev Lab
      </p>
    </div>
  `;

  await sendEmail(recipientEmail, subject, bodyHtml);

  // Mark as sent
  await supabaseServer
    .from('quotes')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
