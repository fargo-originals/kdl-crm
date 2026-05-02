'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  slug: string | null;
  title: { es: string; en: string } | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/landing/blog');
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/landing/blog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
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
        <button
          onClick={async () => {
            await fetch('/api/landing/blog', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: { es: 'Nuevo artículo', en: 'New article' }, slug: `post-${Date.now()}`, status: 'draft' }),
            });
            load();
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo artículo
        </button>
      </div>

      {posts.length === 0 && <p className="text-muted-foreground">No hay artículos aún.</p>}

      <div className="space-y-2">
        {posts.map(post => (
          <div key={post.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div>
              <p className="font-medium">{post.title?.es ?? post.slug ?? '(sin título)'}</p>
              <p className="text-sm text-muted-foreground">
                {post.published_at
                  ? `Publicado: ${new Date(post.published_at).toLocaleDateString('es')}`
                  : `Creado: ${new Date(post.created_at).toLocaleDateString('es')}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status] ?? 'bg-gray-100'}`}>
                {post.status}
              </span>
              {post.status === 'draft' && (
                <button
                  onClick={() => updateStatus(post.id, 'published')}
                  className="rounded-md border px-2 py-0.5 text-xs hover:bg-accent"
                >
                  Publicar
                </button>
              )}
              {post.status === 'published' && (
                <button
                  onClick={() => updateStatus(post.id, 'draft')}
                  className="rounded-md border px-2 py-0.5 text-xs hover:bg-accent"
                >
                  Despublicar
                </button>
              )}
              <button onClick={() => deletePost(post.id)} className="rounded p-1 hover:bg-accent text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
