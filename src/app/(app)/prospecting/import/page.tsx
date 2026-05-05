'use client';

import { useState, useRef, useCallback } from 'react';
import { read, utils } from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Globe, GlobeOff, Mail, Phone, MessageCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ApifyLeadRow } from '@/app/api/leads/import/route';

// Apify Google Maps Scraper field mapping
const APIFY_FIELD_MAP: Record<string, keyof ApifyLeadRow | '__address' | '__maps_url' | '__rating' | '__reviews'> = {
  title: 'business_name',
  name: 'business_name',
  'nombre del negocio': 'business_name',
  phone: 'phone',
  phonenumber: 'phone',
  phoneunformatted: 'phone',
  teléfono: 'phone',
  telefono: 'phone',
  email: 'email',
  correo: 'email',
  website: 'website_url',
  url: '__maps_url',
  categoryname: 'business_type',
  category: 'business_type',
  categoría: 'business_type',
  address: '__address',
  dirección: '__address',
  totalscore: '__rating',
  reviewscount: '__reviews',
};

function parseRows(sheet: ReturnType<typeof utils.sheet_to_json>): ApifyLeadRow[] {
  return (sheet as Record<string, unknown>[]).map(raw => {
    const row: Partial<ApifyLeadRow> & { __address?: string; __maps_url?: string; __rating?: number; __reviews?: number } = {};
    for (const [key, value] of Object.entries(raw)) {
      const mapped = APIFY_FIELD_MAP[key.toLowerCase().trim().replace(/\s+/g, '_')];
      if (!mapped || value == null || value === '') continue;
      const str = String(value).trim();
      if (mapped === 'business_name') row.business_name = str;
      else if (mapped === 'phone') row.phone = str;
      else if (mapped === 'email') row.email = str;
      else if (mapped === 'website_url') { row.website_url = str; row.has_website = str !== '' && str !== 'N/A'; }
      else if (mapped === 'business_type') row.business_type = str;
      else if (mapped === '__address') row.address = str;
      else if (mapped === '__maps_url') row.maps_url = str;
      else if (mapped === '__rating') row.rating = parseFloat(str) || undefined;
      else if (mapped === '__reviews') row.reviews_count = parseInt(str) || undefined;
    }
    if (row.has_website === undefined) row.has_website = false;
    return row as ApifyLeadRow;
  }).filter(r => r.business_name);
}

function detectChannel(row: ApifyLeadRow): 'email' | 'whatsapp' | 'phone' {
  if (row.email) return 'email';
  if (row.phone) {
    const digits = row.phone.replace(/\D/g, '');
    const local = digits.startsWith('34') ? digits.slice(2) : digits;
    if (local.startsWith('6') || local.startsWith('7')) return 'whatsapp';
  }
  return 'phone';
}

export default function ApifyImportPage() {
  const [leads, setLeads] = useState<ApifyLeadRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoContact, setAutoContact] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setResult(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { defval: '' });
      setLeads(parseRows(rows));
    } catch {
      alert('No se pudo procesar el archivo. Asegúrate de que es un CSV o XLS válido.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const channelCounts = leads.reduce(
    (acc, r) => { acc[detectChannel(r)]++; return acc; },
    { email: 0, whatsapp: 0, phone: 0 }
  );
  const withWebsite = leads.filter(r => r.has_website).length;
  const withoutWebsite = leads.filter(r => !r.has_website).length;
  const contactable = channelCounts.email + channelCounts.whatsapp;

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, auto_contact: autoContact }),
      });
      const data = await res.json();
      setResult(data.results);
      setLeads([]);
      setFileName('');
    } catch {
      alert('Error al importar. Inténtalo de nuevo.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar desde Apify</h1>
        <p className="text-muted-foreground">Sube el CSV o XLS exportado de Google Maps Scraper.</p>
      </div>

      {/* Upload zone */}
      {leads.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Subir archivo</CardTitle>
            <CardDescription>
              Exporta tu dataset desde Apify (CSV o XLS) y arrástralo aquí. Columnas detectadas automáticamente:
              title, phone, email, website, categoryName, address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-primary/50 hover:bg-muted/30"
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
            >
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Arrastra aquí o haz clic para seleccionar</span>
              <span className="text-xs text-muted-foreground mt-1">CSV · XLS · XLSX</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Procesando archivo...
        </div>
      )}

      {/* Stats + preview */}
      {leads.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{leads.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total leads</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{channelCounts.email}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <Mail className="h-3 w-3" /> Email
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{channelCounts.whatsapp}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{channelCounts.phone}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <Phone className="h-3 w-3" /> Llamada manual
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{withoutWebsite}</div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                <GlobeOff className="h-3 w-3" /> Sin web
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Previsualización — {fileName}</CardTitle>
                <button onClick={() => { setLeads([]); setFileName(''); }} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      {['Negocio', 'Teléfono', 'Email', 'Sector', 'Web', 'Canal'].map(h => (
                        <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 100).map((row, i) => {
                      const ch = detectChannel(row);
                      return (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{row.business_name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{row.phone ?? '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{row.email ?? '—'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{row.business_type ?? '—'}</td>
                          <td className="px-4 py-2">
                            {row.has_website
                              ? <Globe className="h-4 w-4 text-blue-500" />
                              : <GlobeOff className="h-4 w-4 text-muted-foreground/40" />}
                          </td>
                          <td className="px-4 py-2">
                            {ch === 'email' && <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5"><Mail className="h-3 w-3" /> Email</span>}
                            {ch === 'whatsapp' && <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5"><MessageCircle className="h-3 w-3" /> WhatsApp</span>}
                            {ch === 'phone' && <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 rounded-full px-2 py-0.5"><Phone className="h-3 w-3" /> Llamar</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {leads.length > 100 && (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    Mostrando 100 de {leads.length}. Se importarán todos.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoContact}
                  onChange={e => setAutoContact(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border"
                />
                <div>
                  <p className="font-medium">Contactar automáticamente al importar</p>
                  <p className="text-sm text-muted-foreground">
                    El agente IA enviará un mensaje a los {contactable} leads con email o WhatsApp.
                    Los {channelCounts.phone} de teléfono fijo quedarán pendientes de llamada manual.
                  </p>
                </div>
              </label>
              <div className="flex gap-3">
                <Button onClick={handleImport} disabled={importing}>
                  {importing
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                    : `Importar ${leads.length} leads`}
                </Button>
                <Button variant="outline" onClick={() => { setLeads([]); setFileName(''); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              {result.errors === 0
                ? <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
                : <AlertCircle className="h-8 w-8 text-yellow-500 shrink-0" />}
              <div>
                <p className="font-semibold">Importación completada</p>
                <p className="text-sm text-muted-foreground">
                  {result.imported} leads importados · {result.skipped} omitidos (sin datos de contacto) · {result.errors} errores
                </p>
              </div>
              <Button variant="outline" className="ml-auto" onClick={() => setResult(null)}>
                Nueva importación
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
