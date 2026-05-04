'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Globe, Image, Layers, Star, HelpCircle, Users, FileText, Settings, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  { href: '/landing/hero', label: 'Hero', icon: Globe, description: 'Cabecera principal y CTA' },
  { href: '/landing/services', label: 'Servicios', icon: Layers, description: 'Lista de servicios ofrecidos' },
  { href: '/landing/portfolio', label: 'Portfolio', icon: Image, description: 'Casos de éxito y proyectos' },
  { href: '/landing/testimonials', label: 'Testimonios', icon: Star, description: 'Opiniones de clientes' },
  { href: '/landing/faq', label: 'FAQ', icon: HelpCircle, description: 'Preguntas frecuentes' },
  { href: '/landing/team', label: 'Equipo', icon: Users, description: 'Miembros del equipo' },
  { href: '/landing/blog', label: 'Blog', icon: FileText, description: 'Artículos y noticias' },
  { href: '/landing/settings', label: 'Configuración', icon: Settings, description: 'Header, footer, SEO y tema' },
];

export default function LandingCMSPage() {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  async function publishAll() {
    setPublishing(true);
    setPublished(false);
    try {
      await fetch('/api/landing/publish', { method: 'POST' });
      setPublished(true);
      setTimeout(() => setPublished(false), 4000);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CMS Landing</h1>
          <p className="text-muted-foreground">Gestiona el contenido de kentodevlab.com</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={publishAll} disabled={publishing} variant={published ? 'outline' : 'default'}>
            {published ? (
              <><CheckCircle className="h-4 w-4 mr-2 text-green-500" />Publicado</>
            ) : publishing ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Publicando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Publicar todo</>
            )}
          </Button>
          <a
            href="https://kentodevlab.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            <Globe className="h-4 w-4" />
            Ver landing
          </a>
        </div>
      </div>

      <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 border border-blue-200">
        Activa el icono <strong>ojo</strong> en cada sección para que los elementos aparezcan en la landing. Luego pulsa <strong>Publicar todo</strong> para refrescar la caché.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map(({ href, label, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-2 rounded-lg border bg-card p-5 hover:bg-accent/50 transition-colors"
          >
            <Icon className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
