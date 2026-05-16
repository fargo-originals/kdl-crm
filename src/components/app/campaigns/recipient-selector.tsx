'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, X, Mail, Globe, GlobeOff, Star, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { isMobilePhone } from '@/lib/wa-link';

type Channel = 'email' | 'whatsapp';

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

interface CrmCompany {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
}

interface Stats {
  total: number;
  withEmail: number;
  phoneOnly: number;
  noWeb: number;
}

interface SelectedRecipient {
  email?: string | null;
  phone?: string | null;
  channel: Channel;
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

async function fetchCrmCompanies(search: string): Promise<CrmCompany[]> {
  const params = new URLSearchParams({ hasEmail: 'true', limit: '300' });
  if (search) params.set('search', search);
  const res = await fetch(`/api/companies?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchProspects(sector: string, neighborhood: string, webFilter: WebFilter): Promise<{ data: Prospect[]; stats: Stats }> {
  const params = new URLSearchParams({ sector, limit: '300' });
  if (neighborhood) params.set('neighborhood', neighborhood);
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
    const json = await res.json().catch(() => ({}));
    const errMsg = typeof json.error === 'string'
      ? json.error
      : json.error
        ? JSON.stringify(json.error)
        : `Error ${res.status} al guardar destinatarios`;
    throw new Error(errMsg);
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
  neighborhood?: string | null;
  onSaved?: (count: number) => void;
  onClose?: () => void;
}

type SourceTab = 'prospects' | 'crm';

export function RecipientSelector({ campaignId, sector, neighborhood, onSaved, onClose }: Props) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<SourceTab>('prospects');
  const [channel, setChannel] = useState<Channel>('email');
  const [search, setSearch] = useState('');
  const [crmSearch, setCrmSearch] = useState('');
  const [webFilter, setWebFilter] = useState<WebFilter>('all');
  const [emailOnly, setEmailOnly] = useState(false);
  const [selected, setSelected] = useState<SelectedRecipient[]>([]);

  const { data: result, isLoading } = useQuery({
    queryKey: ['prospects-selector', sector, neighborhood, webFilter],
    queryFn: () => fetchProspects(sector, neighborhood ?? '', webFilter),
  });

  const { data: crmCompanies = [], isLoading: crmLoading } = useQuery({
    queryKey: ['crm-companies-selector', crmSearch],
    queryFn: () => fetchCrmCompanies(crmSearch),
    enabled: source === 'crm',
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

  // Identificador único: email para canal email, phone para WA
  const selectedKeys = new Set(selected.map(s => s.channel === 'whatsapp' ? s.phone : s.email));

  function prospectVars(p: Prospect) {
    return {
      firstName: p.contact_name ?? p.name.split(' ')[0] ?? '',
      businessName: p.name,
      neighborhood: p.neighborhood ?? '',
      rating: String(p.google_rating ?? ''),
      reviewCount: String(p.google_review_count ?? 0),
      websiteUrl: p.website ?? '',
      category: p.category ?? '',
    };
  }

  function toggleProspect(p: Prospect) {
    if (channel === 'whatsapp') {
      if (!p.phone || !isMobilePhone(p.phone)) return;
      if (selectedKeys.has(p.phone)) {
        setSelected(prev => prev.filter(s => s.phone !== p.phone));
      } else {
        setSelected(prev => [...prev, { phone: p.phone, channel: 'whatsapp', variables: prospectVars(p) }]);
      }
    } else {
      if (!p.email) return;
      if (selectedKeys.has(p.email)) {
        setSelected(prev => prev.filter(s => s.email !== p.email));
      } else {
        setSelected(prev => [...prev, { email: p.email, channel: 'email', variables: prospectVars(p) }]);
      }
    }
  }

  function crmVars(c: CrmCompany) {
    return {
      firstName: c.name.split(' ')[0] ?? '',
      businessName: c.name,
      neighborhood: c.city ?? '',
      rating: '',
      reviewCount: '0',
      websiteUrl: c.website ?? '',
      category: c.industry ?? '',
    };
  }

  function toggleCrmCompany(c: CrmCompany) {
    if (channel === 'whatsapp') {
      if (!c.phone || !isMobilePhone(c.phone)) return;
      if (selectedKeys.has(c.phone)) {
        setSelected(prev => prev.filter(s => s.phone !== c.phone));
      } else {
        setSelected(prev => [...prev, { phone: c.phone, channel: 'whatsapp', variables: crmVars(c) }]);
      }
    } else {
      if (!c.email) return;
      if (selectedKeys.has(c.email)) {
        setSelected(prev => prev.filter(s => s.email !== c.email));
      } else {
        setSelected(prev => [...prev, { email: c.email, channel: 'email', variables: crmVars(c) }]);
      }
    }
  }

  function selectAllVisible() {
    if (source === 'crm') {
      if (channel === 'whatsapp') {
        const toAdd = crmCompanies.filter(c => c.phone && isMobilePhone(c.phone) && !selectedKeys.has(c.phone));
        setSelected(prev => [...prev, ...toAdd.map(c => ({ phone: c.phone!, channel: 'whatsapp' as Channel, variables: crmVars(c) }))]);
      } else {
        const toAdd = crmCompanies.filter(c => c.email && !selectedKeys.has(c.email));
        setSelected(prev => [...prev, ...toAdd.map(c => ({ email: c.email!, channel: 'email' as Channel, variables: crmVars(c) }))]);
      }
      return;
    }
    if (channel === 'whatsapp') {
      const toAdd = filtered.filter(p => p.phone && isMobilePhone(p.phone) && !selectedKeys.has(p.phone!));
      setSelected(prev => [...prev, ...toAdd.map(p => ({ phone: p.phone!, channel: 'whatsapp' as Channel, variables: prospectVars(p) }))]);
    } else {
      const toAdd = filtered.filter(p => p.email && !selectedKeys.has(p.email));
      setSelected(prev => [...prev, ...toAdd.map(p => ({ email: p.email!, channel: 'email' as Channel, variables: prospectVars(p) }))]);
    }
  }

  const WEB_FILTERS: { id: WebFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'none', label: 'Sin web' },
    { id: 'has', label: 'Con web' },
  ];

  const SOURCE_TABS: { id: SourceTab; label: string }[] = [
    { id: 'prospects', label: 'Prospección' },
    { id: 'crm', label: 'Empresas CRM' },
  ];

  const CHANNEL_TABS: { id: Channel; label: string; icon: React.ReactNode }[] = [
    { id: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-3.5 w-3.5" /> },
  ];

  // Conteos según canal activo
  const waCount = source === 'prospects'
    ? filtered.filter(p => p.phone && isMobilePhone(p.phone)).length
    : crmCompanies.filter(c => c.phone && isMobilePhone(c.phone)).length;
  const emailCount = source === 'prospects'
    ? filtered.filter(p => p.email).length
    : crmCompanies.filter(c => c.email).length;
  const availableCount = channel === 'whatsapp' ? waCount : emailCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Seleccionar destinatarios</h3>
          <p className="text-sm text-muted-foreground">
            Elige el canal y selecciona los contactos.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Canal: Email / WhatsApp */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-md border overflow-hidden">
          {CHANNEL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setChannel(t.id); setSelected([]); }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors',
                channel === t.id
                  ? t.id === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {channel === 'whatsapp'
            ? 'Se añaden contactos con móvil español (6xx / 7xx)'
            : 'Se añaden contactos con dirección de email'}
        </span>
      </div>

      {/* Tabs de fuente */}
      <div className="flex rounded-md border overflow-hidden w-fit">
        {SOURCE_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSource(t.id)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium transition-colors',
              source === t.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats de cobertura — solo para prospección */}
      {source === 'prospects' && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-green-50 px-3 py-2">
            <p className="text-lg font-bold text-green-700">{stats.withEmail}</p>
            <p className="text-xs text-green-600 flex items-center justify-center gap-1 mt-0.5">
              <Mail className="h-3 w-3" /> Con email
            </p>
          </div>
          <div className={cn('rounded-lg border px-3 py-2', channel === 'whatsapp' ? 'bg-green-50' : 'bg-muted/50')}>
            <p className={cn('text-lg font-bold', channel === 'whatsapp' ? 'text-green-700' : 'text-muted-foreground')}>{stats.phoneOnly}</p>
            <p className={cn('text-xs flex items-center justify-center gap-1 mt-0.5', channel === 'whatsapp' ? 'text-green-600' : 'text-muted-foreground')}>
              <MessageCircle className="h-3 w-3" /> WhatsApp
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

      {/* Filtros de prospección */}
      {source === 'prospects' && channel === 'email' && (
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
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel izquierdo — disponibles */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{availableCount} {channel === 'whatsapp' ? 'con WhatsApp' : 'con email'} disponible{availableCount !== 1 ? 's' : ''}</span>
              {availableCount > 0 && (
                <button onClick={selectAllVisible} className="text-xs text-primary hover:underline font-normal">
                  Añadir todos
                </button>
              )}
            </CardTitle>
            {source === 'crm' ? (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  className="pl-8"
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                />
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o barrio..."
                  className="pl-8"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {source === 'crm' ? (
              crmLoading ? (
                <div className="flex justify-center py-8 gap-2 text-muted-foreground">
                  <Spinner size="sm" /> Cargando...
                </div>
              ) : crmCompanies.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No hay empresas en el CRM con email configurado.<br />
                  Edita una empresa y añade su dirección de email.
                </p>
              ) : (
                <div className="max-h-80 overflow-auto divide-y">
                  {crmCompanies.map(c => {
                    const crmKey = channel === 'whatsapp' ? c.phone : c.email;
                    const canSelectCrm = channel === 'whatsapp' ? !!(c.phone && isMobilePhone(c.phone)) : !!c.email;
                    const isSelected = !!(crmKey && selectedKeys.has(crmKey));
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCrmCompany(c)}
                        disabled={!canSelectCrm}
                        className={cn(
                          'w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3',
                          canSelectCrm ? 'hover:bg-muted/40' : 'opacity-40 cursor-not-allowed',
                          isSelected && 'opacity-40'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.city && <span className="text-xs text-muted-foreground">{c.city}</span>}
                            {c.website
                              ? <Globe className="h-3 w-3 text-blue-400" />
                              : <GlobeOff className="h-3 w-3 text-orange-400" />}
                            {channel === 'whatsapp'
                              ? <MessageCircle className="h-3 w-3 text-green-600" />
                              : <Mail className="h-3 w-3 text-blue-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {channel === 'whatsapp' ? c.phone : c.email}
                          </p>
                        </div>
                        {isSelected
                          ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          : canSelectCrm
                          ? <UserPlus className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                          : null}
                      </button>
                    );
                  })}
                </div>
              )
            ) : isLoading ? (
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
                  const canSelect = channel === 'whatsapp'
                    ? !!(p.phone && isMobilePhone(p.phone))
                    : !!p.email;
                  const key = channel === 'whatsapp' ? p.phone : p.email;
                  const isSelected = canSelect && selectedKeys.has(key!);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProspect(p)}
                      disabled={!canSelect}
                      className={cn(
                        'w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3',
                        canSelect ? 'hover:bg-muted/40' : 'opacity-40 cursor-not-allowed',
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
                        {channel === 'whatsapp' && p.phone && (
                          <p className="text-xs text-muted-foreground mt-0.5">{p.phone}</p>
                        )}
                      </div>
                      {isSelected
                        ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        : canSelect
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
                {selected.map((r, i) => {
                  const contact = r.channel === 'whatsapp' ? r.phone : r.email;
                  return (
                  <div key={contact ?? i} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.variables.businessName ?? contact}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {r.channel === 'whatsapp'
                          ? <><MessageCircle className="h-3 w-3 text-green-600" />{contact}</>
                          : <><Mail className="h-3 w-3 text-blue-500" />{contact}</>}
                      </p>
                    </div>
                    <button onClick={() => setSelected(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aviso cruzado según canal */}
      {source === 'prospects' && channel === 'email' && stats.phoneOnly > 0 && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <strong>{stats.phoneOnly} contactos</strong> solo tienen móvil — cámbiate al canal <strong>WhatsApp</strong> para añadirlos.
        </p>
      )}
      {source === 'prospects' && channel === 'whatsapp' && stats.withEmail > 0 && waCount < stats.withEmail && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          Algunos contactos solo tienen email — cámbiate al canal <strong>Email</strong> para añadirlos.
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
