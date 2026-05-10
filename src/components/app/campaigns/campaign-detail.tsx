'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Users, Eye, Settings2, BarChart2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { RecipientSelector } from './recipient-selector';
import { MetricsDashboard } from './metrics-dashboard';
import { SECTOR_LABELS, TEMPLATE_LABELS } from '@/lib/campaigns/templates';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sending: 'Enviando...',
  sent: 'Enviada',
  archived: 'Archivada',
};

const STATUS_VARIANTS: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  draft: 'secondary',
  sending: 'warning',
  sent: 'success',
  archived: 'secondary',
};

interface Campaign {
  id: string;
  name: string;
  sector: string;
  tono: string;
  template_type: string;
  subject: string;
  body_html: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  recipients: Array<{
    id: string;
    email: string;
    status: string;
    sent_at: string | null;
    opened_at: string | null;
    variables: Record<string, string> | null;
  }>;
}

type Tab = 'recipients' | 'preview' | 'metrics';

interface Props {
  campaignId: string;
}

export function CampaignDetail({ campaignId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('recipients');
  const [showSelector, setShowSelector] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: (q) => q.state.data?.status === 'sending' ? 3000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al enviar');
      return json;
    },
    onSuccess: () => {
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 gap-2 text-muted-foreground">
        <Spinner size="sm" /> Cargando campaña...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Campaña no encontrada.</p>
        <Link href="/campaigns" className="text-primary hover:underline text-sm mt-2 inline-block">
          ← Volver a campañas
        </Link>
      </div>
    );
  }

  const isDraft = campaign.status === 'draft';
  const isSent = campaign.status === 'sent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={STATUS_VARIANTS[campaign.status] ?? 'secondary'}>
              {STATUS_LABELS[campaign.status] ?? campaign.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {SECTOR_LABELS[campaign.sector as keyof typeof SECTOR_LABELS] ?? campaign.sector}
            {' · '}
            {TEMPLATE_LABELS[campaign.template_type as keyof typeof TEMPLATE_LABELS] ?? campaign.template_type}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => setShowSelector(v => !v)}>
                <Users className="h-4 w-4 mr-2" />
                {campaign.recipient_count > 0 ? `${campaign.recipient_count} destinatarios` : 'Añadir destinatarios'}
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={campaign.recipient_count === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar campaña
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Recipient selector */}
      {showSelector && isDraft && (
        <Card>
          <CardContent className="pt-6">
            <RecipientSelector
              campaignId={campaignId}
              sector={campaign.sector}
              onSaved={(count) => {
                queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
                setShowSelector(false);
              }}
              onClose={() => setShowSelector(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Confirm send modal */}
      {showConfirm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <Send className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">¿Confirmas el envío?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Se enviarán <span className="font-medium">{campaign.recipient_count} emails</span> ahora mismo via Resend.
                  Esta acción no se puede deshacer.
                </p>
                {sendMutation.isError && (
                  <p className="text-sm text-destructive mt-2">{(sendMutation.error as Error).message}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                    : 'Sí, enviar'}
                </Button>
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={sendMutation.isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {([
            { id: 'recipients', label: 'Destinatarios', icon: Users },
            { id: 'preview', label: 'Vista previa del email', icon: Eye },
            { id: 'metrics', label: 'Métricas', icon: BarChart2 },
          ] as { id: Tab; label: string; icon: typeof Users }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'recipients' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {campaign.recipients.length > 0
                ? `${campaign.recipients.length} destinatarios`
                : 'Sin destinatarios'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {campaign.recipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Usa el botón "Añadir destinatarios" para seleccionar prospectos.</p>
              </div>
            ) : (
              <div className="divide-y max-h-96 overflow-auto">
                {campaign.recipients.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(r.variables as Record<string, string>)?.businessName ?? r.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                    <Badge
                      variant={
                        r.status === 'opened' || r.status === 'clicked'
                          ? 'success'
                          : r.status === 'sent'
                          ? 'secondary'
                          : r.status === 'bounced'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {r.status === 'pending' ? 'Pendiente'
                        : r.status === 'sent' ? 'Enviado'
                        : r.status === 'opened' ? 'Abierto'
                        : r.status === 'clicked' ? 'Click'
                        : r.status === 'bounced' ? 'Rebotado'
                        : r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Asunto: <span className="font-normal">{campaign.subject}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-md bg-white p-4 max-h-[500px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: campaign.body_html }}
            />
          </CardContent>
        </Card>
      )}

      {tab === 'metrics' && (
        <MetricsDashboard campaignId={campaignId} live={campaign.status === 'sending'} />
      )}
    </div>
  );
}
