'use client';

import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: unknown;
}

const SETTING_KEYS = ['header', 'footer', 'seo_global', 'theme'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/landing/settings');
    if (res.ok) {
      const data: Setting[] = await res.json();
      const map: Record<string, string> = {};
      for (const s of data) {
        map[s.key] = JSON.stringify(s.value ?? {}, null, 2);
      }
      setSettings(map);
    }
    setLoading(false);
  }

  async function saveSetting(key: string) {
    setSaving(s => ({ ...s, [key]: true }));
    let value: unknown = {};
    try {
      value = JSON.parse(settings[key] ?? '{}');
    } catch {
      alert('JSON inválido');
      setSaving(s => ({ ...s, [key]: false }));
      return;
    }
    await fetch('/api/landing/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setSaving(s => ({ ...s, [key]: false }));
  }

  async function publishAll() {
    setPublishing(true);
    await fetch('/api/landing/publish', { method: 'POST' });
    setPublishing(false);
    setPublished(true);
    setTimeout(() => setPublished(false), 3000);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración Landing</h1>
          <p className="text-muted-foreground">Edita el JSON de header, footer, SEO y tema</p>
        </div>
        <button
          onClick={publishAll}
          disabled={publishing}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${publishing ? 'animate-spin' : ''}`} />
          {published ? '¡Publicado!' : publishing ? 'Publicando...' : 'Publicar todo'}
        </button>
      </div>

      {SETTING_KEYS.map(key => (
        <div key={key} className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold capitalize">{key.replace('_', ' ')}</h2>
            <button
              onClick={() => saveSetting(key)}
              disabled={saving[key]}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
            >
              <Save className="h-3 w-3" />
              {saving[key] ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          <textarea
            value={settings[key] ?? '{}'}
            onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
            rows={8}
            spellCheck={false}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      ))}
    </div>
  );
}
