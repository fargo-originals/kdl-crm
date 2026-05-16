'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Webhook, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react';

const ALL_EVENTS = [
  { value: 'lead.created',         label: 'Lead creado' },
  { value: 'lead.status_changed',  label: 'Lead: cambio de estado' },
  { value: 'deal.stage_changed',   label: 'Deal: cambio de etapa' },
  { value: 'deal.won',             label: 'Deal ganado' },
  { value: 'quote.accepted',       label: 'Presupuesto aceptado' },
  { value: 'quote.rejected',       label: 'Presupuesto rechazado' },
  { value: 'appointment.confirmed',label: 'Cita confirmada' },
];

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] });
  const [newSecret, setNewSecret] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/settings/webhooks');
    const data = await res.json();
    setHooks(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleEvent(ev: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.url || form.events.length === 0) return;
    setSaving(true);
    const res = await fetch('/api/settings/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setNewSecret(data.secret ?? '');
      setForm({ name: '', url: '', events: [] });
      load();
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/settings/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este webhook?')) return;
    await fetch(`/api/settings/webhooks/${id}`, { method: 'DELETE' });
    load();
  }

  function copySecret() {
    navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">Integra KDL CRM con Zapier, Make, n8n o cualquier herramienta externa</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo webhook</Button>
      </div>

      {/* Secret reveal after creation */}
      {newSecret && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 space-y-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              ⚠️ Guarda este secret — solo se muestra una vez
            </p>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-background border px-3 py-2 text-xs font-mono break-all">{newSecret}</code>
              <Button size="sm" variant="outline" onClick={copySecret}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewSecret('')}>Entendido, ocultarlo</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : hooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Webhook className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay webhooks configurados</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Los webhooks envían datos en tiempo real a Zapier, Make, n8n u otras herramientas cuando ocurre un evento en el CRM.
            </p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Crear primer webhook</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {hooks.map(h => (
                <div key={h.id} className="flex items-start gap-4 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{h.name}</p>
                      <Badge variant={h.is_active ? 'success' : 'secondary'} className="text-xs">
                        {h.is_active ? 'Activo' : 'Pausado'}
                      </Badge>
                      {h.last_status_code && (
                        <Badge variant={h.last_status_code < 300 ? 'outline' : 'destructive'} className="text-xs font-mono">
                          {h.last_status_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{h.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {h.events.map(ev => (
                        <span key={ev} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {ALL_EVENTS.find(e => e.value === ev)?.label ?? ev}
                        </span>
                      ))}
                    </div>
                    {h.last_triggered_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Último disparo: {new Date(h.last_triggered_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(h.id, h.is_active)} title={h.is_active ? 'Pausar' : 'Activar'}
                      className="text-muted-foreground hover:text-foreground p-1">
                      {h.is_active
                        ? <ToggleRight className="h-5 w-5 text-green-600" />
                        : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button onClick={() => handleDelete(h.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo webhook</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Notificar Zapier — nuevo lead"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>URL de destino *</Label>
              <Input placeholder="https://hooks.zapier.com/..."
                value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Eventos a escuchar *</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {ALL_EVENTS.map(ev => (
                  <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                    />
                    <span className="font-mono text-xs text-muted-foreground">{ev.value}</span>
                    <span>{ev.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}
              disabled={saving || !form.name.trim() || !form.url || form.events.length === 0}>
              {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
              Crear webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
