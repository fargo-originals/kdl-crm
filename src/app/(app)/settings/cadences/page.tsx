'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Plus, ListOrdered, Mail, MessageCircle, ArrowRight, Trash2 } from 'lucide-react';
import { SECTOR_LABELS } from '@/lib/campaigns/templates';
import type { Cadence } from '@/lib/cadences/types';

export default function CadencesPage() {
  const router = useRouter();
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', sector: '' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/cadences');
    const data = await res.json();
    setCadences(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch('/api/cadences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    setOpen(false);
    setForm({ name: '', description: '', sector: '' });
    if (data.id) router.push(`/settings/cadences/${data.id}`);
    else load();
  }

  async function deleteCadence(id: string) {
    await fetch(`/api/cadences/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cadencias</h1>
          <p className="text-muted-foreground">Secuencias de outreach automatizadas multi-paso</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva cadencia
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : cadences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <ListOrdered className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No hay cadencias todavía</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Las cadencias envían emails y WhatsApps automáticamente con el timing que configures — Email 1 el día 0, Email 2 el día 7, etc.
            </p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Crear primera cadencia</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cadences.map(c => (
            <Card
              key={c.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/settings/cadences/${c.id}`)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <ListOrdered className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {c.sector && (
                      <Badge variant="secondary" className="text-xs">
                        {SECTOR_LABELS[c.sector] ?? c.sector}
                      </Badge>
                    )}
                    <Badge variant={c.is_active ? 'success' : 'secondary'}>
                      {c.is_active ? 'Activa' : 'Pausada'}
                    </Badge>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground truncate">{c.description}</p>}
                  {c.steps && c.steps.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {c.steps.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-1">
                          {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          <span className={`flex items-center gap-0.5 text-xs rounded px-1.5 py-0.5 ${
                            s.channel === 'whatsapp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {s.channel === 'whatsapp'
                              ? <MessageCircle className="h-3 w-3" />
                              : <Mail className="h-3 w-3" />}
                            Día {s.day_offset}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => deleteCadence(c.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva cadencia</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Outreach restaurantes Malasaña"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Input placeholder="3 emails + 1 WA en 21 días"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Sector (opcional)</Label>
              <Select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Sin sector específico</option>
                {(Object.entries(SECTOR_LABELS) as [string, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name}>
              {saving ? <><Spinner size="sm" tone="current" className="mr-2" />Creando...</> : 'Crear y configurar pasos →'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
