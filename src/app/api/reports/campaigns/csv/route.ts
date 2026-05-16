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
  const query = supabaseServer
    .from('email_campaigns')
    .select('name, status, sector, sent_count, opened_count, clicked_count, bounced_count, sent_at, created_at')
    .order('created_at', { ascending: false });

  if (scoped) query.eq('user_id', session.sub);

  const { data: campaigns } = await query;

  const rows = (campaigns ?? []).map((c: Record<string, unknown>) => {
    const sent = Number(c.sent_count ?? 0);
    const opened = Number(c.opened_count ?? 0);
    const clicked = Number(c.clicked_count ?? 0);
    return {
      Nombre: c.name ?? '',
      Estado: c.status ?? '',
      Sector: c.sector ?? '',
      Enviados: sent,
      Abiertos: opened,
      'Apertura_%': sent > 0 ? Math.round((opened / sent) * 100) : 0,
      Clics: clicked,
      'Clics_%': sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      Rebotes: c.bounced_count ?? 0,
      Enviado_el: c.sent_at ? new Date(c.sent_at as string).toLocaleDateString('es-ES') : '',
      Creado: c.created_at ? new Date(c.created_at as string).toLocaleDateString('es-ES') : '',
    };
  });

  return new NextResponse(toCSV(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="campanas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
