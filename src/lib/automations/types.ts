export type TriggerType =
  | 'lead_created'
  | 'lead_no_response'
  | 'deal_stage_change'
  | 'campaign_opened'
  | 'appointment_confirmed';

export type ActionType =
  | 'send_email'
  | 'send_whatsapp'
  | 'create_task'
  | 'update_lead_status'
  | 'notify_slack';

export interface AutomationRule {
  id: string;
  owner_id: string;
  name: string;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  created_at: string;
}

export interface AutomationContext {
  // lead fields
  full_name?: string;
  email?: string;
  phone?: string;
  business_name?: string;
  status?: string;
  // deal fields
  deal_name?: string;
  stage?: string;
  previous_stage?: string;
  value?: number;
  // shared
  [key: string]: unknown;
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  lead_created: 'Lead creado',
  lead_no_response: 'Lead sin respuesta (N días)',
  deal_stage_change: 'Deal cambia de etapa',
  campaign_opened: 'Email de campaña abierto',
  appointment_confirmed: 'Cita confirmada',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'Enviar email',
  send_whatsapp: 'Enviar WhatsApp',
  create_task: 'Crear tarea',
  update_lead_status: 'Cambiar estado del lead',
  notify_slack: 'Notificar por Slack',
};
