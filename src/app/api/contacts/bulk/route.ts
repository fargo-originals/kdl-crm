import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * POST /api/contacts/bulk
 * Body: { ids: string[], action: 'delete' | 'export' }
 * For export, returns CSV data directly.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids, action } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
  }

  if (action === 'delete') {
    if (session.role === 'seller') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await supabaseServer.from('contacts').delete().in('id', ids);
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  if (action === 'export') {
    const { data } = await supabaseServer
      .from('contacts')
      .select('first_name, last_name, email, phone, job_title, lifecycle_stage, created_at, company:companies(name)')
      .in('id', ids);

    const rows = (data ?? []).map(c => ({
      Nombre: c.first_name,
      Apellido: c.last_name,
      Email: c.email ?? '',
      Teléfono: c.phone ?? '',
      Cargo: c.job_title ?? '',
      Empresa: (c.company as { name?: string } | null)?.name ?? '',
      Etapa: c.lifecycle_stage,
      Creado: new Date(c.created_at).toLocaleDateString('es-ES'),
    }));

    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contactos-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
