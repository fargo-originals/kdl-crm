'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { STATUS_LABELS, STATUS_VARIANTS } from '@/lib/quotes/types';
import type { Quote } from '@/lib/quotes/types';

function formatEur(v: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v);
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/quotes');
    const data = await res.json();
    setQuotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleNew() {
    const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [] }) });
    const data = await res.json();
    if (data.id) router.push(`/quotes/${data.id}`);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground">Propuestas y presupuestos para tus clientes</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo presupuesto
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay presupuestos todavía</p>
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" />Crear primer presupuesto</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
              <span className="col-span-2">Número</span>
              <span className="col-span-3">Cliente / Empresa</span>
              <span className="col-span-2">Deal</span>
              <span className="col-span-2">Estado</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1 text-right">Fecha</span>
            </div>
            <div className="divide-y">
              {quotes.map(q => (
                <div
                  key={q.id}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/quotes/${q.id}`)}
                >
                  <span className="col-span-2 font-mono text-sm font-medium">{q.number}</span>
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(q.contact as { first_name?: string; last_name?: string } | null)?.first_name
                        ? `${(q.contact as { first_name: string; last_name: string }).first_name} ${(q.contact as { first_name: string; last_name: string }).last_name}`
                        : (q.company as { name?: string } | null)?.name ?? '—'}
                    </p>
                  </div>
                  <span className="col-span-2 text-sm text-muted-foreground truncate">
                    {(q.deal as { name?: string } | null)?.name ?? '—'}
                  </span>
                  <div className="col-span-2">
                    <Badge variant={STATUS_VARIANTS[q.status] as 'secondary' | 'outline' | 'success' | 'destructive'}>
                      {STATUS_LABELS[q.status]}
                    </Badge>
                  </div>
                  <span className="col-span-2 text-right text-sm font-semibold">{formatEur(Number(q.total))}</span>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <button onClick={e => handleDelete(e, q.id)} className="text-muted-foreground hover:text-destructive ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
