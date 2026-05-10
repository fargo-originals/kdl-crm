'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mail, Users, BarChart2, Trash2, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CampaignForm } from './campaign-form';
import { SECTOR_LABELS } from '@/lib/campaigns/templates';

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
  status: string;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  created_at: string;
  sent_at?: string;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await fetch('/api/campaigns');
  if (!res.ok) throw new Error('Error al cargar campañas');
  const json = await res.json();
  return json.data ?? [];
}

export function CampaignList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
    refetchInterval: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Error al eliminar');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground gap-2">
        <Spinner size="sm" /> Cargando campañas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campañas de email</h1>
          <p className="text-muted-foreground">Gestiona tus secuencias de outreach por sector.</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva campaña
        </Button>
      </div>

      {showForm && (
        <CampaignForm onClose={() => setShowForm(false)} />
      )}

      {campaigns.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin campañas todavía</p>
            <p className="text-sm mt-1">Crea tu primera campaña con las plantillas del playbook KDL.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Crear campaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map(campaign => {
            const openRate = campaign.sent_count > 0
              ? Math.round((campaign.opened_count / campaign.sent_count) * 100)
              : 0;

            return (
              <Card key={campaign.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="font-semibold hover:underline truncate"
                        >
                          {campaign.name}
                        </Link>
                        <Badge variant={STATUS_VARIANTS[campaign.status] ?? 'secondary'}>
                          {STATUS_LABELS[campaign.status] ?? campaign.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {SECTOR_LABELS[campaign.sector as keyof typeof SECTOR_LABELS] ?? campaign.sector}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {campaign.recipient_count} destinatarios
                        </span>
                        {campaign.sent_count > 0 && (
                          <>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {campaign.sent_count} enviados
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart2 className="h-3.5 w-3.5" />
                              {openRate}% apertura
                            </span>
                          </>
                        )}
                        <span>
                          {campaign.sent_at
                            ? `Enviada ${formatDistanceToNow(new Date(campaign.sent_at), { locale: es, addSuffix: true })}`
                            : `Creada ${formatDistanceToNow(new Date(campaign.created_at), { locale: es, addSuffix: true })}`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar la campaña "${campaign.name}"?`)) {
                              deleteMutation.mutate(campaign.id);
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
