import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { notify } from '@/lib/notifications';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: appt } = await supabaseServer
    .from('appointments')
    .select('*, lead_inquiries(full_name, email, assigned_to)')
    .eq('id', id)
    .maybeSingle();

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseServer
    .from('appointments')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id);

  await supabaseServer
    .from('lead_inquiries')
    .update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('id', appt.lead_id);

  const lead = appt.lead_inquiries as { full_name: string; email: string; assigned_to?: string };
  if (lead?.assigned_to) {
    notify(lead.assigned_to, 'appointment.confirmed', {
      title: 'Cita confirmada',
      body: `La cita con ${lead.full_name} ha sido confirmada.`,
      data: { appointmentId: id },
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
