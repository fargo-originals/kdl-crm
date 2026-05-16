'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { TRIGGER_LABELS, ACTION_LABELS } from '@/lib/automations/types';
import type { TriggerType, ActionType } from '@/lib/automations/types';
import Link from 'next/link';

interface Rule {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  created_at: string;
}

const TRIGGERS: { value: TriggerType; label: string }[] = [
  { value: 'lead_created', label: 'Lead creado' },
  { value: 'lead_no_response', label: 'Lead sin respuesta' },
  { value: 'deal_stage_change', label: 'Deal cambia de etapa' },
  { value: 'campaign_opened', label: 'Email de campaña abierto' },
  { value: 'appointment_confirmed', label: 'Cita confirmada' },
];

const ACTIONS: { value: ActionType; label: string }[] = [
  { value: 'send_email', label: 'Enviar email' },
  { value: 'send_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'create_task', label: 'Crear tarea' },
  { value: 'update_lead_status', label: 'Cambiar estado del lead' },
  { value: 'notify_slack', label: 'Notificar por Slack' },
];

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost'];

const emptyForm = {
  name: '',
  trigger_type: 'lead_created' as TriggerType,
  trigger_config: {} as Record<string, string>,
  action_type: 'create_task' as ActionType,
  action_config: {} as Record<string, string>,
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/settings/automations');
    const data = await res.json();
    setRules(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    await fetch('/api/settings/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm(emptyForm);
    load();
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/settings/automations/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    load();
  }

  async function deleteRule(id: string) {
    await fetch(`/api/settings/automations/${id}`, { method: 'DELETE' });
    load();
  }

  function setTriggerConfig(key: string, value: string) {
    setForm(f => ({ ...f, trigger_config: { ...f.trigger_config, [key]: value } }));
  }

  function setActionConfig(key: string, value: string) {
    setForm(f => ({ ...f, action_config: { ...f.action_config, [key]: value } }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automatizaciones</h1>
          <p className="text-muted-foreground">Reglas automáticas que se ejecutan cuando ocurre un evento</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/automations/logs">
            <Button variant="outline" size="sm">Ver logs</Button>
          </Link>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva regla
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Zap className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No hay automatizaciones todavía</p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Crear primera regla</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={rule.is_active ? '' : 'opacity-60'}>
              <CardContent className="flex items-center gap-4 py-4">
                <Zap className={`h-5 w-5 shrink-0 ${rule.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{TRIGGER_LABELS[rule.trigger_type]}</span>
                    {' → '}
                    <span className="font-medium text-foreground">{ACTION_LABELS[rule.action_type]}</span>
                  </p>
                </div>
                <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                  {rule.is_active ? 'Activa' : 'Pausada'}
                </Badge>
                <button
                  onClick={() => toggleActive(rule)}
                  className="text-muted-foreground hover:text-foreground"
                  title={rule.is_active ? 'Pausar' : 'Activar'}
                >
                  {rule.is_active
                    ? <XCircle className="h-4 w-4" />
                    : <CheckCircle2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva regla de automatización</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Crear tarea al recibir lead"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Trigger */}
            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cuando</p>
              <div className="space-y-1.5">
                <Label>Evento</Label>
                <Select
                  value={form.trigger_type}
                  onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value as TriggerType, trigger_config: {} }))}
                >
                  {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              {/* Trigger config fields */}
              {form.trigger_type === 'lead_no_response' && (
                <div className="space-y-1.5">
                  <Label>Días sin respuesta</Label>
                  <Input
                    type="number" min="1" placeholder="3"
                    value={String(form.trigger_config.days ?? '')}
                    onChange={e => setTriggerConfig('days', e.target.value)}
                  />
                </div>
              )}
              {form.trigger_type === 'deal_stage_change' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>De etapa (opcional)</Label>
                    <Input placeholder="New" value={String(form.trigger_config.from_stage ?? '')}
                      onChange={e => setTriggerConfig('from_stage', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>A etapa (opcional)</Label>
                    <Input placeholder="Qualified" value={String(form.trigger_config.to_stage ?? '')}
                      onChange={e => setTriggerConfig('to_stage', e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entonces</p>
              <div className="space-y-1.5">
                <Label>Acción</Label>
                <Select
                  value={form.action_type}
                  onChange={e => setForm(f => ({ ...f, action_type: e.target.value as ActionType, action_config: {} }))}
                >
                  {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </div>
              {/* Action config fields */}
              {form.action_type === 'create_task' && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Título de la tarea</Label>
                    <Input placeholder="Llamar a {{full_name}}"
                      value={String(form.action_config.title ?? '')}
                      onChange={e => setActionConfig('title', e.target.value)} />
                    <p className="text-xs text-muted-foreground">Usa {'{{full_name}}'}, {'{{business_name}}'}, {'{{email}}'} como variables</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vence en (días)</Label>
                    <Input type="number" min="0" placeholder="1"
                      value={String(form.action_config.due_offset_days ?? '')}
                      onChange={e => setActionConfig('due_offset_days', e.target.value)} />
                  </div>
                </div>
              )}
              {(form.action_type === 'send_email') && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Asunto</Label>
                    <Input placeholder="Seguimiento — {{business_name}}"
                      value={String(form.action_config.subject ?? '')}
                      onChange={e => setActionConfig('subject', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cuerpo del mensaje</Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                      placeholder="Hola {{full_name}}, queremos hacer seguimiento..."
                      value={String(form.action_config.body ?? '')}
                      onChange={e => setActionConfig('body', e.target.value)}
                    />
                  </div>
                </div>
              )}
              {form.action_type === 'send_whatsapp' && (
                <div className="space-y-1.5">
                  <Label>Mensaje</Label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                    placeholder="Hola {{full_name}} 👋 soy Felipe de Kento Dev Lab..."
                    value={String(form.action_config.message ?? '')}
                    onChange={e => setActionConfig('message', e.target.value)}
                  />
                </div>
              )}
              {form.action_type === 'update_lead_status' && (
                <div className="space-y-1.5">
                  <Label>Nuevo estado</Label>
                  <Select
                    value={String(form.action_config.status ?? 'contacted')}
                    onChange={e => setActionConfig('status', e.target.value)}
                  >
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
              )}
              {form.action_type === 'notify_slack' && (
                <div className="space-y-1.5">
                  <Label>Mensaje</Label>
                  <Input placeholder="Nuevo lead: {{full_name}} ({{business_name}})"
                    value={String(form.action_config.message ?? '')}
                    onChange={e => setActionConfig('message', e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? <><Spinner size="sm" tone="current" className="mr-2" />Guardando...</> : 'Crear regla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
