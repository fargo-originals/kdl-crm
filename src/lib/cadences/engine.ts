import { supabaseServer } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/agents/providers/email';
import { sendWhatsAppMessage } from '@/lib/agents/providers/whatsapp';
import { renderTemplate, renderWaTemplate } from '@/lib/campaigns/templates';
import type { TemplateVars } from '@/lib/campaigns/templates';
import type { WaTemplateType } from '@/lib/campaigns/templates';
import type { CadenceStep } from './types';

// ── Enroll contact/lead in a cadence ─────────────────────────────────────────

export async function enrollInCadence(
  cadenceId: string,
  leadId: string | null,
  contactId: string | null,
  variables: Record<string, string> = {},
): Promise<{ enrollmentId: string } | { error: string }> {
  // Check already enrolled and active
  const { data: existing } = await supabaseServer
    .from('cadence_enrollments')
    .select('id')
    .eq('cadence_id', cadenceId)
    .eq('status', 'active')
    .eq(leadId ? 'lead_id' : 'contact_id', leadId ?? contactId ?? '')
    .maybeSingle();

  if (existing) return { error: 'Ya está enrolado en esta cadencia' };

  // Fetch steps ordered
  const { data: steps } = await supabaseServer
    .from('cadence_steps')
    .select('*')
    .eq('cadence_id', cadenceId)
    .order('position', { ascending: true });

  if (!steps || steps.length === 0) {
    return { error: 'La cadencia no tiene pasos' };
  }

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabaseServer
    .from('cadence_enrollments')
    .insert({
      cadence_id: cadenceId,
      lead_id: leadId ?? null,
      contact_id: contactId ?? null,
      variables,
      status: 'active',
    })
    .select()
    .single();

  if (enrollError || !enrollment) {
    return { error: enrollError?.message ?? 'Error al enrolar' };
  }

  // Pre-create execution rows
  const now = new Date();
  const executions = (steps as CadenceStep[]).map(step => {
    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + step.day_offset);
    return {
      enrollment_id: enrollment.id,
      step_id: step.id,
      status: 'pending',
      scheduled_for: scheduledFor.toISOString(),
    };
  });

  await supabaseServer.from('cadence_step_executions').insert(executions);

  return { enrollmentId: enrollment.id };
}

// ── Process pending steps (called by cron) ────────────────────────────────────

export async function processPendingCadenceSteps(): Promise<number> {
  const now = new Date().toISOString();

  // Fetch due pending executions with their enrollment + step data
  const { data: executions } = await supabaseServer
    .from('cadence_step_executions')
    .select(`
      id,
      enrollment_id,
      step_id,
      enrollment:cadence_enrollments(
        id, status, variables, lead_id, contact_id,
        cadence:sales_cadences(id, sector)
      ),
      step:cadence_steps(
        id, channel, template_key, subject, message, day_offset
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(100);

  if (!executions || executions.length === 0) return 0;

  let processed = 0;

  for (const exec of executions) {
    const enrollment = exec.enrollment as unknown as Record<string, unknown>;
    const step = exec.step as unknown as Record<string, unknown>;

    // Skip paused/completed enrollments
    if (!enrollment || enrollment.status !== 'active') {
      await supabaseServer
        .from('cadence_step_executions')
        .update({ status: 'skipped', sent_at: now })
        .eq('id', exec.id);
      continue;
    }

    const variables = (enrollment.variables as Record<string, string>) ?? {};
    const channel = step.channel as 'email' | 'whatsapp';
    const templateKey = step.template_key as string | null;
    const cadence = enrollment.cadence as Record<string, unknown>;
    const sector = (cadence?.sector as string) ?? 'restaurantes';

    // Resolve contact data
    let recipientEmail: string | null = null;
    let recipientPhone: string | null = null;

    if (enrollment.lead_id) {
      const { data: lead } = await supabaseServer
        .from('lead_inquiries')
        .select('email, phone, full_name, business_name')
        .eq('id', enrollment.lead_id as string)
        .single();
      if (lead) {
        recipientEmail = lead.email;
        recipientPhone = lead.phone;
        if (!variables.firstName) variables.firstName = (lead.full_name ?? '').split(' ')[0];
        if (!variables.businessName) variables.businessName = lead.business_name ?? '';
      }
    } else if (enrollment.contact_id) {
      const { data: contact } = await supabaseServer
        .from('contacts')
        .select('email, phone, first_name, last_name')
        .eq('id', enrollment.contact_id as string)
        .single();
      if (contact) {
        recipientEmail = contact.email;
        recipientPhone = contact.phone;
        if (!variables.firstName) variables.firstName = contact.first_name ?? '';
      }
    }

    let status: 'sent' | 'error' = 'sent';
    let errorMessage: string | undefined;

    try {
      const templateVars: TemplateVars = {
        firstName: variables.firstName ?? '',
        businessName: variables.businessName ?? '',
        neighborhood: variables.neighborhood ?? '',
        rating: variables.rating ?? '',
        reviewCount: variables.reviewCount ?? '0',
        websiteUrl: variables.websiteUrl,
        category: variables.category,
        sector,
      };

      if (channel === 'email' && recipientEmail) {
        let subject = step.subject as string | null;
        let bodyHtml: string;

        if (templateKey) {
          const rendered = renderTemplate(
            templateKey as Parameters<typeof renderTemplate>[0],
            sector as Parameters<typeof renderTemplate>[1],
            templateVars,
          );
          subject = subject || rendered.subject;
          bodyHtml = rendered.bodyHtml;
        } else {
          bodyHtml = `<p>${step.message ?? ''}</p>`;
          subject = subject ?? 'Seguimiento';
        }

        await sendEmail(recipientEmail, subject, bodyHtml);
      } else if (channel === 'whatsapp' && recipientPhone) {
        let text: string;
        if (templateKey) {
          text = renderWaTemplate(templateKey as WaTemplateType, templateVars);
        } else {
          text = step.message as string ?? '';
        }
        await sendWhatsAppMessage(recipientPhone, text);
      } else {
        status = 'error';
        errorMessage = `No ${channel === 'email' ? 'email' : 'phone'} available for recipient`;
      }
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[cadences] Execution ${exec.id} failed:`, errorMessage);
    }

    await supabaseServer
      .from('cadence_step_executions')
      .update({ status, sent_at: now, error_message: errorMessage ?? null })
      .eq('id', exec.id);

    if (status === 'sent') processed++;
  }

  // Check completed enrollments (all steps sent/skipped)
  await markCompletedEnrollments();

  return processed;
}

async function markCompletedEnrollments() {
  // Find enrollments where all executions are no longer pending
  const { data: enrollments } = await supabaseServer
    .from('cadence_enrollments')
    .select('id')
    .eq('status', 'active');

  if (!enrollments) return;

  for (const e of enrollments) {
    const { count } = await supabaseServer
      .from('cadence_step_executions')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', e.id)
      .eq('status', 'pending');

    if (count === 0) {
      await supabaseServer
        .from('cadence_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', e.id);
    }
  }
}

// ── Pause enrollments when contact replies ────────────────────────────────────

export async function pauseEnrollmentsForContact(
  leadId: string | null,
  contactId: string | null,
): Promise<void> {
  if (!leadId && !contactId) return;

  const query = supabaseServer
    .from('cadence_enrollments')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('status', 'active');

  if (leadId) {
    await query.eq('lead_id', leadId);
  } else if (contactId) {
    await query.eq('contact_id', contactId);
  }
}
