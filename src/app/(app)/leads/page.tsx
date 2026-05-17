'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MessageCircle, Mail, Phone, Clock, LayoutList, Columns, Trash2, UserCheck, Download } from 'lucide-react';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  preferred_channel: string;
  status: string;
  created_at: string;
  assigned_user: { first_name: string; last_name: string } | null;
}

const STATUSES = [
  { id: 'new',       label: 'Nuevo',       color: '#3B82F6', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { id: 'contacted', label: 'Contactado',  color: '#F59E0B', bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { id: 'qualified', label: 'Cualificado', color: '#8B5CF6', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { id: 'scheduled', label: 'Reunión',     color: '#F97316', bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  { id: 'won',       label: 'Ganado',      color: '#16A34A', bg: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { id: 'lost',      label: 'Perdido',     color: '#DC2626', bg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
] as const;

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.id, s]));

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-3 w-3 text-green-500" />,
  email:    <Mail className="h-3 w-3 text-blue-500" />,
  phone:    <Phone className="h-3 w-3 text-muted-foreground" />,
};

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkBar({
  count, onStatus, onDelete, onExport, onClear
}: {
  count: number;
  onStatus: (s: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const [showStatus, setShowStatus] = useState(false);
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border bg-card shadow-lg px-4 py-2.5">
      <span className="text-sm font-medium text-muted-foreground mr-1">{count} seleccionado{count !== 1 ? 's' : ''}</span>
      <div className="relative">
        <Button size="sm" variant="outline" onClick={() => setShowStatus(v => !v)}>
          <UserCheck className="h-3.5 w-3.5 mr-1.5" />Cambiar estado
        </Button>
        {showStatus && (
          <div className="absolute bottom-full mb-2 left-0 rounded-lg border bg-card shadow-lg py-1 w-44 z-10">
            {STATUSES.map(s => (
              <button key={s.id} onClick={() => { onStatus(s.id); setShowStatus(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onExport}>
        <Download className="h-3.5 w-3.5 mr-1.5" />Exportar
      </Button>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Eliminar
      </Button>
      <button onClick={onClear} className="ml-1 text-muted-foreground hover:text-foreground text-sm">✕</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    // Fetch all for kanban (no pagination limit needed with reasonable data)
    params.set('limit', '500');
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [view]);

  // ── Drag & drop (kanban) ────────────────────────────────────────────────────

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId;
    if (newStatus === result.source.droppableId) return;

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  // ── Selection helpers ───────────────────────────────────────────────────────

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(prev => prev.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));
  }

  // ── Bulk actions ────────────────────────────────────────────────────────────

  async function bulkStatus(status: string) {
    await fetch('/api/leads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], action: 'update_status', value: status }) });
    setSelected(new Set()); load();
  }

  async function bulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} lead${selected.size !== 1 ? 's' : ''}?`)) return;
    await fetch('/api/leads/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], action: 'delete' }) });
    setSelected(new Set()); load();
  }

  async function bulkExport() {
    const sel = leads.filter(l => selected.has(l.id));
    const headers = ['Nombre', 'Email', 'Teléfono', 'Empresa', 'Estado', 'Canal', 'Fecha'];
    const rows = sel.map(l => [l.full_name, l.email, l.phone ?? '', l.business_name ?? '', l.status, l.preferred_channel, new Date(l.created_at).toLocaleDateString('es-ES')]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setSelected(new Set());
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function LeadCard({ lead, draggable = false }: { lead: Lead; draggable?: boolean }) {
    const st = STATUS_MAP[lead.status as keyof typeof STATUS_MAP];
    return (
      <Link href={`/leads/${lead.id}`}
        className={cn('block rounded-lg border bg-card p-3 text-sm hover:shadow-md transition-shadow', draggable && 'cursor-grab active:cursor-grabbing')}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-medium leading-snug truncate">{lead.full_name}</p>
          {st && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${st.bg}`}>{st.label}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {CHANNEL_ICONS[lead.preferred_channel]}
          <span className="truncate">{lead.business_name ?? lead.email}</span>
        </div>
        {lead.assigned_user && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            → {lead.assigned_user.first_name} {lead.assigned_user.last_name}
          </p>
        )}
      </Link>
    );
  }

  const filteredLeads = statusFilter ? leads.filter(l => l.status === statusFilter) : leads;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{total} leads en total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter (list mode only) */}
          {view === 'list' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Todos los estados</option>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}
          {/* Select all (list mode) */}
          {view === 'list' && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.size === filteredLeads.length && filteredLeads.length > 0 ? 'Deselect.' : 'Sel. todos'}
            </Button>
          )}
          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button onClick={() => setView('list')}
              className={cn('px-3 py-2 text-sm flex items-center gap-1.5 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>
              <LayoutList className="h-3.5 w-3.5" /><span className="hidden sm:inline">Lista</span>
            </button>
            <button onClick={() => setView('kanban')}
              className={cn('px-3 py-2 text-sm flex items-center gap-1.5 transition-colors', view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}>
              <Columns className="h-3.5 w-3.5" /><span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? <PageSpinner message="Cargando..." /> : (

        view === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="space-y-2">
            {filteredLeads.map(lead => {
              const isSelected = selected.has(lead.id);
              const st = STATUS_MAP[lead.status as keyof typeof STATUS_MAP];
              return (
                <div key={lead.id}
                  className={cn('flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors', isSelected && 'ring-2 ring-primary')}>
                  {/* Checkbox */}
                  <div onClick={e => toggleSelect(lead.id, e)} className="shrink-0 cursor-pointer">
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary')}>
                      {isSelected && <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5L2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                  </div>
                  <Link href={`/leads/${lead.id}`} className="flex-1 flex items-center justify-between gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{lead.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {CHANNEL_ICONS[lead.preferred_channel]}
                        <span className="truncate">{lead.email}</span>
                        {lead.business_name && <span className="truncate">· {lead.business_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-muted-foreground hidden md:block">
                        {lead.assigned_user ? `${lead.assigned_user.first_name} ${lead.assigned_user.last_name}` : 'Sin asignar'}
                      </span>
                      {st && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.bg}`}>{st.label}</span>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(lead.created_at).toLocaleDateString('es')}
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
            {filteredLeads.length === 0 && (
              <p className="text-center py-12 text-muted-foreground">No hay leads que mostrar</p>
            )}
          </div>
        ) : (
          /* ── KANBAN VIEW ── */
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {STATUSES.map(col => {
                const colLeads = leads.filter(l => l.status === col.id);
                return (
                  <div key={col.id} className="min-w-[240px] flex-shrink-0">
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-sm font-medium">{col.label}</span>
                      <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 ml-auto">{colLeads.length}</span>
                    </div>
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={cn('min-h-[80px] rounded-lg p-2 space-y-2 transition-colors', snapshot.isDraggingOver ? 'bg-accent/60' : 'bg-muted/30')}>
                          {colLeads.map((lead, idx) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                              {(prov, snap) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                  className={snap.isDragging ? 'rotate-1 shadow-lg' : ''}>
                                  <LeadCard lead={lead} draggable />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {colLeads.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-center text-xs text-muted-foreground py-4">Sin leads</p>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onStatus={bulkStatus}
          onDelete={bulkDelete}
          onExport={bulkExport}
          onClear={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
