'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Spinner, PageSpinner } from '@/components/ui/spinner';
import { Plus, Trash2, Star, GripVertical, Settings2 } from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  position: number;
  color: string;
  probability_default: number;
  is_won: boolean;
  is_lost: boolean;
}

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  stages: PipelineStage[];
}

const COLORS = ['#64748B', '#2563EB', '#8B5CF6', '#F59E0B', '#F97316', '#16A34A', '#DC2626'];

export default function PipelineSettingsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [newStage, setNewStage] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/pipelines');
    const data = await res.json();
    const list: Pipeline[] = Array.isArray(data) ? data : [];
    setPipelines(list);
    if (!selected && list.length > 0) {
      setSelected(list.find(p => p.is_default)?.id ?? list[0].id);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const activePipeline = pipelines.find(p => p.id === selected);
  const stages = (activePipeline?.stages ?? []).sort((a, b) => a.position - b.position);

  async function createPipeline() {
    if (!form.name) return;
    setSaving(true);
    await fetch('/api/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    setForm({ name: '', description: '' });
    load();
  }

  async function setDefault(id: string) {
    await fetch(`/api/pipelines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    load();
  }

  async function deletePipeline(id: string) {
    if (!confirm('¿Eliminar este pipeline? Los deals asociados quedarán sin pipeline.')) return;
    await fetch(`/api/pipelines/${id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  }

  async function addStage() {
    if (!newStage.trim() || !selected) return;
    const position = stages.length;
    await fetch('/api/pipeline/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStage,
        position,
        color: COLORS[position % COLORS.length],
        probability_default: 50,
        is_won: false,
        is_lost: false,
        pipeline_id: selected,
      }),
    });
    setNewStage('');
    load();
  }

  async function deleteStage(id: string) {
    await fetch(`/api/pipeline/stages/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipelines</h1>
          <p className="text-muted-foreground">Gestiona tus pipelines de ventas y sus etapas</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo pipeline
        </Button>
      </div>

      {/* Pipeline tabs */}
      <div className="flex gap-2 flex-wrap">
        {pipelines.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selected === p.id
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {p.name}
            {p.is_default && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
          </button>
        ))}
      </div>

      {activePipeline && (
        <div className="space-y-4">
          {/* Pipeline actions */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{activePipeline.name}</p>
              {activePipeline.description && (
                <p className="text-sm text-muted-foreground">{activePipeline.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              {!activePipeline.is_default && (
                <Button variant="outline" size="sm" onClick={() => setDefault(activePipeline.id)}>
                  <Star className="h-3.5 w-3.5 mr-1.5" /> Usar como predeterminado
                </Button>
              )}
              {activePipeline.is_default && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1 text-amber-500 fill-amber-500" /> Predeterminado
                </Badge>
              )}
              {pipelines.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => deletePipeline(activePipeline.id)}
                  className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Stages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etapas</CardTitle>
              <CardDescription>Fases del embudo de ventas para este pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva etapa..."
                  value={newStage}
                  onChange={e => setNewStage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStage()}
                />
                <Button onClick={addStage}><Plus className="mr-2 h-4 w-4" />Añadir</Button>
              </div>
              {stages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin etapas todavía.</p>
              ) : (
                <div className="divide-y">
                  {stages.map(stage => (
                    <div key={stage.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="font-medium text-sm">{stage.name}</span>
                        <Badge variant="secondary" className="text-xs">{stage.probability_default}%</Badge>
                        {stage.is_won && <Badge variant="success" className="text-xs">Ganado</Badge>}
                        {stage.is_lost && <Badge variant="destructive" className="text-xs">Perdido</Badge>}
                      </div>
                      <Button variant="ghost" size="icon"
                        onClick={() => deleteStage(stage.id)}
                        disabled={stage.is_won || stage.is_lost}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create pipeline dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo pipeline</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Renovaciones 2026"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción (opcional)</Label>
              <Input placeholder="Pipeline para clientes existentes"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={createPipeline} disabled={saving || !form.name}>
              {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
              Crear pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
