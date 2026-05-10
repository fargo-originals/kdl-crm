'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, X, Mail, Globe, GlobeOff, Star, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Prospect {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  neighborhood: string | null;
  category: string | null;
  google_rating: string | null;
  google_review_count: number | null;
  website: string | null;
  contact_name: string | null;
}

interface Stats {
  total: number;
  withEmail: number;
  phoneOnly: number;
  noWeb: number;
}

interface SelectedRecipient {
  email: string;
  contactId?: string;
  variables: {
    firstName?: string;
    businessName?: string;
    neighborhood?: string;
    rating?: string;
    reviewCount?: string;
    websiteUrl?: string;
    category?: string;
  };
}

type WebFilter = 'all' | 'none' | 'has';

async function fetchProspects(sector: string, webFilter: WebFilter): Promise<{ data: Prospect[]; stats: Stats }> {
  const params = new URLSearchParams({ sector, limit: '300' });
  if (webFilter === 'none') params.set('web', 'none');
  if (webFilter === 'has') params.set('web', 'has');
  const res = await fetch(`/api/prospecting/results?${params}`);
  if (!res.ok) return { data: [], stats: { total: 0, withEmail: 0, phoneOnly: 0, noWeb: 0 } };
  return res.json();
}

async function saveRecipients(campaignId: string, recipients: SelectedRecipient[]) {
  const res = await fetch(`/api/campaigns/${campaignId}/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error ?? 'Error al guardar');
  }
  return res.json();
}

function channelIcon(p: Prospect) {
  if (p.email) return <Mail className="h-3 w-3 text-green-600" />;
  const digits = (p.phone ?? '').replace(/\D/g, '');
  const local = digits.startsWith('34') ? digits.slice(2) : digits;
  if (local.startsWith('6') || local.startsWith('7'))
    return <MessageCircle className="h-3 w-3 text-emerald-500" />;
  if (p.phone) return <Phone className="h-3 w-3 text-muted-foreground" />;
  return <span className="h-3 w-3 text-muted-foreground/30">—</span>;
}

interface Props {
  campaignId: string;
  sector: string;
  onSaved?: (count: number) => void;
  onClose?: () => void;
}

export function RecipientSelector({ campaignId, sector, onSaved, onClose }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [webFilter, setWebFilter] = useState<WebFilter>('all');
  const [emailOnly, setEmailOnly] = useState(false);
  const [selected, setSelected] = useState<SelectedRecipient[]>([]);

  const { data: result, isLoading } = useQuery({
    queryKey: ['prospects-selector', sector, webFilter],
    queryFn: () => fetchProspects(sector, webFilter),
  });

  const prospects = result?.data ?? [];
  const stats = result?.stats ?? { total: 0, withEmail: 0, phoneOnly: 0, noWeb: 0 };

  const saveMutation = useMutation({
    mutationFn: () => saveRecipients(campaignId, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      onSaved?.(selected.length);
      onClose?.();
    },
  });

  const filtered = prospects.filter(p => {
    if (emailOnly && !p.email) return false;
    if (search === '') return true;
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.neighborhood ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const selectedEmails = new Set(selected.map(s => s.email));

  function toggleProspect(p: Prospect) {
    if (!p.email) return; // solo se puede añadir los que tienen email por ahora
    if (selectedEmails.has(p.email)) {
      setSelected(prev => prev.filter(s => s.email !== p.email));
    } else {
      setSelected(prev => [...prev, {
        email: p.email!,
        variables: {
          firstName: p.contact_name ?? p.name.split(' ')[0] ?? '',
          businessName: p.name,
          neighborhood: p.neighborhood ?? '',
          rating: p.google_rating ?? '',
          reviewCount: String(p.google_review_count ?? 0),
          websiteUrl: p.website ?? '',
          category: p.category ?? '',
        },
      }]);
    }
  }

  function selectAllVisible() {
    const toAdd = filtered.filter(p => p.email && !selectedEmails.has(p.email!));
    setSelected(prev => [...prev, ...toAdd.map(p => ({
      email: p.email!,
      variables: {
        firstName: p.contact_name ?? p.name.split(' ')[0] ?? '',
        businessName: p.name,
        neighborhood: p.neighborhood ?? '',
        rating: p.google_rating ?? '',
        reviewCount: String(p.google_review_count ?? 0),
        websiteUrl: p.website ?? '',
        category: p.category ?? '',
      },
    }))]);
  }

  const WEB_FILTERS: { id: WebFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'none', label: 'Sin web' },
    { id: 'has', label: 'Con web' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Seleccionar destinatarios</h3>
          <p className="text-sm text-muted-foreground">
            Empresas aprobadas en prospección. Solo se pueden añadir las que tienen email.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Stats de cobertura */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-green-50 px-3 py-2">
            <p className="text-lg font-bold text-green-700">{stats.withEmail}</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-0.5">
              <Mail className="h-3 w-3" /> Con email
            </p>
          </div>
          <div className="rounded-lg border bg-muted/50 px-3 py-2">
            <p className="text-lg font-bold text-muted-foreground">{stats.phoneOnly}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> Solo teléfono
            </p>
          </div>
          <div className="rounded-lg border bg-orange-50 px-3 py-2">
            <p className="text-lg font-bold text-orange-700">{stats.noWeb}</p>
            <p className="text-xs text-orange-600 flex items-center justify-center gap-1 mt-0.5">
              <GlobeOff className="h-3 w-3" /> Sin web
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border overflow-hidden">
          {WEB_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setWebFilter(f.id)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                webFilter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={emailOnly}
            onChange={e => setEmailOnly(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Solo con email
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel izquierdo — disponibles */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{filtered.filter(p => p.email).length} con email disponible</span>
              {filtered.some(p => p.email) && (
                <button onClick={selectAllVisible} className="text-xs text-primary hover:underline font-normal">
                  Añadir todos
                </button>
              )}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o barrio..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8 gap-2 text-muted-foreground">
                <Spinner size="sm" /> Cargando...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No hay empresas aprobadas con este filtro.<br />
                Aprueba prospectos en el módulo de Prospección.
              </p>
            ) : (
              <div className="max-h-80 overflow-auto divide-y">
                {filtered.map(p => {
                  const hasEmail = !!p.email;
                  const isSelected = hasEmail && selectedEmails.has(p.email!);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProspect(p)}
                      disabled={!hasEmail}
                      className={cn(
                        'w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3',
                        hasEmail ? 'hover:bg-muted/40' : 'opacity-40 cursor-not-allowed',
                        isSelected && 'opacity-40'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.neighborhood && (
                            <span className="text-xs text-muted-foreground">{p.neighborhood}</span>
                          )}
                          {p.google_rating && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-600">
                              <Star className="h-3 w-3" /> {p.google_rating}
                            </span>
                          )}
                          {p.website
                            ? <Globe className="h-3 w-3 text-blue-400" />
                            : <GlobeOff className="h-3 w-3 text-orange-400" />}
                          {channelIcon(p)}
                        </div>
                      </div>
                      {isSelected
                        ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        : hasEmail
                        ? <UserPlus className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        : null}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel derecho — seleccionados */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Seleccionados ({selected.length})</span>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-xs text-destructive hover:underline font-normal">
                  Limpiar
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selected.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                <Mail className="h-8 w-8 mb-2 opacity-30" />
                Ningún destinatario seleccionado
              </div>
            ) : (
              <div className="max-h-80 overflow-auto divide-y">
                {selected.map(r => (
                  <div key={r.email} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.variables.businessName ?? r.email}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                      {r.variables.websiteUrl
                        ? <span className="text-xs text-blue-500 flex items-center gap-1"><Globe className="h-3 w-3" /> Con web</span>
                        : <span className="text-xs text-orange-500 flex items-center gap-1"><GlobeOff className="h-3 w-3" /> Sin web</span>}
                    </div>
                    <button onClick={() => setSelected(prev => prev.filter(s => s.email !== r.email))}
                      className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aviso sobre teléfono-solo */}
      {stats.phoneOnly > 0 && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <strong>{stats.phoneOnly} empresas</strong> solo tienen teléfono fijo o WhatsApp — no se pueden incluir en campañas de email.
          Para contactarlas por WhatsApp, usa el módulo de Prospección directamente.
        </p>
      )}

      <div className="flex gap-3 items-center">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={selected.length === 0 || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <><Spinner size="sm" tone="current" className="mr-2" /> Guardando...</>
            : `Guardar ${selected.length} destinatarios`}
        </Button>
        {onClose && <Button variant="outline" onClick={onClose}>Cancelar</Button>}
        {saveMutation.isError && (
          <p className="text-sm text-destructive">{(saveMutation.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
