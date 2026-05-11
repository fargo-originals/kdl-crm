import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/agents/providers/email';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const { slot, visitor_name, visitor_email, visitor_phone, message } = body;

  if (!slot || !visitor_name || !visitor_email) {
    return NextResponse.json({ error: 'slot, visitor_name y visitor_email son requeridos' }, { status: 400 });
  }

  const { data: user } = await supabaseServer
    .from('users')
    .select('id, first_name, last_name, email, booking_title, slot_duration_minutes')
    .eq('booking_slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Double-check slot is still available
  const slotDate = new Date(slot);
  const { data: conflict } = await supabaseServer
    .from('appointments')
    .select('id')
    .eq('assigned_to', user.id)
    .eq('confirmed_slot', slotDate.toISOString())
    .neq('status', 'cancelled')
    .maybeSingle();

  if (conflict) {
    return NextResponse.json({ error: 'Este horario ya no está disponible. Por favor elige otro.' }, { status: 409 });
  }

  // Upsert lead_inquiry
  let leadId: string | null = null;
  const { data: existingLead } = await supabaseServer
    .from('lead_inquiries')
    .select('id')
    .eq('email', visitor_email.toLowerCase())
    .maybeSingle();

  if (existingLead) {
    leadId = existingLead.id;
  } else {
    const { data: newLead } = await supabaseServer
      .from('lead_inquiries')
      .insert({
        full_name: visitor_name,
        email: visitor_email.toLowerCase(),
        phone: visitor_phone ?? null,
        message: message ?? null,
        service_interest: user.booking_title ?? 'consulta',
        preferred_channel: 'email',
        source: 'landing_form',
        status: 'scheduled',
        assigned_to: user.id,
      })
      .select('id')
      .single();
    leadId = newLead?.id ?? null;
  }

  // Create appointment
  const { data: appt, error } = await supabaseServer
    .from('appointments')
    .insert({
      lead_id: leadId,
      assigned_to: user.id,
      confirmed_slot: slotDate.toISOString(),
      status: 'confirmed',
      notes: message ?? null,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation email to visitor
  const slotFormatted = slotDate.toLocaleString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });
  const agentName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="margin-bottom:4px">Cita confirmada</h2>
      <p style="color:#6b7280;margin-top:0">${user.booking_title ?? 'Consulta gratuita'} con ${agentName}</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:18px;font-weight:600">${slotFormatted}</p>
        <p style="margin:4px 0 0;color:#6b7280;font-size:14px">Duración: ${user.slot_duration_minutes ?? 30} minutos</p>
      </div>
      <p>Hola ${visitor_name},</p>
      <p>Tu cita ha sido reservada correctamente. Nos pondremos en contacto contigo para confirmar los detalles.</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
      <p style="font-size:12px;color:#6b7280">KentoDevLab · Si necesitas cambiar la cita, responde a este email.</p>
    </div>
  `;

  try {
    await sendEmail(visitor_email, `Cita confirmada: ${slotFormatted}`, html);
  } catch {
    // Non-fatal: appointment is created, email failed
  }

  return NextResponse.json({ ok: true, appointment_id: appt.id });
}
