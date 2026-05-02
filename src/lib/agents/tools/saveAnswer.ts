import { tool } from 'ai';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase-server';

export const saveAnswer = tool({
  description: 'Save a qualification answer from the lead to the CRM',
  inputSchema: z.object({
    leadId: z.string(),
    key: z.string().describe('Field name, e.g. budget, timeline, pain_point'),
    value: z.string(),
  }),
  execute: async ({ leadId, key, value }) => {
    const { data: lead } = await supabaseServer
      .from('lead_inquiries')
      .select('qualification_data')
      .eq('id', leadId)
      .maybeSingle();

    const existing = (lead?.qualification_data as Record<string, string>) ?? {};
    await supabaseServer
      .from('lead_inquiries')
      .update({
        qualification_data: { ...existing, [key]: value },
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    return { saved: true };
  },
});
