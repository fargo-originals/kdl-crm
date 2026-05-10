'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { SECTOR_LABELS, TEMPLATE_LABELS, TONO_LABELS, renderTemplate } from '@/lib/campaigns/templates';
import { X } from 'lucide-react';

const SAMPLE_VARS = {
  firstName: 'María',
  businessName: 'Café Central',
  neighborhood: 'Malasaña',
  rating: '4.8',
  reviewCount: '312',
  websiteUrl: 'https://example.com',
  category: 'café',
};

interface Props {
  onClose?: () => void;
}

export function CampaignForm({ onClose }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  const [form, setForm] = useState({
    name: '',
    sector: 'restaurantes' as keyof typeof SECTOR_LABELS,
    tono: 'tu_cercano',
    templateType: 'email_1_first_contact' as keyof typeof TEMPLATE_LABELS,
    subject: '',
    bodyHtml: '',
  });

  const previewData = (() => {
    try {
      return renderTemplate(
        form.templateType as Parameters<typeof renderTemplate>[0],
        form.sector as Parameters<typeof renderTemplate>[1],
        SAMPLE_VARS,
      );
    } catch {
      return null;
    }
  })();

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      ...form,
      subject: form.subject || previewData?.subject || '',
      bodyHtml: form.bodyHtml || previewData?.bodyHtml || '',
    };

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Error al crear la campaña');
        return;
      }
      router.push(`/campaigns/${json.data.id}`);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Nueva campaña de email</CardTitle>
            <CardDescription>Configura el sector, plantilla y asunto. Puedes editar el cuerpo después.</CardDescription>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-1">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre de la campaña</Label>
              <Input
                id="name"
                placeholder="Restaurantes Malasaña — Email 1"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector</Label>
              <Select
                id="sector"
                value={form.sector}
                onChange={e => set('sector', e.target.value)}
              >
                {(Object.entries(SECTOR_LABELS) as [string, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tono">Tono</Label>
              <Select
                id="tono"
                value={form.tono}
                onChange={e => set('tono', e.target.value)}
              >
                {(Object.entries(TONO_LABELS) as [string, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="templateType">Plantilla</Label>
              <Select
                id="templateType"
                value={form.templateType}
                onChange={e => set('templateType', e.target.value as keyof typeof TEMPLATE_LABELS)}
              >
                {(Object.entries(TEMPLATE_LABELS) as [string, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">
              Asunto{' '}
              {previewData && !form.subject && (
                <span className="text-xs text-muted-foreground">(auto: {previewData.subject})</span>
              )}
            </Label>
            <Input
              id="subject"
              placeholder={previewData?.subject ?? 'Asunto del email'}
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
            />
          </div>

          {previewData && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Vista previa con datos de ejemplo</p>
                <button
                  type="button"
                  onClick={() => setPreview(p => !p)}
                  className="text-xs text-primary hover:underline"
                >
                  {preview ? 'Ocultar' : 'Ver preview'}
                </button>
              </div>
              {preview && (
                <div
                  className="text-sm border rounded-md bg-white p-3 max-h-64 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: previewData.bodyHtml }}
                />
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || !form.name}>
              {loading ? <><Spinner size="sm" tone="current" className="mr-2" /> Creando...</> : 'Crear campaña'}
            </Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
