'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ServiceForm {
  icon: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  price: string;
  currency: string;
  slug: string;
  published: boolean;
}

const defaultForm: ServiceForm = {
  icon: '', title_es: '', title_en: '', description_es: '', description_en: '',
  price: '', currency: 'EUR', slug: '', published: false,
};

export default function ServiceEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const [form, setForm] = useState<ServiceForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/landing/services/${id}`).then(r => r.json()).then(data => {
        setForm({
          icon: data.icon ?? '',
          title_es: data.title?.es ?? '',
          title_en: data.title?.en ?? '',
          description_es: data.description?.es ?? '',
          description_en: data.description?.en ?? '',
          price: data.price ?? '',
          currency: data.currency ?? 'EUR',
          slug: data.slug ?? '',
          published: data.published ?? false,
        });
      });
    }
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      icon: form.icon,
      title: { es: form.title_es, en: form.title_en },
      description: { es: form.description_es, en: form.description_en },
      price: form.price || null,
      currency: form.currency,
      slug: form.slug || form.title_es.toLowerCase().replace(/\s+/g, '-'),
      published: form.published,
    };
    const res = await fetch(isNew ? '/api/landing/services' : `/api/landing/services/${id}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push('/landing/services');
    } else {
      setError('Error al guardar');
    }
    setSaving(false);
  }

  const field = (key: keyof ServiceForm, label: string, multiline = false) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <input
          type="text"
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? 'Nuevo servicio' : 'Editar servicio'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('icon', 'Icono (emoji o código)')}
        {field('title_es', 'Título (ES)')}
        {field('title_en', 'Título (EN)')}
        {field('description_es', 'Descripción (ES)', true)}
        {field('description_en', 'Descripción (EN)', true)}
        {field('price', 'Precio (opcional)')}
        {field('currency', 'Moneda')}
        {field('slug', 'Slug (URL)')}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={form.published}
            onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="published" className="text-sm font-medium">Publicado</label>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
