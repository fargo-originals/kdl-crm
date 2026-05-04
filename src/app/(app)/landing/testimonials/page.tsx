'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/app/image-upload';

interface Testimonial {
  id: string;
  author_name: string | null;
  author_role: { es: string; en: string } | null;
  author_avatar_url: string | null;
  quote: { es: string; en: string } | null;
  rating: number | null;
  position: number;
  published: boolean;
}

interface FormState {
  author_name: string;
  author_role_es: string; author_role_en: string;
  author_avatar_url: string;
  quote_es: string; quote_en: string;
  rating: number;
}

const EMPTY: FormState = { author_name: '', author_role_es: '', author_role_en: '', author_avatar_url: '', quote_es: '', quote_en: '', rating: 5 };

function toForm(item: Testimonial): FormState {
  return {
    author_name: item.author_name ?? '',
    author_role_es: item.author_role?.es ?? '',
    author_role_en: item.author_role?.en ?? '',
    author_avatar_url: item.author_avatar_url ?? '',
    quote_es: item.quote?.es ?? '',
    quote_en: item.quote?.en ?? '',
    rating: item.rating ?? 5,
  };
}

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/landing/testimonials');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: Testimonial) {
    setEditingId(item.id);
    setForm(toForm(item));
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const body = {
      author_name: form.author_name,
      author_role: { es: form.author_role_es, en: form.author_role_en },
      author_avatar_url: form.author_avatar_url || null,
      quote: { es: form.quote_es, en: form.quote_en },
      rating: form.rating,
    };
    if (editingId) {
      await fetch(`/api/landing/testimonials/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/landing/testimonials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, published: false }) });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/testimonials/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !published }) });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este testimonio?')) return;
    await fetch(`/api/landing/testimonials/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Testimonios</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo testimonio</Button>
      </div>

      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">Activa el icono <strong>ojo</strong> en cada elemento para que aparezca en la landing page.</p>
      {items.length === 0 && <p className="text-muted-foreground">No hay testimonios aún.</p>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              {item.author_avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.author_avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              )}
              <div>
                <p className="font-medium">{item.author_name || '(sin nombre)'}</p>
                <p className="text-sm text-muted-foreground">
                  {item.author_role?.es || ''}{item.rating ? ` · ${'★'.repeat(item.rating)}` : ''}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-1">{item.quote?.es || ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
            <DialogTitle>{editingId ? 'Editar testimonio' : 'Nuevo testimonio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre del autor</Label>
                <Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} placeholder="María García" />
              </div>
              <ImageUpload
                label="Avatar"
                value={form.author_avatar_url}
                onChange={url => setForm(f => ({ ...f, author_avatar_url: url }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cargo/Empresa (ES)</Label>
                <Input value={form.author_role_es} onChange={e => setForm(f => ({ ...f, author_role_es: e.target.value }))} placeholder="CEO, Empresa S.L." />
              </div>
              <div className="space-y-1">
                <Label>Cargo/Empresa (EN)</Label>
                <Input value={form.author_role_en} onChange={e => setForm(f => ({ ...f, author_role_en: e.target.value }))} placeholder="CEO, Company Ltd." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Testimonio (ES)</Label>
                <Textarea value={form.quote_es} onChange={e => setForm(f => ({ ...f, quote_es: e.target.value }))} rows={4} placeholder="El servicio fue excelente..." />
              </div>
              <div className="space-y-1">
                <Label>Testimonio (EN)</Label>
                <Textarea value={form.quote_en} onChange={e => setForm(f => ({ ...f, quote_en: e.target.value }))} rows={4} placeholder="The service was excellent..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Valoración (1-5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, rating: n }))}
                    className={`text-2xl transition-opacity ${n <= form.rating ? 'opacity-100' : 'opacity-30'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
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
