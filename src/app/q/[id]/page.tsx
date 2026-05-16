'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Printer, Globe } from 'lucide-react';
import { STATUS_LABELS, STATUS_VARIANTS } from '@/lib/quotes/types';
import type { Quote, QuoteItem } from '@/lib/quotes/types';

function formatEur(v: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
}

export default function PublicQuotePage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    fetch(`/api/public/quotes/${id}`)
      .then(r => r.json())
      .then(d => { setQuote(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function respond(action: 'accept' | 'reject') {
    setResponding(true);
    const res = await fetch(`/api/public/quotes/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setResponding(false);
    if (res.ok) setResponded(action === 'accept' ? 'accepted' : 'rejected');
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Globe className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!quote) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center px-4">
      <h1 className="text-xl font-bold">Presupuesto no encontrado</h1>
      <p className="text-muted-foreground">Este enlace no es válido o el presupuesto ha sido eliminado.</p>
    </div>
  );

  const items = (quote.items ?? []) as QuoteItem[];
  const owner = quote.owner as { first_name?: string; last_name?: string; email?: string } | null;
  const company = quote.company as { name?: string; website?: string } | null;
  const contact = quote.contact as { first_name?: string; last_name?: string; email?: string } | null;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12 print:py-4">

        {/* Logo / Sender */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-primary">Kento Dev Lab</p>
            {owner && (
              <p className="text-sm text-muted-foreground">{owner.first_name} {owner.last_name} · {owner.email}</p>
            )}
          </div>
          <Badge variant={STATUS_VARIANTS[quote.status] as 'secondary' | 'outline' | 'success' | 'destructive'}>
            {STATUS_LABELS[quote.status]}
          </Badge>
        </div>

        {/* Quote header */}
        <div className="bg-white rounded-xl border p-6 mb-6 print:border-none print:shadow-none">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Presupuesto</p>
              <h1 className="text-2xl font-bold font-mono">{quote.number}</h1>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Fecha: {new Date(quote.created_at).toLocaleDateString('es-ES')}</p>
              {quote.valid_until && (
                <p className="text-muted-foreground">Válido hasta: {new Date(quote.valid_until).toLocaleDateString('es-ES')}</p>
              )}
            </div>
          </div>

          {(contact || company) && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Para</p>
              {contact && <p className="font-medium">{contact.first_name} {contact.last_name}</p>}
              {company && <p className="text-sm text-muted-foreground">{company.name}</p>}
              {contact?.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border mb-6 overflow-hidden print:border-none">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 print:bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-16">Cant.</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">P. Unit.</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-16">IVA</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(it => (
                <tr key={it.id}>
                  <td className="px-4 py-3">{it.description}</td>
                  <td className="px-4 py-3 text-right">{it.qty}</td>
                  <td className="px-4 py-3 text-right">{formatEur(it.unit_price)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{it.tax_pct}%</td>
                  <td className="px-4 py-3 text-right font-medium">{formatEur(it.qty * it.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border p-6 mb-6 print:border-none">
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatEur(Number(quote.subtotal))}</span>
            </div>
            {Number(quote.discount_pct) > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Descuento ({quote.discount_pct}%)</span>
                <span>−{formatEur(Number(quote.subtotal) * Number(quote.discount_pct) / 100)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span>{formatEur(Number(quote.tax_amount))}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>{formatEur(Number(quote.total))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-xl border p-6 mb-6 text-sm text-muted-foreground print:border-none">
            <p className="font-medium text-foreground mb-1">Notas</p>
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Accept/Reject — only when sent and not yet responded */}
        {!responded && quote.status === 'sent' && (
          <div className="bg-white rounded-xl border p-6 print:hidden">
            <p className="text-sm font-medium mb-4 text-center">¿Deseas aceptar o rechazar este presupuesto?</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => respond('accept')} disabled={responding} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Aceptar presupuesto
              </Button>
              <Button variant="destructive" onClick={() => respond('reject')} disabled={responding} className="gap-2">
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            </div>
          </div>
        )}

        {responded && (
          <div className={`rounded-xl border p-6 text-center print:hidden ${responded === 'accepted' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {responded === 'accepted'
              ? <><CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" /><p className="font-semibold text-green-800">¡Presupuesto aceptado! Nos pondremos en contacto contigo pronto.</p></>
              : <><XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" /><p className="font-semibold text-red-800">Presupuesto rechazado. Gracias por tu respuesta.</p></>
            }
          </div>
        )}

        {/* Print button */}
        <div className="flex justify-center mt-6 print:hidden">
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
