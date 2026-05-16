import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scoped = session.role === 'seller';
  const query = scoped
    ? supabaseServer.from('lead_inquiries').select('full_name, email, phone, business_name, status, created_at').eq('assigned_to', session.sub)
    : supabaseServer.from('lead_inquiries').select('full_name, email, phone, business_name, status, created_at');

  const { data: leads } = await query.order('created_at', { ascending: false });

  const STATUS_LABELS: Record<string, string> = {
    new: 'Nuevo', contacted: 'Contactado', qualified: 'Cualificado',
    scheduled: 'Reunión agendada', won: 'Ganado', lost: 'Perdido',
  };

  const rows = (leads ?? []).map((l: Record<string, unknown>) => ({
    Nombre: l.full_name ?? '',
    Email: l.email ?? '',
    Teléfono: l.phone ?? '',
    Empresa: l.business_name ?? '',
    Estado: STATUS_LABELS[l.status as string] ?? l.status ?? '',
    Fecha: l.created_at ? new Date(l.created_at as string).toLocaleDateString('es-ES') : '',
  }));

  return new NextResponse(toCSV(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
