'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Spinner, PageSpinner } from '@/components/ui/spinner';
import { Plus, Trash2, Mail, MessageCircle, ArrowLeft, Users } from 'lucide-react';
import type { Cadence, CadenceStep } from '@/lib/cadences/types';
import { CHANNEL_TEMPLATE_KEYS } from '@/lib/cadences/types';
import Link from 'next/link';

interface Enrollment {
  id: string;
  status: 'active' | 'paused' | 'completed';
  enrolled_at: string;
  variables: Record<string, string>;
  executions: Array<{
    status: string;
    scheduled_for: string;
    step: { position: number; channel: string; day_offset: number };
  }>;
}

const STEP_EMPTY = {
  day_offset: 0,
  channel: 'email' as 'email' | 'whatsapp',
  template_key: '',
  subject: '',
  message: '',
};

export default function CadenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [open, setOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stepForm, setStepForm] = useState(STEP_EMPTY);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollResults, setEnrollResults] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [enrolling, setEnrolling] = useState(false);

  async function load() {
    const [cadRes, enrRes] = await Promise.all([
      fetch(`/api/cadences/${id}`).then(r => r.json()),
      fetch(`/api/cadences/enrollments?cadence_id=${id}`).then(r => r.json()),
    ]);
    setCadence(cadRes);
    setEnrollments(Array.isArray(enrRes) ? enrRes : []);
  }

  useEffect(() => { load(); }, [id]);

  async function addStep() {
    if (!stepForm.template_key && !stepForm.message && !stepForm.subject) return;
    setSaving(true);
    await fetch(`/api/cadences/${id}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stepForm),
    });
    setSaving(false);
    setOpen(false);
    setStepForm(STEP_EMPTY);
    load();
  }

  async function deleteStep(stepId: string) {
    await fetch(`/api/cadences/${id}/steps/${stepId}`, { method: 'DELETE' });
    load();
  }

  async function searchLeads(q: string) {
    if (!q) { setEnrollResults([]); return; }
    const res = await fetch(`/api/leads?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setEnrollResults((data.leads ?? []).slice(0, 5));
  }

  async function enrollLead(leadId: string) {
    setEnrolling(true);
    await fetch(`/api/cadences/${id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId }),
    });
    setEnrolling(false);
    setEnrollOpen(false);
    setEnrollSearch('');
    setEnrollResults([]);
    load();
  }

  const templateKeys = CHANNEL_TEMPLATE_KEYS[stepForm.channel];

  if (!cadence) return <PageSpinner />;

  const steps = (cadence.steps ?? []).sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/settings/cadences" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{cadence.name}</h1>
          {cadence.description && <p className="text-muted-foreground text-sm">{cadence.description}</p>}
        </div>
        <Badge variant={cadence.is_active ? 'success' : 'secondary'}>
          {cadence.is_active ? 'Activa' : 'Pausada'}
        </Badge>
      </div>

      {/* Steps */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Pasos ({steps.length})</CardTitle>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Añadir paso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {steps.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
              <p className="text-sm">Sin pasos todavía</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Añadir primer paso
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.channel === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {step.channel === 'whatsapp'
                        ? <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                        : <Mail className="h-3.5 w-3.5 text-blue-600" />}
                      <span className="text-sm font-medium capitalize">{step.channel}</span>
                      <Badge variant="outline" className="text-xs">Día {step.day_offset}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.template_key
                        ? [...CHANNEL_TEMPLATE_KEYS.email, ...CHANNEL_TEMPLATE_KEYS.whatsapp]
                            .find(t => t.value === step.template_key)?.label ?? step.template_key
                        : step.subject ?? step.message ?? 'Mensaje personalizado'}
                    </p>
                  </div>
                  <button onClick={() => deleteStep(step.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Enrolados ({enrollments.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Enrolar lead
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {enrollments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nadie enrolado todavía
            </p>
          ) : (
            <div className="divide-y max-h-64 overflow-auto">
              {enrollments.map(e => {
                const sentCount = e.executions?.filter(x => x.status === 'sent').length ?? 0;
                const totalCount = e.executions?.length ?? 0;
                return (
                  <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{e.variables?.businessName ?? e.variables?.firstName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sentCount}/{totalCount} pasos enviados · {new Date(e.enrolled_at).toLocaleDateString('es')}
                      </p>
                    </div>
                    <Badge variant={
                      e.status === 'active' ? 'success'
                      : e.status === 'paused' ? 'warning'
                      : 'secondary'
                    }>
                      {e.status === 'active' ? 'Activo' : e.status === 'paused' ? 'Pausado' : 'Completado'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add step dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Añadir paso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select
                  value={stepForm.channel}
                  onChange={e => setStepForm(f => ({ ...f, channel: e.target.value as 'email' | 'whatsapp', template_key: '' }))}
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Día de envío</Label>
                <Input type="number" min="0"
                  placeholder={`0 = ahora, 7 = semana`}
                  value={stepForm.day_offset}
                  onChange={e => setStepForm(f => ({ ...f, day_offset: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Plantilla</Label>
              <Select
                value={stepForm.template_key}
                onChange={e => setStepForm(f => ({ ...f, template_key: e.target.value }))}
              >
                <option value="">Personalizado</option>
                {templateKeys.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>

            {!stepForm.template_key && stepForm.channel === 'email' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Asunto</Label>
                  <Input placeholder="Asunto del email"
                    value={stepForm.subject}
                    onChange={e => setStepForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Mensaje</Label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                    placeholder="Cuerpo del email..."
                    value={stepForm.message}
                    onChange={e => setStepForm(f => ({ ...f, message: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {!stepForm.template_key && stepForm.channel === 'whatsapp' && (
              <div className="space-y-1.5">
                <Label>Mensaje</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
                  placeholder="Hola {{firstName}} 👋..."
                  value={stepForm.message}
                  onChange={e => setStepForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={addStep} disabled={saving || (!stepForm.template_key && !stepForm.message && !stepForm.subject)}>
              {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
              Añadir paso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enrolar lead en la cadencia</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Buscar lead por nombre o empresa</Label>
              <Input
                placeholder="Restaurante Pedro..."
                value={enrollSearch}
                onChange={e => { setEnrollSearch(e.target.value); searchLeads(e.target.value); }}
              />
            </div>
            {enrollResults.length > 0 && (
              <div className="rounded-md border divide-y">
                {enrollResults.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => enrollLead(lead.id)}
                    disabled={enrolling}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                    {enrolling ? <Spinner size="sm" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
