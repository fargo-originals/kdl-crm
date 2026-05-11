import { supabaseServer } from '@/lib/supabase-server';

export interface ScoringRule {
  id: string;
  field: string;
  operator: string;
  value: string | null;
  points: number;
  is_active: boolean;
  object_type: string;
}

function evaluateRule(rule: ScoringRule, data: Record<string, unknown>): boolean {
  const fieldValue = data[rule.field];
  const ruleValue = rule.value ?? '';

  switch (rule.operator) {
    case 'equals':
      return String(fieldValue ?? '').toLowerCase() === ruleValue.toLowerCase();
    case 'not_equals':
      return String(fieldValue ?? '').toLowerCase() !== ruleValue.toLowerCase();
    case 'contains':
      return String(fieldValue ?? '').toLowerCase().includes(ruleValue.toLowerCase());
    case 'is_set':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'is_not_set':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    default:
      return false;
  }
}

export async function calculateScore(
  data: Record<string, unknown>,
  ownerId: string,
  objectType: 'lead' | 'contact' = 'lead'
): Promise<number> {
  const { data: rules } = await supabaseServer
    .from('scoring_rules')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('object_type', objectType)
    .eq('is_active', true);

  if (!rules?.length) return 0;

  return (rules as ScoringRule[]).reduce((score, rule) => {
    return score + (evaluateRule(rule, data) ? rule.points : 0);
  }, 0);
}

export async function rescoreAllLeads(ownerId: string): Promise<void> {
  const { data: rules } = await supabaseServer
    .from('scoring_rules')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('object_type', 'lead')
    .eq('is_active', true);

  if (!rules?.length) return;

  const { data: leads } = await supabaseServer
    .from('lead_inquiries')
    .select('id, status, source, service_interest, phone, email, website')
    .eq('assigned_to', ownerId);

  if (!leads?.length) return;

  const updates = leads.map(lead => ({
    id: lead.id,
    score: (rules as ScoringRule[]).reduce((score, rule) => {
      return score + (evaluateRule(rule, lead as Record<string, unknown>) ? rule.points : 0);
    }, 0),
  }));

  for (const update of updates) {
    await supabaseServer
      .from('lead_inquiries')
      .update({ score: update.score })
      .eq('id', update.id);
  }
}
