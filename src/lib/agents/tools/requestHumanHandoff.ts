import { tool } from 'ai';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';

export const requestHumanHandoff = tool({
  description: 'Mark the lead as qualified and create an appointment proposal, triggering human review. Also creates a deal in the pipeline if coming from a cold outreach campaign.',
  inputSchema: z.object({
    sessionId: z.string().describe('The agent session UUID'),
    assignedTo: z.string().describe('The UUID of the assigned sales rep'),
    confirmedSlot: z.string().describe('The slot the lead confirmed, as a string'),
    proposedSlots: z.array(z.string()),
    estimatedValue: z.number().optional().describe('Estimated deal value in EUR (499, 899 or 1499)'),
    serviceInterest: z.string().optional().describe('Which service they are interested in'),
  }),
  execute: async ({ sessionId, assignedTo, confirmedSlot, proposedSlots, estimatedValue, serviceInterest }) => {
    // Get session to determine if it's inbound (lead) or outbound (campaign)
    const { data: session } = await supabaseServer
      .from('agent_sessions')
      .select('id, lead_id, campaign_recipient_id')
      .eq('id', sessionId)
      .single();

    if (!session) return { handoffTriggered: false, error: 'Session not found' };

    let leadId = session.lead_id as string | null;

    // ── Campaign outreach: create lead_inquiry + deal from prospect data ─────
    if (!leadId && session.campaign_recipient_id) {
      const { data: recipient } = await supabaseServer
        .from('email_campaign_recipients')
        .select('email, variables, campaign_id')
        .eq('id', session.campaign_recipient_id)
        .single();

      if (recipient) {
        const vars = (recipient.variables ?? {}) as Record<string, string>;

        // Create lead_inquiry from prospect variables
        const { data: newLead } = await supabaseServer
          .from('lead_inquiries')
          .insert({
            full_name: vars.firstName ?? vars.businessName ?? 'Prospecto',
            email: recipient.email,
            business_name: vars.businessName ?? '',
            business_type: vars.category ?? '',
            service_interest: serviceInterest ?? 'web',
            status: 'qualified',
            source: 'campaign_outreach',
            assigned_to: assignedTo,
          })
          .select('id')
          .single();

        leadId = newLead?.id ?? null;

        // Create deal in pipeline
        if (newLead?.id) {
          await supabaseServer.from('deals').insert({
            name: `Web — ${vars.businessName ?? recipient.email}`,
            owner_id: assignedTo,
            stage: 'Contacted',
            value: estimatedValue ?? 499,
            currency: 'EUR',
            probability: 20,
            notes: `Prospecto captado via campaña de outreach. Barrio: ${vars.neighborhood ?? ''}. Rating Google: ${vars.rating ?? '—'}★`,
          });
        }

        // Mark campaign recipient as replied/qualified
        await supabaseServer
          .from('email_campaign_recipients')
          .update({ status: 'clicked', last_activity_at: new Date().toISOString() })
          .eq('id', session.campaign_recipient_id);
      }
    }

    // ── Inbound lead: just mark as qualified ────────────────────────────────
    if (leadId) {
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

      // Close agent session
      await supabaseServer
        .from('agent_sessions')
        .update({ status: 'awaiting_human', updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      return { handoffTriggered: true, appointmentId: appt?.id, leadId };
    }

    return { handoffTriggered: false, error: 'Could not resolve lead' };
  },
});
