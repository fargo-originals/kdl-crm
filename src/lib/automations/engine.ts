import { supabaseServer } from '@/lib/supabase-server';
import { sendEmail } from '@/lib/agents/providers/email';
import { sendWhatsAppMessage } from '@/lib/agents/providers/whatsapp';
import { notify } from '@/lib/notifications';
import { interpolate } from './interpolate';
import type { TriggerType, AutomationRule, AutomationContext } from './types';

// ── Action handlers ───────────────────────────────────────────────────────────

async function handleSendEmail(
  config: Record<string, unknown>,
  ctx: AutomationContext,
) {
  const to = String(config.to ?? ctx.email ?? '');
  if (!to) throw new Error('No email address for send_email action');
  const subject = interpolate(String(config.subject ?? 'Seguimiento'), ctx);
  const body = interpolate(String(config.body_html ?? config.body ?? ''), ctx);
  await sendEmail(to, subject, body);
}

async function handleSendWhatsApp(
  config: Record<string, unknown>,
  ctx: AutomationContext,
) {
  const to = String(config.to ?? ctx.phone ?? '');
  if (!to) throw new Error('No phone for send_whatsapp action');
  const text = interpolate(String(config.message ?? ''), ctx);
  await sendWhatsAppMessage(to, text);
}

async function handleCreateTask(
  config: Record<string, unknown>,
  ctx: AutomationContext,
  ownerId: string,
) {
  const title = interpolate(String(config.title ?? 'Seguimiento automático'), ctx);
  const dueOffsetDays = Number(config.due_offset_days ?? 1);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueOffsetDays);

  await supabaseServer.from('tasks').insert({
    title,
    due_date: dueDate.toISOString(),
    priority: String(config.priority ?? 'medium'),
    status: 'pending',
    owner_id: ownerId,
    assignee_id: ownerId,
  });
}

async function handleUpdateLeadStatus(
  config: Record<string, unknown>,
  entityId: string,
) {
  const newStatus = String(config.status ?? 'contacted');
  await supabaseServer
    .from('lead_inquiries')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', entityId);
}

async function handleNotifySlack(
  config: Record<string, unknown>,
  ctx: AutomationContext,
  ownerId: string,
) {
  const message = interpolate(String(config.message ?? 'Automatización ejecutada'), ctx);
  await notify(ownerId, 'lead.received', { title: 'Automatización', body: message });
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runAutomation(
  triggerType: TriggerType,
  entityId: string,
  entityData: AutomationContext,
  ownerId: string,
): Promise<void> {
  // Fetch matching active rules
  const { data: rules } = await supabaseServer
    .from('automation_rules')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (!rules || rules.length === 0) return;

  for (const rule of rules as AutomationRule[]) {
    let status: 'ok' | 'error' = 'ok';
    let errorMessage: string | undefined;

    try {
      // Evaluate trigger_config conditions
      if (!matchesTriggerConfig(rule.trigger_type, rule.trigger_config, entityData)) {
        continue;
      }

      // Execute action
      switch (rule.action_type) {
        case 'send_email':
          await handleSendEmail(rule.action_config, entityData);
          break;
        case 'send_whatsapp':
          await handleSendWhatsApp(rule.action_config, entityData);
          break;
        case 'create_task':
          await handleCreateTask(rule.action_config, entityData, ownerId);
          break;
        case 'update_lead_status':
          await handleUpdateLeadStatus(rule.action_config, entityId);
          break;
        case 'notify_slack':
          await handleNotifySlack(rule.action_config, entityData, ownerId);
          break;
      }
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[automations] Rule ${rule.id} failed:`, errorMessage);
    }

    // Log execution
    void supabaseServer.from('automation_logs').insert({
      rule_id: rule.id,
      trigger_type: triggerType,
      entity_id: entityId,
      action_type: rule.action_type,
      status,
      error_message: errorMessage ?? null,
    });
  }
}

// ── Trigger config evaluators ─────────────────────────────────────────────────

function matchesTriggerConfig(
  triggerType: TriggerType,
  config: Record<string, unknown>,
  ctx: AutomationContext,
): boolean {
  if (triggerType === 'deal_stage_change') {
    const fromStage = config.from_stage as string | undefined;
    const toStage = config.to_stage as string | undefined;
    if (fromStage && ctx.previous_stage !== fromStage) return false;
    if (toStage && ctx.stage !== toStage) return false;
  }
  return true;
}

// ── Cron: lead_no_response ────────────────────────────────────────────────────

export async function runLeadNoResponseAutomations(): Promise<number> {
  // Get all unique lead_no_response rules grouped by days threshold
  const { data: rules } = await supabaseServer
    .from('automation_rules')
    .select('*')
    .eq('trigger_type', 'lead_no_response')
    .eq('is_active', true);

  if (!rules || rules.length === 0) return 0;

  let processed = 0;

  for (const rule of rules as AutomationRule[]) {
    const days = Number((rule.trigger_config as Record<string, unknown>).days ?? 3);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data: leads } = await supabaseServer
      .from('lead_inquiries')
      .select('*')
      .eq('status', 'new')
      .lte('updated_at', cutoff.toISOString());

    if (!leads) continue;

    for (const lead of leads) {
      await runAutomation('lead_no_response', lead.id, {
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        business_name: lead.business_name,
        status: lead.status,
      }, rule.owner_id);
      processed++;
    }
  }

  return processed;
}
