import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [availabilityRes, userRes] = await Promise.all([
    supabaseServer
      .from('sales_availability')
      .select('*')
      .eq('user_id', session.sub)
      .order('weekday', { ascending: true }),
    supabaseServer
      .from('users')
      .select('booking_slug, booking_title, slot_duration_minutes')
      .eq('id', session.sub)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    availability: availabilityRes.data ?? [],
    booking_slug: userRes.data?.booking_slug ?? null,
    booking_title: userRes.data?.booking_title ?? 'Consulta gratuita',
    slot_duration_minutes: userRes.data?.slot_duration_minutes ?? 30,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { availability, booking_slug, booking_title, slot_duration_minutes } = body;

  // Update user settings
  const slugToSave = (booking_slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || null;

  await supabaseServer
    .from('users')
    .update({
      booking_slug: slugToSave,
      booking_title: booking_title ?? 'Consulta gratuita',
      slot_duration_minutes: slot_duration_minutes ?? 30,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.sub);

  // Replace availability: delete existing then re-insert
  await supabaseServer.from('sales_availability').delete().eq('user_id', session.sub);

  if (Array.isArray(availability) && availability.length > 0) {
    const rows = availability
      .filter((a: { active: boolean }) => a.active)
      .map((a: { weekday: number; start_time: string; end_time: string }) => ({
        user_id: session.sub,
        weekday: a.weekday,
        start_time: a.start_time,
        end_time: a.end_time,
        timezone: 'Europe/Madrid',
      }));

    if (rows.length > 0) {
      await supabaseServer.from('sales_availability').insert(rows);
    }
  }

  return NextResponse.json({ ok: true });
}
