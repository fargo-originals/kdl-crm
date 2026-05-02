import { tool } from 'ai';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';

export const requestHumanHandoff = tool({
  description: 'Mark the lead as qualified and create an appointment proposal, triggering human review',
  inputSchema: z.object({
    leadId: z.string(),
    assignedTo: z.string(),
    confirmedSlot: z.string().describe('The slot the lead confirmed, as a string'),
    proposedSlots: z.array(z.string()),
  }),
  execute: async ({ leadId, assignedTo, confirmedSlot, proposedSlots }) => {
    await supabaseServer
      .from('lead_inquiries')
      .update({ status: 'qualified', updated_at: new Date().toISOString() })
      .eq('id', leadId);

    const { data: appt } = await supabaseServer
      .from('appointments')
      .insert({
        lead_id: leadId,
        assigned_to: assignedTo,
        proposed_slots: proposedSlots,
        status: 'proposed',
      })
      .select('id')
      .single();

    return { handoffTriggered: true, appointmentId: appt?.id };
  },
});
