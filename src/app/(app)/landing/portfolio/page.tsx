'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/app/image-upload';

interface PortfolioItem {
  id: string;
  title: { es: string; en: string } | null;
  description: { es: string; en: string } | null;
  client_name: string | null;
  cover_url: string | null;
  external_url: string | null;
  tags: string[] | null;
  slug: string;
  position: number;
  published: boolean;
}

interface FormState {
  title_es: string; title_en: string;
  description_es: string; description_en: string;
  client_name: string;
  cover_url: string;
  external_url: string;
  tags: string;
  slug: string;
}

const EMPTY: FormState = { title_es: '', title_en: '', description_es: '', description_en: '', client_name: '', cover_url: '', external_url: '', tags: '', slug: '' };

function toForm(item: PortfolioItem): FormState {
  return {
    title_es: item.title?.es ?? '',
    title_en: item.title?.en ?? '',
    description_es: item.description?.es ?? '',
    description_en: item.description?.en ?? '',
    client_name: item.client_name ?? '',
    cover_url: item.cover_url ?? '',
    external_url: item.external_url ?? '',
    tags: (item.tags ?? []).join(', '),
    slug: item.slug ?? '',
  };
}

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/landing/portfolio');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: PortfolioItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setOpen(true);
  }

  function handleTitleChange(val: string) {
    setForm(f => ({
      ...f,
      title_es: val,
      slug: f.slug || slugify(val),
    }));
  }

  async function save() {
    if (!form.slug.trim()) { alert('El slug es obligatorio'); return; }
    setSaving(true);
    const body = {
      title: { es: form.title_es, en: form.title_en },
      description: { es: form.description_es, en: form.description_en },
      client_name: form.client_name || null,
      cover_url: form.cover_url || null,
      external_url: form.external_url || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      slug: form.slug.trim(),
    };
    if (editingId) {
      await fetch(`/api/landing/portfolio/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/landing/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, published: false }) });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/portfolio/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !published }) });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este proyecto?')) return;
    await fetch(`/api/landing/portfolio/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo proyecto</Button>
      </div>

      {items.length === 0 && <p className="text-muted-foreground">No hay proyectos aún.</p>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              {item.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.cover_url} alt="" className="h-12 w-16 rounded object-cover" />
              )}
              <div>
                <p className="font-medium">{item.title?.es || item.slug || '(sin título)'}</p>
                <p className="text-sm text-muted-foreground">{item.client_name || item.description?.es || ''}</p>
              </div>
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
            <DialogTitle>{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Título (ES)</Label>
                <Input value={form.title_es} onChange={e => handleTitleChange(e.target.value)} placeholder="Título del proyecto" />
              </div>
              <div className="space-y-1">
                <Label>Título (EN)</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} placeholder="Project title" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Descripción (ES)</Label>
                <Textarea value={form.description_es} onChange={e => setForm(f => ({ ...f, description_es: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Descripción (EN)</Label>
                <Textarea value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cliente</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nombre del cliente" />
              </div>
              <div className="space-y-1">
                <Label>Slug <span className="text-destructive">*</span></Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="mi-proyecto" />
              </div>
            </div>
            <ImageUpload
              label="Imagen de portada"
              value={form.cover_url}
              onChange={url => setForm(f => ({ ...f, cover_url: url }))}
            />
            <div className="space-y-1">
              <Label>URL externa del proyecto</Label>
              <Input value={form.external_url} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Etiquetas (separadas por coma)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="web, diseño, react" />
            </div>
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
