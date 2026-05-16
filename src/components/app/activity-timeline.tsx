'use client';

import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Trash2, MessageSquare, Phone, Mail, Users, CheckSquare, MessageCircle, Plus, ChevronDown } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'whatsapp' | 'task';

interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  content: string | null;
  duration: number | null;
  outcome: string | null;
  created_at: string;
  user: { first_name: string; last_name: string } | null;
}

export interface ActivityFilter {
  lead_id?: string;
  contact_id?: string;
  deal_id?: string;
  company_id?: string;
}

// ── Icons & labels ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ReactNode; color: string }> = {
  note:     { label: 'Nota',     icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-600' },
  call:     { label: 'Llamada',  icon: <Phone className="h-3.5 w-3.5" />,         color: 'bg-green-100 text-green-700' },
  email:    { label: 'Email',    icon: <Mail className="h-3.5 w-3.5" />,          color: 'bg-blue-100 text-blue-700' },
  meeting:  { label: 'Reunión',  icon: <Users className="h-3.5 w-3.5" />,         color: 'bg-violet-100 text-violet-700' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-700' },
  task:     { label: 'Tarea',    icon: <CheckSquare className="h-3.5 w-3.5" />,   color: 'bg-amber-100 text-amber-700' },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  filter: ActivityFilter;
  className?: string;
}

export function ActivityTimeline({ filter, className = '' }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'note' as ActivityType, subject: '', content: '' });

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filter.lead_id) params.set('lead_id', filter.lead_id);
    else if (filter.contact_id) params.set('contact_id', filter.contact_id);
    else if (filter.deal_id) params.set('deal_id', filter.deal_id);
    else if (filter.company_id) params.set('company_id', filter.company_id);
    return params.toString();
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/activities?${buildQuery()}`);
    const data = await res.json();
    setActivities(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!form.subject.trim()) return;
    setSaving(true);
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...filter }),
    });
    setSaving(false);
    setForm({ type: 'note', subject: '', content: '' });
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Actividad ({activities.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          {showForm
            ? <><ChevronDown className="h-3.5 w-3.5 mr-1.5" />Cancelar</>
            : <><Plus className="h-3.5 w-3.5 mr-1.5" />Añadir</>
          }
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex gap-2">
            <Select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as ActivityType }))}
              className="w-32 h-8 text-sm"
            >
              {(Object.entries(TYPE_CONFIG) as [ActivityType, typeof TYPE_CONFIG[ActivityType]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
            <Input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder={form.type === 'note' ? 'Escribe tu nota...' : `Asunto de la ${TYPE_CONFIG[form.type].label.toLowerCase()}...`}
              className="h-8 text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdd()}
            />
          </div>
          {form.type !== 'note' && (
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Detalles adicionales (opcional)..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !form.subject.trim()}>
              {saving ? <Spinner size="sm" tone="current" className="mr-1.5" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Sin actividad registrada todavía
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-px bg-border" />

          {activities.map((act, idx) => {
            const cfg = TYPE_CONFIG[act.type] ?? TYPE_CONFIG.note;
            const user = act.user;
            return (
              <div key={act.id} className={`relative flex gap-3 pb-5 ${idx === activities.length - 1 ? 'pb-0' : ''}`}>
                {/* Icon dot */}
                <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{act.subject}</p>
                      {act.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{act.content}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(act.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${cfg.color}`}>
                      {cfg.icon}<span>{cfg.label}</span>
                    </span>
                    <span>·</span>
                    {user && <span>{user.first_name} {user.last_name}</span>}
                    <span>·</span>
                    <span>{formatRelative(act.created_at)}</span>
                    {act.duration && <><span>·</span><span>{act.duration} min</span></>}
                    {/* Delete — always visible on hover via group */}
                    <button
                      onClick={() => handleDelete(act.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
