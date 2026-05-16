export interface QuoteItem {
  id: string;           // client-side uuid for keying
  description: string;
  qty: number;
  unit_price: number;
  tax_pct: number;      // 0 | 10 | 21
}

export interface Quote {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  owner_id: string;
  number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: QuoteItem[];
  subtotal: number;
  discount_pct: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  deal?: { name: string } | null;
  company?: { name: string } | null;
  contact?: { first_name: string; last_name: string; email: string } | null;
  owner?: { first_name: string; last_name: string; email: string } | null;
}

export const STATUS_LABELS: Record<Quote['status'], string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  expired: 'Expirado',
};

export const STATUS_VARIANTS: Record<Quote['status'], string> = {
  draft: 'secondary',
  sent: 'outline',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'secondary',
};

/** Recalculate totals from items + discount */
export function calcTotals(items: QuoteItem[], discountPct: number) {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discounted = subtotal * (1 - discountPct / 100);
  const taxAmount = items.reduce((s, it) => {
    const lineTotal = it.qty * it.unit_price * (1 - discountPct / 100);
    return s + lineTotal * (it.tax_pct / 100);
  }, 0);
  const total = discounted + taxAmount;
  return { subtotal, tax_amount: taxAmount, total };
}
