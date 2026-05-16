import { getSession } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  create: 'Creado',
  update: 'Actualizado',
  delete: 'Eliminado',
  login: 'Login',
};

const ACTION_VARIANTS: Record<string, string> = {
  create: 'success',
  update: 'outline',
  delete: 'destructive',
  login: 'secondary',
};

const ENTITY_LABELS: Record<string, string> = {
  deal: 'Deal',
  contact: 'Contacto',
  company: 'Empresa',
  lead: 'Lead',
  quote: 'Presupuesto',
  user: 'Usuario',
};

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'seller') redirect('/dashboard');

  const supabase = getSupabaseServer();
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, user:users(first_name, last_name, email)')
    .order('changed_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground">Últimas 200 acciones registradas en el sistema</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {(!logs || logs.length === 0) ? (
            <p className="text-center text-sm text-muted-foreground py-10">No hay entradas todavía</p>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span className="col-span-2">Fecha</span>
                <span className="col-span-2">Acción</span>
                <span className="col-span-2">Entidad</span>
                <span className="col-span-3">Usuario</span>
                <span className="col-span-3">Cambios</span>
              </div>
              {logs.map(log => {
                const user = log.user as { first_name?: string; last_name?: string; email?: string } | null;
                const newVals = log.new_values as Record<string, unknown> | null;
                const changedKeys = newVals ? Object.keys(newVals).slice(0, 3).join(', ') : null;

                return (
                  <div key={log.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm hover:bg-muted/30">
                    <span className="col-span-2 text-xs text-muted-foreground">
                      {new Date(log.changed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="col-span-2">
                      <Badge variant={ACTION_VARIANTS[log.action] as 'success' | 'outline' | 'destructive' | 'secondary'} className="text-xs">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </div>
                    <span className="col-span-2 font-medium">
                      {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                    </span>
                    <span className="col-span-3 text-muted-foreground truncate">
                      {user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email : '—'}
                    </span>
                    <span className="col-span-3 text-xs text-muted-foreground truncate font-mono">
                      {changedKeys ?? log.entity_id?.slice(0, 8) ?? '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
