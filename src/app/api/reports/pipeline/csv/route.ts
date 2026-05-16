import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { NextRequest } from 'next/server';

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = String(r[h] ?? '').replace(/"/g, '""');
        return `"${v}"`;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scoped = session.role === 'seller';
  const [stagesRes, dealsRes] = await Promise.all([
    supabaseServer.from('pipeline_stages').select('name, is_won, is_lost').order('position'),
    scoped
      ? supabaseServer.from('deals').select('name, stage, value, probability, expected_close_date, created_at').eq('owner_id', session.sub)
      : supabaseServer.from('deals').select('name, stage, value, probability, expected_close_date, created_at, owner:users(first_name, last_name)'),
  ]);

  const stages = stagesRes.data ?? [];
  const stageMap = Object.fromEntries(stages.map(s => [s.name, s]));
  const deals = (dealsRes.data ?? []).map((d: Record<string, unknown>) => ({
    Nombre: d.name ?? '',
    Etapa: d.stage ?? '',
    Valor: d.value ?? 0,
    Probabilidad: d.probability ?? 0,
    Estado: stageMap[d.stage as string]?.is_won ? 'Ganado' : stageMap[d.stage as string]?.is_lost ? 'Perdido' : 'Activo',
    Cierre_esperado: d.expected_close_date ? new Date(d.expected_close_date as string).toLocaleDateString('es-ES') : '',
    Creado: d.created_at ? new Date(d.created_at as string).toLocaleDateString('es-ES') : '',
  }));

  const csv = toCSV(deals);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pipeline-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
