'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/app/image-upload';

interface HeroItem {
  id: string;
  title: { es: string; en: string } | null;
  subtitle: { es: string; en: string } | null;
  cta_label: { es: string; en: string } | null;
  cta_url: string | null;
  bg_media_url: string | null;
  position: number;
  published: boolean;
}

interface FormState {
  title_es: string; title_en: string;
  subtitle_es: string; subtitle_en: string;
  cta_label_es: string; cta_label_en: string;
  cta_url: string;
  bg_media_url: string;
}

const EMPTY: FormState = { title_es: '', title_en: '', subtitle_es: '', subtitle_en: '', cta_label_es: '', cta_label_en: '', cta_url: '', bg_media_url: '' };

function toForm(item: HeroItem): FormState {
  return {
    title_es: item.title?.es ?? '',
    title_en: item.title?.en ?? '',
    subtitle_es: item.subtitle?.es ?? '',
    subtitle_en: item.subtitle?.en ?? '',
    cta_label_es: item.cta_label?.es ?? '',
    cta_label_en: item.cta_label?.en ?? '',
    cta_url: item.cta_url ?? '',
    bg_media_url: item.bg_media_url ?? '',
  };
}

export default function HeroPage() {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/landing/hero');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: HeroItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const body = {
      title: { es: form.title_es, en: form.title_en },
      subtitle: { es: form.subtitle_es, en: form.subtitle_en },
      cta_label: { es: form.cta_label_es, en: form.cta_label_en },
      cta_url: form.cta_url || null,
      bg_media_url: form.bg_media_url || null,
    };
    if (editingId) {
      await fetch(`/api/landing/hero/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/landing/hero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, published: false }) });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/hero/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !published }) });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este hero?')) return;
    await fetch(`/api/landing/hero/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hero</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo hero</Button>
      </div>

      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">Activa el icono <strong>ojo</strong> en cada elemento para que aparezca en la landing page.</p>
      {items.length === 0 && <p className="text-muted-foreground">No hay elementos hero aún.</p>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div>
              <p className="font-medium">{item.title?.es || '(sin título)'}</p>
              <p className="text-sm text-muted-foreground">{item.subtitle?.es || ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {item.published ? 'Publicado' : 'Borrador'}
              </span>
              <button onClick={() => openEdit(item)} className="rounded p-1 hover:bg-accent">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => togglePublished(item.id, item.published)} className="rounded p-1 hover:bg-accent">
                {item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={() => deleteItem(item.id)} className="rounded p-1 hover:bg-accent text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar hero' : 'Nuevo hero'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Título (ES)</Label>
                <Input value={form.title_es} onChange={e => setForm(f => ({ ...f, title_es: e.target.value }))} placeholder="Título en español" />
              </div>
              <div className="space-y-1">
                <Label>Título (EN)</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} placeholder="Title in English" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Subtítulo (ES)</Label>
                <Textarea value={form.subtitle_es} onChange={e => setForm(f => ({ ...f, subtitle_es: e.target.value }))} rows={3} placeholder="Subtítulo en español" />
              </div>
              <div className="space-y-1">
                <Label>Subtítulo (EN)</Label>
                <Textarea value={form.subtitle_en} onChange={e => setForm(f => ({ ...f, subtitle_en: e.target.value }))} rows={3} placeholder="Subtitle in English" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Texto del botón CTA (ES)</Label>
                <Input value={form.cta_label_es} onChange={e => setForm(f => ({ ...f, cta_label_es: e.target.value }))} placeholder="ej: Contactar" />
              </div>
              <div className="space-y-1">
                <Label>Texto del botón CTA (EN)</Label>
                <Input value={form.cta_label_en} onChange={e => setForm(f => ({ ...f, cta_label_en: e.target.value }))} placeholder="e.g. Contact us" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL del botón CTA</Label>
              <Input value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} placeholder="/contacto" />
            </div>
            <ImageUpload
              label="Imagen/vídeo de fondo"
              value={form.bg_media_url}
              onChange={url => setForm(f => ({ ...f, bg_media_url: url }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
