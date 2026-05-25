import { supabaseServer } from '@/lib/supabase-server';

// Agenda una cita desde la llamada de voz: marca el lead como cualificado y crea la propuesta.
// Espeja la rama "inbound" de requestHumanHandoff, pero invocable por HTTP desde el orquestador.
export async function bookAppointment(args: {
  leadId: string;
  assignedTo: string;
  confirmedSlot?: string;
  proposedSlots?: string[];
}): Promise<{ ok: boolean; appointmentId?: string; error?: string }> {
  const { leadId, assignedTo, confirmedSlot, proposedSlots } = args;
  if (!leadId || !assignedTo) return { ok: false, error: 'leadId y assignedTo son obligatorios' };

  await supabaseServer
    .from('lead_inquiries')
    .update({ status: 'qualified', updated_at: new Date().toISOString() })
    .eq('id', leadId);

  const { data: appt, error } = await supabaseServer
    .from('appointments')
    .insert({
      lead_id: leadId,
      assigned_to: assignedTo,
      proposed_slots: proposedSlots ?? (confirmedSlot ? [confirmedSlot] : []),
      status: 'proposed',
      notes: confirmedSlot ? `Franja confirmada por voz: ${confirmedSlot}` : null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, appointmentId: appt?.id };
}

// Marca la sesión como pendiente de humano y notifica al comercial asignado.
export async function escalateToHuman(args: {
  sessionId?: string;
  leadId?: string;
  assignedTo?: string;
  reason?: string;
}): Promise<{ ok: boolean }> {
  if (args.sessionId) {
    await supabaseServer
      .from('agent_sessions')
      .update({ status: 'awaiting_human', updated_at: new Date().toISOString() })
      .eq('id', args.sessionId);
  }

  if (args.assignedTo) {
    await supabaseServer.from('notifications').insert({
      user_id: args.assignedTo,
      type: 'voice.escalation',
      title: 'Llamada escalada a un humano',
      body: args.reason ?? 'El agente de voz solicitó intervención humana.',
      data: { leadId: args.leadId ?? null, sessionId: args.sessionId ?? null },
    });
  }

  return { ok: true };
}
