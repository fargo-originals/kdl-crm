'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/automations/types';
import type { TriggerType, ActionType } from '@/lib/automations/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Log {
  id: string;
  trigger_type: TriggerType;
  entity_id: string;
  action_type: ActionType;
  status: 'ok' | 'error';
  error_message: string | null;
  executed_at: string;
  rule: { name: string } | null;
}

export default function AutomationLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/automations/logs')
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/automations" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Logs de automatizaciones</h1>
          <p className="text-muted-foreground">Últimas 50 ejecuciones</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de ejecuciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No hay ejecuciones todavía</p>
          ) : (
            <div className="divide-y">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-4">
                  <Badge variant={log.status === 'ok' ? 'success' : 'destructive'} className="shrink-0">
                    {log.status === 'ok' ? 'OK' : 'Error'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.rule?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRIGGER_LABELS[log.trigger_type]} → {ACTION_LABELS[log.action_type]}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-0.5">{log.error_message}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.executed_at).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
