'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

interface Service {
  id: string;
  icon: string | null;
  title: { es: string; en: string };
  description: { es: string; en: string };
  price: string | null;
  currency: string;
  slug: string;
  position: number;
  published: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/landing/services');
    if (res.ok) setServices(await res.json());
    setLoading(false);
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/landing/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !published }),
    });
    load();
  }

  async function deleteService(id: string) {
    if (!confirm('¿Eliminar este servicio?')) return;
    await fetch(`/api/landing/services/${id}`, { method: 'DELETE' });
    load();
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servicios</h1>
        <Link href="/landing/services/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Nuevo servicio
        </Link>
      </div>

      {services.length === 0 && (
        <p className="text-muted-foreground">No hay servicios aún.</p>
      )}

      <div className="space-y-2">
        {services.map(svc => (
          <div key={svc.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              {svc.icon && <span className="text-2xl">{svc.icon}</span>}
              <div>
                <p className="font-medium">{svc.title?.es ?? svc.slug}</p>
                {svc.price && <p className="text-sm text-muted-foreground">{svc.price} {svc.currency}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${svc.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {svc.published ? 'Publicado' : 'Borrador'}
              </span>
              <button onClick={() => togglePublished(svc.id, svc.published)} className="rounded p-1 hover:bg-accent" title="Toggle publicado">
                {svc.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <Link href={`/landing/services/${svc.id}`} className="rounded p-1 hover:bg-accent">
                <Pencil className="h-4 w-4" />
              </Link>
              <button onClick={() => deleteService(svc.id)} className="rounded p-1 hover:bg-accent text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
