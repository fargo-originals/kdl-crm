'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/app/image-upload';

interface TeamMember {
  id: string;
  full_name: string | null;
  role: { es: string; en: string } | null;
  bio: { es: string; en: string } | null;
  avatar_url: string | null;
  socials: { linkedin?: string; twitter?: string; github?: string; web?: string } | null;
  position: number;
  published: boolean;
}

interface FormState {
  full_name: string;
  role_es: string; role_en: string;
  bio_es: string; bio_en: string;
  avatar_url: string;
  linkedin: string;
  twitter: string;
  github: string;
  web: string;
}

const EMPTY: FormState = { full_name: '', role_es: '', role_en: '', bio_es: '', bio_en: '', avatar_url: '', linkedin: '', twitter: '', github: '', web: '' };

function toForm(item: TeamMember): FormState {
  return {
    full_name: item.full_name ?? '',
    role_es: item.role?.es ?? '',
    role_en: item.role?.en ?? '',
    bio_es: item.bio?.es ?? '',
    bio_en: item.bio?.en ?? '',
    avatar_url: item.avatar_url ?? '',
    linkedin: item.socials?.linkedin ?? '',
    twitter: item.socials?.twitter ?? '',
    github: item.socials?.github ?? '',
    web: item.socials?.web ?? '',
  };
}

export default function TeamPage() {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/landing/team');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: TeamMember) {
    setEditingId(item.id);
    setForm(toForm(item));
    setOpen(true);
  }

  async function save() {
    if (!form.full_name.trim()) { alert('El nombre es obligatorio'); return; }
    setSaving(true);
    const body = {
      full_name: form.full_name.trim(),
      role: { es: form.role_es, en: form.role_en },
      bio: { es: form.bio_es, en: form.bio_en },
      avatar_url: form.avatar_url || null,
      socials: {
        ...(form.linkedin ? { linkedin: form.linkedin } : {}),
        ...(form.twitter ? { twitter: form.twitter } : {}),
        ...(form.github ? { github: form.github } : {}),
        ...(form.web ? { web: form.web } : {}),
      },
    };
    if (editingId) {
      await fetch(`/api/landing/team/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/landing/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, published: false }) });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/team/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !published }) });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este miembro?')) return;
    await fetch(`/api/landing/team/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipo</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo miembro</Button>
      </div>

      {items.length === 0 && <p className="text-muted-foreground">No hay miembros del equipo aún.</p>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              {item.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              )}
              <div>
                <p className="font-medium">{item.full_name || '(sin nombre)'}</p>
                <p className="text-sm text-muted-foreground">{item.role?.es || ''}</p>
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
            <DialogTitle>{editingId ? 'Editar miembro' : 'Nuevo miembro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre completo <span className="text-destructive">*</span></Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ana García" />
              </div>
              <ImageUpload
                label="Avatar"
                value={form.avatar_url}
                onChange={url => setForm(f => ({ ...f, avatar_url: url }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cargo (ES)</Label>
                <Input value={form.role_es} onChange={e => setForm(f => ({ ...f, role_es: e.target.value }))} placeholder="Directora de Diseño" />
              </div>
              <div className="space-y-1">
                <Label>Cargo (EN)</Label>
                <Input value={form.role_en} onChange={e => setForm(f => ({ ...f, role_en: e.target.value }))} placeholder="Design Director" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Biografía (ES)</Label>
                <Textarea value={form.bio_es} onChange={e => setForm(f => ({ ...f, bio_es: e.target.value }))} rows={3} placeholder="Breve descripción..." />
              </div>
              <div className="space-y-1">
                <Label>Biografía (EN)</Label>
                <Textarea value={form.bio_en} onChange={e => setForm(f => ({ ...f, bio_en: e.target.value }))} rows={3} placeholder="Brief description..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Redes sociales</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="LinkedIn URL" />
                <Input value={form.twitter} onChange={e => setForm(f => ({ ...f, twitter: e.target.value }))} placeholder="Twitter/X URL" />
                <Input value={form.github} onChange={e => setForm(f => ({ ...f, github: e.target.value }))} placeholder="GitHub URL" />
                <Input value={form.web} onChange={e => setForm(f => ({ ...f, web: e.target.value }))} placeholder="Sitio web personal" />
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
