'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FaqItem {
  id: string;
  question: { es: string; en: string } | null;
  answer: { es: string; en: string } | null;
  category: string | null;
  position: number;
  published: boolean;
}

interface FormState {
  question_es: string; question_en: string;
  answer_es: string; answer_en: string;
  category: string;
}

const EMPTY: FormState = { question_es: '', question_en: '', answer_es: '', answer_en: '', category: '' };

function toForm(item: FaqItem): FormState {
  return {
    question_es: item.question?.es ?? '',
    question_en: item.question?.en ?? '',
    answer_es: item.answer?.es ?? '',
    answer_en: item.answer?.en ?? '',
    category: item.category ?? '',
  };
}

export default function FaqPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/landing/faq');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: FaqItem) {
    setEditingId(item.id);
    setForm(toForm(item));
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const body = {
      question: { es: form.question_es, en: form.question_en },
      answer: { es: form.answer_es, en: form.answer_en },
      category: form.category || null,
    };
    if (editingId) {
      await fetch(`/api/landing/faq/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      await fetch('/api/landing/faq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, published: false }) });
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/faq/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !published }) });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await fetch(`/api/landing/faq/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FAQ</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nueva pregunta</Button>
      </div>

      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 border border-blue-200">Activa el icono <strong>ojo</strong> en cada elemento para que aparezca en la landing page.</p>
      {items.length === 0 && <p className="text-muted-foreground">No hay preguntas aún.</p>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex-1 min-w-0 mr-4">
              <p className="font-medium">{item.question?.es || '(sin pregunta)'}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{item.answer?.es || ''}</p>
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
            <DialogTitle>{editingId ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Pregunta (ES)</Label>
                <Input value={form.question_es} onChange={e => setForm(f => ({ ...f, question_es: e.target.value }))} placeholder="¿Cuánto cuesta...?" />
              </div>
              <div className="space-y-1">
                <Label>Pregunta (EN)</Label>
                <Input value={form.question_en} onChange={e => setForm(f => ({ ...f, question_en: e.target.value }))} placeholder="How much does...?" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Respuesta (ES)</Label>
                <Textarea value={form.answer_es} onChange={e => setForm(f => ({ ...f, answer_es: e.target.value }))} rows={4} placeholder="Descripción en español..." />
              </div>
              <div className="space-y-1">
                <Label>Respuesta (EN)</Label>
                <Textarea value={form.answer_en} onChange={e => setForm(f => ({ ...f, answer_en: e.target.value }))} rows={4} placeholder="Description in English..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Categoría (opcional)</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="ej: precios, proceso, tecnología" />
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
