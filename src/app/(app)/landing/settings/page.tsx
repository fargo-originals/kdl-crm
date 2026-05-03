'use client';

import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface HeaderSettings {
  logo_url: string;
  site_name: string;
  nav_links: { label_es: string; label_en: string; href: string }[];
  cta_label_es: string;
  cta_label_en: string;
  cta_href: string;
}

interface FooterSettings {
  description_es: string;
  description_en: string;
  copyright: string;
  links: { label_es: string; label_en: string; href: string }[];
}

interface SeoSettings {
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  keywords: string;
  og_image: string;
}

interface ThemeSettings {
  primary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
}

const DEFAULT_HEADER: HeaderSettings = { logo_url: '', site_name: '', nav_links: [], cta_label_es: '', cta_label_en: '', cta_href: '' };
const DEFAULT_FOOTER: FooterSettings = { description_es: '', description_en: '', copyright: '', links: [] };
const DEFAULT_SEO: SeoSettings = { title_es: '', title_en: '', description_es: '', description_en: '', keywords: '', og_image: '' };
const DEFAULT_THEME: ThemeSettings = { primary_color: '#7c3aed', accent_color: '#a78bfa', font_heading: '', font_body: '' };

export default function SettingsPage() {
  const [header, setHeader] = useState<HeaderSettings>(DEFAULT_HEADER);
  const [footer, setFooter] = useState<FooterSettings>(DEFAULT_FOOTER);
  const [seo, setSeo] = useState<SeoSettings>(DEFAULT_SEO);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/landing/settings');
    if (res.ok) {
      const data: { key: string; value: unknown }[] = await res.json();
      for (const s of data) {
        const v = s.value as Record<string, unknown> ?? {};
        if (s.key === 'header') setHeader({ ...DEFAULT_HEADER, ...v } as HeaderSettings);
        if (s.key === 'footer') setFooter({ ...DEFAULT_FOOTER, ...v } as FooterSettings);
        if (s.key === 'seo_global') setSeo({ ...DEFAULT_SEO, ...v } as SeoSettings);
        if (s.key === 'theme') setTheme({ ...DEFAULT_THEME, ...v } as ThemeSettings);
      }
    }
    setLoading(false);
  }

  async function saveSetting(key: string, value: unknown) {
    setSaving(s => ({ ...s, [key]: true }));
    await fetch('/api/landing/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
    setSaving(s => ({ ...s, [key]: false }));
    setSaved(s => ({ ...s, [key]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000);
  }

  async function publishAll() {
    setPublishing(true);
    await fetch('/api/landing/publish', { method: 'POST' });
    setPublishing(false);
    setPublished(true);
    setTimeout(() => setPublished(false), 3000);
  }

  function addNavLink() {
    setHeader(h => ({ ...h, nav_links: [...(h.nav_links ?? []), { label_es: '', label_en: '', href: '' }] }));
  }
  function removeNavLink(i: number) {
    setHeader(h => ({ ...h, nav_links: h.nav_links.filter((_, idx) => idx !== i) }));
  }
  function updateNavLink(i: number, field: keyof typeof header.nav_links[0], val: string) {
    setHeader(h => {
      const links = [...(h.nav_links ?? [])];
      links[i] = { ...links[i], [field]: val };
      return { ...h, nav_links: links };
    });
  }

  function addFooterLink() {
    setFooter(f => ({ ...f, links: [...(f.links ?? []), { label_es: '', label_en: '', href: '' }] }));
  }
  function removeFooterLink(i: number) {
    setFooter(f => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }));
  }
  function updateFooterLink(i: number, field: keyof typeof footer.links[0], val: string) {
    setFooter(f => {
      const links = [...(f.links ?? [])];
      links[i] = { ...links[i], [field]: val };
      return { ...f, links };
    });
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración Landing</h1>
          <p className="text-muted-foreground text-sm">Header, footer, SEO y tema visual</p>
        </div>
        <Button onClick={publishAll} disabled={publishing} variant="default">
          <RefreshCw className={`h-4 w-4 mr-2 ${publishing ? 'animate-spin' : ''}`} />
          {published ? '¡Publicado!' : publishing ? 'Publicando...' : 'Publicar todo'}
        </Button>
      </div>

      {/* HEADER */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Header</h2>
          <Button size="sm" variant="outline" onClick={() => saveSetting('header', header)} disabled={saving.header}>
            <Save className="h-3 w-3 mr-1" />{saved.header ? '¡Guardado!' : saving.header ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Nombre del sitio</Label>
            <Input value={header.site_name} onChange={e => setHeader(h => ({ ...h, site_name: e.target.value }))} placeholder="KentoDevLab" />
          </div>
          <div className="space-y-1">
            <Label>URL del logo</Label>
            <Input value={header.logo_url} onChange={e => setHeader(h => ({ ...h, logo_url: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Botón CTA (ES)</Label>
            <Input value={header.cta_label_es} onChange={e => setHeader(h => ({ ...h, cta_label_es: e.target.value }))} placeholder="Contactar" />
          </div>
          <div className="space-y-1">
            <Label>Botón CTA (EN)</Label>
            <Input value={header.cta_label_en} onChange={e => setHeader(h => ({ ...h, cta_label_en: e.target.value }))} placeholder="Contact" />
          </div>
          <div className="space-y-1">
            <Label>URL del CTA</Label>
            <Input value={header.cta_href} onChange={e => setHeader(h => ({ ...h, cta_href: e.target.value }))} placeholder="/contacto" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Navegación</Label>
            <button onClick={addNavLink} className="text-sm text-primary hover:underline">+ Añadir enlace</button>
          </div>
          {(header.nav_links ?? []).map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <Input value={link.label_es} onChange={e => updateNavLink(i, 'label_es', e.target.value)} placeholder="Etiqueta ES" />
              <Input value={link.label_en} onChange={e => updateNavLink(i, 'label_en', e.target.value)} placeholder="Label EN" />
              <Input value={link.href} onChange={e => updateNavLink(i, 'href', e.target.value)} placeholder="/ruta" />
              <button onClick={() => removeNavLink(i)} className="text-destructive hover:opacity-70 px-2">✕</button>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Footer</h2>
          <Button size="sm" variant="outline" onClick={() => saveSetting('footer', footer)} disabled={saving.footer}>
            <Save className="h-3 w-3 mr-1" />{saved.footer ? '¡Guardado!' : saving.footer ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Descripción (ES)</Label>
            <Textarea value={footer.description_es} onChange={e => setFooter(f => ({ ...f, description_es: e.target.value }))} rows={2} placeholder="Descripción breve..." />
          </div>
          <div className="space-y-1">
            <Label>Descripción (EN)</Label>
            <Textarea value={footer.description_en} onChange={e => setFooter(f => ({ ...f, description_en: e.target.value }))} rows={2} placeholder="Brief description..." />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Texto copyright</Label>
          <Input value={footer.copyright} onChange={e => setFooter(f => ({ ...f, copyright: e.target.value }))} placeholder="© 2025 KentoDevLab. Todos los derechos reservados." />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Enlaces del footer</Label>
            <button onClick={addFooterLink} className="text-sm text-primary hover:underline">+ Añadir enlace</button>
          </div>
          {(footer.links ?? []).map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <Input value={link.label_es} onChange={e => updateFooterLink(i, 'label_es', e.target.value)} placeholder="Etiqueta ES" />
              <Input value={link.label_en} onChange={e => updateFooterLink(i, 'label_en', e.target.value)} placeholder="Label EN" />
              <Input value={link.href} onChange={e => updateFooterLink(i, 'href', e.target.value)} placeholder="/ruta" />
              <button onClick={() => removeFooterLink(i)} className="text-destructive hover:opacity-70 px-2">✕</button>
            </div>
          ))}
        </div>
      </section>

      {/* SEO */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">SEO Global</h2>
          <Button size="sm" variant="outline" onClick={() => saveSetting('seo_global', seo)} disabled={saving.seo_global}>
            <Save className="h-3 w-3 mr-1" />{saved.seo_global ? '¡Guardado!' : saving.seo_global ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Título de la página (ES)</Label>
            <Input value={seo.title_es} onChange={e => setSeo(s => ({ ...s, title_es: e.target.value }))} placeholder="KentoDevLab | Desarrollo web" />
          </div>
          <div className="space-y-1">
            <Label>Título de la página (EN)</Label>
            <Input value={seo.title_en} onChange={e => setSeo(s => ({ ...s, title_en: e.target.value }))} placeholder="KentoDevLab | Web development" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Meta descripción (ES)</Label>
            <Textarea value={seo.description_es} onChange={e => setSeo(s => ({ ...s, description_es: e.target.value }))} rows={2} placeholder="Agencia de desarrollo web..." />
          </div>
          <div className="space-y-1">
            <Label>Meta descripción (EN)</Label>
            <Textarea value={seo.description_en} onChange={e => setSeo(s => ({ ...s, description_en: e.target.value }))} rows={2} placeholder="Web development agency..." />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Keywords (separadas por coma)</Label>
            <Input value={seo.keywords} onChange={e => setSeo(s => ({ ...s, keywords: e.target.value }))} placeholder="desarrollo web, nextjs, react" />
          </div>
          <div className="space-y-1">
            <Label>Imagen OG (URL)</Label>
            <Input value={seo.og_image} onChange={e => setSeo(s => ({ ...s, og_image: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
      </section>

      {/* THEME */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tema visual</h2>
          <Button size="sm" variant="outline" onClick={() => saveSetting('theme', theme)} disabled={saving.theme}>
            <Save className="h-3 w-3 mr-1" />{saved.theme ? '¡Guardado!' : saving.theme ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Color primario</Label>
            <div className="flex gap-2">
              <input type="color" value={theme.primary_color} onChange={e => setTheme(t => ({ ...t, primary_color: e.target.value }))} className="h-10 w-12 cursor-pointer rounded border border-input" />
              <Input value={theme.primary_color} onChange={e => setTheme(t => ({ ...t, primary_color: e.target.value }))} placeholder="#7c3aed" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Color de acento</Label>
            <div className="flex gap-2">
              <input type="color" value={theme.accent_color} onChange={e => setTheme(t => ({ ...t, accent_color: e.target.value }))} className="h-10 w-12 cursor-pointer rounded border border-input" />
              <Input value={theme.accent_color} onChange={e => setTheme(t => ({ ...t, accent_color: e.target.value }))} placeholder="#a78bfa" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Fuente de títulos</Label>
            <Input value={theme.font_heading} onChange={e => setTheme(t => ({ ...t, font_heading: e.target.value }))} placeholder="Inter, sans-serif" />
          </div>
          <div className="space-y-1">
            <Label>Fuente de cuerpo</Label>
            <Input value={theme.font_body} onChange={e => setTheme(t => ({ ...t, font_body: e.target.value }))} placeholder="Inter, sans-serif" />
          </div>
        </div>
      </section>
    </div>
  );
}
