'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BlogPost {
  id: string;
  slug: string;
  title: { es: string; en: string } | null;
  excerpt: { es: string; en: string } | null;
  cover_url: string | null;
  tags: string[] | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface FormState {
  title_es: string; title_en: string;
  excerpt_es: string; excerpt_en: string;
  cover_url: string;
  tags: string;
  slug: string;
  status: string;
}

const EMPTY: FormState = { title_es: '', title_en: '', excerpt_es: '', excerpt_en: '', cover_url: '', tags: '', slug: '', status: 'draft' };

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toForm(post: BlogPost): FormState {
  return {
    title_es: post.title?.es ?? '',
    title_en: post.title?.en ?? '',
    excerpt_es: post.excerpt?.es ?? '',
    excerpt_en: post.excerpt?.en ?? '',
    cover_url: post.cover_url ?? '',
    tags: (post.tags ?? []).join(', '),
    slug: post.slug ?? '',
    status: post.status ?? 'draft',
  };
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/landing/blog');
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(post: BlogPost) {
    setEditingId(post.id);
    setForm(toForm(post));
    setOpen(true);
  }

  function handleTitleChange(val: string) {
    setForm(f => ({ ...f, title_es: val, slug: f.slug || slugify(val) }));
  }

  async function save() {
    if (!form.slug.trim()) { alert('El slug es obligatorio'); return; }
    setSaving(true);
    const body = {
      title: { es: form.title_es, en: form.title_en },
      excerpt: { es: form.excerpt_es, en: form.excerpt_en },
      cover_url: form.cover_url || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      slug: form.slug.trim(),
      status: form.status,
      ...(form.status === 'published' ? { published_at: new Date().toISOString() } : {}),
    };
    if (editingId) {
      await fetch(`/api/landing/blog/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/landing/blog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function deletePost(id: string) {
    if (!confirm('¿Eliminar este artículo?')) return;
    await fetch(`/api/landing/blog/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo artículo</Button>
      </div>

      {posts.length === 0 && <p className="text-muted-foreground">No hay artículos aún.</p>}

      <div className="space-y-2">
        {posts.map(post => (
          <div key={post.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              {post.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover_url} alt="" className="h-12 w-16 rounded object-cover" />
              )}
              <div>
                <p className="font-medium">{post.title?.es || post.slug || '(sin título)'}</p>
                <p className="text-sm text-muted-foreground">
                  {post.published_at
                    ? `Publicado: ${new Date(post.published_at).toLocaleDateString('es')}`
                    : `Creado: ${new Date(post.created_at).toLocaleDateString('es')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status] ?? 'bg-gray-100'}`}>
                {STATUS_LABELS[post.status] ?? post.status}
              </span>
              <button onClick={() => openEdit(post)} className="rounded p-1 hover:bg-accent">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => deletePost(post.id)} className="rounded p-1 hover:bg-accent text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Título (ES)</Label>
                <Input value={form.title_es} onChange={e => handleTitleChange(e.target.value)} placeholder="Título del artículo" />
              </div>
              <div className="space-y-1">
                <Label>Título (EN)</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} placeholder="Article title" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Extracto (ES)</Label>
                <Textarea value={form.excerpt_es} onChange={e => setForm(f => ({ ...f, excerpt_es: e.target.value }))} rows={3} placeholder="Resumen breve..." />
              </div>
              <div className="space-y-1">
                <Label>Extracto (EN)</Label>
                <Textarea value={form.excerpt_en} onChange={e => setForm(f => ({ ...f, excerpt_en: e.target.value }))} rows={3} placeholder="Brief summary..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Slug <span className="text-destructive">*</span></Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="mi-articulo" />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Imagen de portada URL</Label>
              <Input value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label>Etiquetas (separadas por coma)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="nextjs, diseño, web" />
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
