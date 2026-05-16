import { supabaseServer } from '@/lib/supabase-server';

export type AuditAction = 'create' | 'update' | 'delete' | 'login';

export interface AuditParams {
  entityType: string;
  entityId?: string;
  action: AuditAction;
  changedBy: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Write an audit log entry. Non-blocking — never throws.
 */
export function writeAudit(params: AuditParams): void {
  void supabaseServer.from('audit_logs').insert({
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    changed_by: params.changedBy,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
    ip_address: params.ipAddress ?? null,
  });
}
