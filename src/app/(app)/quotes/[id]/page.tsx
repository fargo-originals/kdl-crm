'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner, PageSpinner } from '@/components/ui/spinner';
import { Plus, Trash2, Printer, Send, ArrowLeft, Copy, Check } from 'lucide-react';
import { calcTotals, STATUS_LABELS, STATUS_VARIANTS } from '@/lib/quotes/types';
import type { Quote, QuoteItem } from '@/lib/quotes/types';
import Link from 'next/link';

function formatEur(v: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
}

function newItem(): QuoteItem {
  return { id: crypto.randomUUID(), description: '', qty: 1, unit_price: 0, tax_pct: 21 };
}

export default function QuoteBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [showSendForm, setShowSendForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/quotes/${id}`);
    if (!res.ok) { router.push('/quotes'); return; }
    const data: Quote = await res.json();
    setQuote(data);
    setItems(data.items ?? []);
    setDiscountPct(data.discount_pct ?? 0);
    setValidUntil(data.valid_until ?? '');
    setNotes(data.notes ?? '');
    if (data.contact) {
      setSendEmail((data.contact as { email?: string }).email ?? '');
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const { subtotal, tax_amount, total } = calcTotals(items, discountPct);

  async function save() {
    setSaving(true);
    await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, discount_pct: discountPct, valid_until: validUntil || null, notes: notes || null }),
    });
    setSaving(false);
    load();
  }

  async function sendQuote() {
    setSending(true);
    const res = await fetch(`/api/quotes/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sendEmail }),
    });
    setSending(false);
    if (res.ok) { setShowSendForm(false); load(); }
  }

  function updateItem(idx: number, field: keyof QuoteItem, value: string | number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function copyPublicUrl() {
    const url = `${window.location.origin}/q/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!quote) return <PageSpinner />;

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/q/${id}` : `/q/${id}`;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/quotes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-mono">{quote.number}</h1>
            <Badge variant={STATUS_VARIANTS[quote.status] as 'secondary' | 'outline' | 'success' | 'destructive'}>
              {STATUS_LABELS[quote.status]}
            </Badge>
          </div>
          {(quote.company || quote.contact) && (
            <p className="text-sm text-muted-foreground">
              {(quote.contact as { first_name?: string; last_name?: string } | null)
                ? `${(quote.contact as { first_name: string; last_name: string }).first_name} ${(quote.contact as { first_name: string; last_name: string }).last_name}`
                : (quote.company as { name?: string } | null)?.name}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyPublicUrl}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? 'Copiado' : 'Link público'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSendForm(v => !v)}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Spinner size="sm" tone="current" className="mr-1.5" /> : null}
            Guardar
          </Button>
        </div>
      </div>

      {/* Send form */}
      {showSendForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Enviar a:</Label>
                <Input
                  type="email"
                  value={sendEmail}
                  onChange={e => setSendEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
              <Button onClick={sendQuote} disabled={sending || !sendEmail}>
                {sending ? <Spinner size="sm" tone="current" /> : <><Send className="h-3.5 w-3.5 mr-1.5" />Enviar</>}
              </Button>
              <Button variant="outline" onClick={() => setShowSendForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Válido hasta</Label>
          <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Descuento global (%)</Label>
          <Input type="number" min="0" max="100" value={discountPct}
            onChange={e => setDiscountPct(Number(e.target.value))} />
        </div>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Líneas de presupuesto</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems(prev => [...prev, newItem()])}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Añadir línea
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin líneas. Añade conceptos arriba.
            </p>
          ) : (
            <div>
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
                <span className="col-span-5">Descripción</span>
                <span className="col-span-2 text-right">Cant.</span>
                <span className="col-span-2 text-right">Precio unit.</span>
                <span className="col-span-1 text-right">IVA %</span>
                <span className="col-span-1 text-right">Subtotal</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, idx) => {
                const lineTotal = item.qty * item.unit_price;
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2 border-b last:border-0">
                    <div className="col-span-5">
                      <Input
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder="Descripción del servicio..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min="0" step="0.5"
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min="0" step="0.01"
                        value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <Select
                        value={String(item.tax_pct)}
                        onChange={e => updateItem(idx, 'tax_pct', Number(e.target.value))}
                        className="h-8 text-sm"
                      >
                        <option value="0">0%</option>
                        <option value="10">10%</option>
                        <option value="21">21%</option>
                      </Select>
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium">{formatEur(lineTotal)}</div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatEur(subtotal)}</span>
          </div>
          {discountPct > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Descuento ({discountPct}%)</span>
              <span>−{formatEur(subtotal * discountPct / 100)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA</span>
            <span>{formatEur(tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total</span>
            <span>{formatEur(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notas / condiciones</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
          placeholder="Condiciones de pago, plazo de entrega, etc."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
