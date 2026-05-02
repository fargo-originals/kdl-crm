'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus } from 'lucide-react';

interface HeroItem {
  id: string;
  headline: { es: string; en: string } | null;
  subheadline: { es: string; en: string } | null;
  cta_label: { es: string; en: string } | null;
  position: number;
  published: boolean;
}

export default function HeroPage() {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/landing/hero');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/hero/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !published }),
    });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este elemento?')) return;
    await fetch(`/api/landing/hero/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hero</h1>
        <button
          onClick={async () => {
            await fetch('/api/landing/hero', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ headline: { es: 'Nuevo título', en: 'New title' }, subheadline: { es: '', en: '' }, cta_label: { es: '', en: '' }, published: false }),
            });
            load();
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo hero
        </button>
      </div>

      {items.length === 0 && <p className="text-muted-foreground">No hay elementos hero aún.</p>}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div>
              <p className="font-medium">{item.headline?.es ?? '(sin título)'}</p>
              <p className="text-sm text-muted-foreground">{item.subheadline?.es ?? ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {item.published ? 'Publicado' : 'Borrador'}
              </span>
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
    </div>
  );
}
