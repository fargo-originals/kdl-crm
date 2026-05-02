'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react';
import Link from 'next/link';

interface PortfolioItem {
  id: string;
  title: { es: string; en: string } | null;
  description: { es: string; en: string } | null;
  cover_url: string | null;
  slug: string | null;
  position: number;
  published: boolean;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/landing/portfolio');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/portfolio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !published }),
    });
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
        <button
          onClick={async () => {
            await fetch('/api/landing/portfolio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: { es: 'Nuevo proyecto', en: 'New project' }, description: { es: '', en: '' }, published: false }),
            });
            load();
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </button>
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
                <p className="font-medium">{item.title?.es ?? item.slug ?? '(sin título)'}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{item.description?.es ?? ''}</p>
              </div>
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
