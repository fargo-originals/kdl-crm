'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Pencil, FileText } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  category: 'campaign' | 'quote' | 'followup' | 'general';
  is_shared: boolean;
  created_at: string;
}

const CATEGORY_LABELS = { campaign: 'Campaña', quote: 'Presupuesto', followup: 'Seguimiento', general: 'General' };
const VARS_HINT = '{{firstName}}, {{businessName}}, {{neighborhood}}, {{rating}}';

const EMPTY: Partial<EmailTemplate> = { name: '', subject: '', body_html: '', category: 'general', is_shared: false };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<Partial<EmailTemplate>>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/settings/templates');
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(t: EmailTemplate) { setEditing(t); setForm(t); setOpen(true); }

  async function handleSave() {
    if (!form.name?.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/settings/templates/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/api/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    await fetch(`/api/settings/templates/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de email</h1>
          <p className="text-muted-foreground">Crea plantillas personalizadas reutilizables en campañas y seguimientos</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nueva plantilla</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay plantillas todavía</p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Crear primera plantilla</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-4 py-3">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[t.category]}</Badge>
                      {t.is_shared && <Badge variant="outline" className="text-xs">Compartida</Badge>}
                    </div>
                    {t.subject && <p className="text-xs text-muted-foreground truncate mt-0.5">Asunto: {t.subject}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground p-1">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive p-1">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input placeholder="Ej: Follow-up restaurantes"
                  value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={form.category ?? 'general'}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as EmailTemplate['category'] }))}>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Asunto del email</Label>
              <Input placeholder="Ej: Hola {{firstName}}, tenemos algo para ti"
                value={form.subject ?? ''} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Cuerpo HTML</Label>
              <p className="text-xs text-muted-foreground">Variables disponibles: {VARS_HINT}</p>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[200px] resize-y"
                placeholder="<p>Hola {{firstName}},</p>&#10;<p>Tu mensaje aquí...</p>"
                value={form.body_html ?? ''}
                onChange={e => setForm(f => ({ ...f, body_html: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_shared ?? false}
                onChange={e => setForm(f => ({ ...f, is_shared: e.target.checked }))} />
              Compartir con todo el equipo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name?.trim()}>
              {saving ? <Spinner size="sm" tone="current" className="mr-2" /> : null}
              {editing ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
