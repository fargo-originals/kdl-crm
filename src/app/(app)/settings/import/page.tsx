"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, File, ArrowRight } from "lucide-react";

// ── Entity definitions ─────────────────────────────────────────────────────────

type EntityType = 'contacts' | 'companies' | 'leads';

const ENTITY_FIELDS: Record<EntityType, Array<{ key: string; label: string; required?: boolean }>> = {
  contacts: [
    { key: 'first_name', label: 'Nombre', required: true },
    { key: 'last_name',  label: 'Apellido', required: true },
    { key: 'email',      label: 'Email' },
    { key: 'phone',      label: 'Teléfono' },
    { key: 'job_title',  label: 'Cargo' },
    { key: 'company',    label: 'Empresa (nombre)' },
    { key: 'notes',      label: 'Notas' },
  ],
  companies: [
    { key: 'name',     label: 'Nombre', required: true },
    { key: 'domain',   label: 'Dominio / Web' },
    { key: 'industry', label: 'Sector' },
    { key: 'phone',    label: 'Teléfono' },
    { key: 'email',    label: 'Email' },
    { key: 'city',     label: 'Ciudad' },
    { key: 'notes',    label: 'Notas' },
  ],
  leads: [
    { key: 'full_name',     label: 'Nombre completo', required: true },
    { key: 'email',         label: 'Email', required: true },
    { key: 'phone',         label: 'Teléfono' },
    { key: 'business_name', label: 'Empresa' },
    { key: 'business_type', label: 'Sector' },
    { key: 'message',       label: 'Mensaje' },
  ],
};

// Auto-suggest: map common CSV header names to CRM field keys
const SUGGESTIONS: Record<string, string> = {
  nombre: 'first_name', name: 'first_name', first_name: 'first_name', 'nombre *': 'first_name',
  apellido: 'last_name', last_name: 'last_name', surname: 'last_name',
  email: 'email', correo: 'email', 'e-mail': 'email',
  telefono: 'phone', teléfono: 'phone', phone: 'phone', tel: 'phone', móvil: 'phone',
  cargo: 'job_title', puesto: 'job_title', job_title: 'job_title', position: 'job_title',
  empresa: 'company', company: 'company', compañia: 'company', 'nombre empresa': 'name',
  dominio: 'domain', domain: 'domain', web: 'domain', website: 'domain',
  sector: 'industry', industria: 'industry', industry: 'industry', business_type: 'business_type',
  ciudad: 'city', city: 'city',
  notas: 'notes', notes: 'notes', comentarios: 'notes',
  'nombre completo': 'full_name', full_name: 'full_name', 'nombre y apellido': 'full_name',
  negocio: 'business_name', business_name: 'business_name',
  mensaje: 'message', message: 'message',
};

