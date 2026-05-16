export interface CadenceStep {
  id: string;
  cadence_id: string;
  position: number;
  day_offset: number;
  channel: 'email' | 'whatsapp';
  template_key: string | null;
  subject: string | null;
  message: string | null;
}

export interface Cadence {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  sector: string | null;
  is_active: boolean;
  created_at: string;
  steps?: CadenceStep[];
}

export interface CadenceEnrollment {
  id: string;
  cadence_id: string;
  contact_id: string | null;
  lead_id: string | null;
  variables: Record<string, string>;
  status: 'active' | 'paused' | 'completed';
  enrolled_at: string;
  paused_at: string | null;
  completed_at: string | null;
}

export const CHANNEL_TEMPLATE_KEYS = {
  email: [
    { value: 'email_1_first_contact', label: 'Email 1 — Primer contacto' },
    { value: 'email_2_follow_up', label: 'Email 2 — Follow-up' },
    { value: 'email_3_breakup', label: 'Email 3 — Breakup' },
  ],
  whatsapp: [
    { value: 'wa_1_first_contact', label: 'WhatsApp 1 — Primer contacto' },
    { value: 'wa_2_follow_up', label: 'WhatsApp 2 — Follow-up' },
    { value: 'wa_3_breakup', label: 'WhatsApp 3 — Cierre' },
  ],
} as const;
