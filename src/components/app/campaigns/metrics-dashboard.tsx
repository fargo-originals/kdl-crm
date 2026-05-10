'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mail, Eye, MousePointerClick, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface Metrics {
  campaignId: string;
  name: string;
  status: string;
  sentAt: string | null;
  totals: {
    total: number;
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  rates: {
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  events: Array<{
    type: string;
    created_at: string;
    recipient_id: string;
  }>;
}

const EVENT_LABELS: Record<string, string> = {
  sent: 'Enviado',
  opened: 'Abierto',
  clicked: 'Click en enlace',
  bounced: 'Rebotado',
};

const EVENT_COLORS: Record<string, string> = {
  sent: 'text-blue-600',
  opened: 'text-green-600',
  clicked: 'text-purple-600',
  bounced: 'text-red-600',
};

interface Props {
  campaignId: string;
  live?: boolean;
}

export function MetricsDashboard({ campaignId, live = false }: Props) {
  const { data, isLoading } = useQuery<Metrics>({
    queryKey: ['campaign-metrics', campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/metrics`);
      if (!res.ok) throw new Error('Error al cargar métricas');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: live ? 10000 : false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8 gap-2 text-muted-foreground">
        <Spinner size="sm" /> Cargando métricas...
      </div>
    );
  }

  if (!data) return null;

  const { totals, rates } = data;

  const metricCards = [
    {
      label: 'Enviados',
      value: totals.sent,
      total: totals.total,
      rate: null,
      icon: Mail,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Aperturas',
      value: totals.opened,
      total: totals.sent,
      rate: rates.openRate,
      icon: Eye,
      color: 'text-green-600',
      bg: 'bg-green-50',
      benchmark: '40%',
    },
    {
      label: 'Clics',
      value: totals.clicked,
      total: totals.sent,
      rate: rates.clickRate,
      icon: MousePointerClick,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Rebotes',
      value: totals.bounced,
      total: totals.sent,
      rate: rates.bounceRate,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(m => (
          <Card key={m.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{m.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                  {m.rate !== null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.rate}%
                      {m.benchmark && (
                        <span className="ml-1 text-muted-foreground/60">
                          (objetivo: {m.benchmark})
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className={`rounded-full p-2 ${m.bg}`}>
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
              </div>
              {m.total > 0 && (
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.color.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(100, Math.round((m.value / m.total) * 100))}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projection card */}
      {totals.sent >= 10 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <div className="text-sm">
              <span className="font-medium">Proyección: </span>
              Con {rates.openRate}% de apertura y 20% de conversión desde llamada,
              esta campaña puede generar{' '}
              <span className="font-semibold text-primary">
                ~{Math.max(1, Math.round(totals.sent * (rates.openRate / 100) * 0.05))} cierres
              </span>{' '}
              de {totals.sent} emails enviados.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event timeline */}
      {data.events.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-auto">
              {data.events.map((ev, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className={`text-sm font-medium ${EVENT_COLORS[ev.type] ?? 'text-muted-foreground'}`}>
                    {EVENT_LABELS[ev.type] ?? ev.type}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(ev.created_at), { locale: es, addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