// ── CSV parsing ────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Simple CSV parser (handles quoted fields with commas)
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(field.trim()); field = '';
      } else {
        field += ch;
      }
    }
    result.push(field.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// ── Step indicators ────────────────────────────────────────────────────────────

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {done ? '✓' : n}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type ImportStep = 'entity' | 'upload' | 'map' | 'preview' | 'done';

export default function ImportDataPage() {
  const [step, setStep] = useState<ImportStep>('entity');
  const [entity, setEntity] = useState<EntityType>('contacts');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // crmField → csvHeader
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields = ENTITY_FIELDS[entity];

  // Auto-suggest mapping from CSV headers
  const autoSuggestMapping = useCallback((headers: string[]): Record<string, string> => {
    const suggested: Record<string, string> = {};
    for (const field of ENTITY_FIELDS[entity]) {
      for (const h of headers) {
        const norm = h.toLowerCase().trim();
        if (SUGGESTIONS[norm] === field.key || norm === field.key) {
          suggested[field.key] = h;
          break;
        }
      }
    }
    return suggested;
  }, [entity]);

  // File upload & parse
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const { headers, rows } = parseCSV(text);
    if (headers.length === 0) { alert('No se pudo leer el archivo. Verifica que sea un CSV válido.'); return; }
    setCsvHeaders(headers);
    setCsvRows(rows);
    setMapping(autoSuggestMapping(headers));
    setStep('map');
  }

  // Get value from a row by CRM field key
  function getValue(row: string[], crmField: string): string {
    const csvCol = mapping[crmField];
    if (!csvCol) return '';
    const idx = csvHeaders.indexOf(csvCol);
    return idx >= 0 ? (row[idx] ?? '').trim() : '';
  }

  // Build row object from mapping
  function buildRecord(row: string[]): Record<string, string> {
    const record: Record<string, string> = {};
    for (const f of fields) {
      const val = getValue(row, f.key);
      if (val) record[f.key] = val;
    }
    return record;
  }

  // Import all rows
  async function handleImport() {
    setImporting(true);
    let created = 0, updated = 0, failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const record = buildRecord(csvRows[i]);
      if (Object.keys(record).length === 0) continue;

      // Check required fields
      const missingRequired = fields.filter(f => f.required && !record[f.key]);
      if (missingRequired.length > 0) {
        failed++;
        errors.push(`Fila ${i + 2}: faltan campos obligatorios (${missingRequired.map(f => f.label).join(', ')})`);
        continue;
      }

      try {
        if (entity === 'contacts') {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: record.first_name ?? '',
              last_name: record.last_name ?? '',
              email: record.email || null,
              phone: record.phone || null,
              job_title: record.job_title || null,
              notes: record.notes || null,
              lifecycle_stage: 'lead',
            }),
          });
          if (res.ok) created++; else { const d = await res.json(); if (d.error?.includes('duplicate') || d.error?.includes('unique')) updated++; else { failed++; errors.push(`Fila ${i + 2}: ${d.error}`); } }

        } else if (entity === 'companies') {
          const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: record.name,
              domain: record.domain || null,
              industry: record.industry || null,
              phone: record.phone || null,
              email: record.email || null,
              city: record.city || null,
              notes: record.notes || null,
            }),
          });
          if (res.ok) created++; else { failed++; const d = await res.json(); errors.push(`Fila ${i + 2}: ${d.error}`); }

        } else if (entity === 'leads') {
          const res = await fetch('/api/leads/csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: record.full_name,
              email: record.email,
              phone: record.phone || null,
              business_name: record.business_name || null,
              business_type: record.business_type || null,
              message: record.message || null,
              status: 'new',
              source: 'import',
            }),
          });
          if (res.ok) created++; else { failed++; const d = await res.json(); errors.push(`Fila ${i + 2}: ${d.error}`); }
        }
      } catch (err) {
        failed++;
        errors.push(`Fila ${i + 2}: error inesperado`);
      }
    }

    setResult({ created, updated, failed, errors });
    setImporting(false);
    setStep('done');
  }

  function reset() {
    setStep('entity'); setCsvHeaders([]); setCsvRows([]); setMapping({}); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const validRows = csvRows.filter(r => {
    const rec = buildRecord(r);
    return fields.filter(f => f.required).every(f => rec[f.key]);
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Importar Datos</h1>
        <p className="text-muted-foreground">Importa contactos, empresas o leads desde un archivo CSV</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-3 flex-wrap">
        <Step n={1} label="Tipo" active={step === 'entity'} done={step !== 'entity'} />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Step n={2} label="Subir CSV" active={step === 'upload'} done={['map','preview','done'].includes(step)} />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Step n={3} label="Mapear columnas" active={step === 'map'} done={step === 'done'} />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Step n={4} label="Resultado" active={step === 'done'} done={false} />
      </div>

      {/* Step 1 — Entity type */}
      {step === 'entity' && (
        <Card>
          <CardHeader>
            <CardTitle>¿Qué quieres importar?</CardTitle>
            <CardDescription>Elige el tipo de datos de tu CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'contacts', label: 'Contactos', desc: 'Personas con email y teléfono' },
                { value: 'companies', label: 'Empresas', desc: 'Negocios y organizaciones' },
                { value: 'leads', label: 'Leads', desc: 'Potenciales clientes / inquiries' },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => setEntity(opt.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    entity === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                  }`}>
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Campos requeridos para {entity === 'contacts' ? 'contactos' : entity === 'companies' ? 'empresas' : 'leads'}:</p>
              <div className="flex gap-1.5 flex-wrap">
                {fields.map(f => (
                  <Badge key={f.key} variant={f.required ? 'default' : 'secondary'} className="text-xs">{f.label}{f.required ? ' *' : ''}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep('upload')}>Continuar →</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Subir archivo CSV</CardTitle>
            <CardDescription>
              El archivo debe tener cabeceras en la primera fila. Separador: coma (,). Codificación: UTF-8.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors">
              <File className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Haz clic para seleccionar un archivo CSV</span>
              <span className="text-xs text-muted-foreground/60 mt-1">o arrastra y suelta aquí</span>
              <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            </label>
            <Button variant="outline" onClick={() => setStep('entity')}>← Cambiar tipo</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Column mapping */}
      {step === 'map' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Mapear columnas</CardTitle>
              <CardDescription>
                Detectadas {csvHeaders.length} columnas · {csvRows.length} filas · Asocia cada campo del CRM con la columna correcta del CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      {f.label}
                      {f.required && <span className="text-destructive">*</span>}
                      {mapping[f.key] && <Badge variant="outline" className="text-xs ml-1">auto</Badge>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                      className="text-sm"
                    >
                      <option value="">— No importar —</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vista previa (primeras 3 filas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {fields.filter(f => mapping[f.key]).map(f => (
                        <th key={f.key} className="text-left p-2 font-medium text-muted-foreground">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        {fields.filter(f => mapping[f.key]).map(f => (
                          <td key={f.key} className="p-2 max-w-[140px] truncate">{getValue(row, f.key) || <span className="text-muted-foreground/40">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {validRows.length} de {csvRows.length} filas válidas (con campos obligatorios rellenos)
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>← Cambiar archivo</Button>
            <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
              {importing
                ? <><Spinner size="sm" tone="current" className="mr-2" />Importando...</>
                : `Importar ${validRows.length} registro${validRows.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — Result */}
      {step === 'done' && result && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-start gap-4">
              {result.failed === 0
                ? <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
                : <AlertCircle className="h-10 w-10 text-amber-500 shrink-0" />}
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-lg">Importación completada</p>
                <div className="flex gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{result.created}</p>
                    <p className="text-xs text-muted-foreground">Creados</p>
                  </div>
                  {result.updated > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                      <p className="text-xs text-muted-foreground">Actualizados</p>
                    </div>
                  )}
                  {result.failed > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                      <p className="text-xs text-muted-foreground">Fallidos</p>
                    </div>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-3 rounded-md bg-muted p-3 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                  </div>
                )}
                <Button className="mt-4" onClick={reset}>Nueva importación</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
