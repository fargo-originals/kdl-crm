import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function toTimeStr(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: user } = await supabaseServer
    .from('users')
    .select('id, booking_slug, booking_title, slot_duration_minutes')
    .eq('booking_slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const duration = user.slot_duration_minutes ?? 30;

  const { data: availability } = await supabaseServer
    .from('sales_availability')
    .select('weekday, start_time, end_time')
    .eq('user_id', user.id);

  if (!availability || availability.length === 0) {
    return NextResponse.json({ days: [] });
  }

  // Get confirmed appointments in the next 30 days to exclude booked slots
  const now = new Date();
  const futureLimit = new Date(now);
  futureLimit.setDate(futureLimit.getDate() + 30);

  const { data: bookedAppointments } = await supabaseServer
    .from('appointments')
    .select('confirmed_slot')
    .eq('assigned_to', user.id)
    .neq('status', 'cancelled')
    .not('confirmed_slot', 'is', null)
    .gte('confirmed_slot', now.toISOString())
    .lte('confirmed_slot', futureLimit.toISOString());

  const bookedSet = new Set(
    (bookedAppointments ?? [])
      .filter((a) => a.confirmed_slot)
      .map((a) => new Date(a.confirmed_slot).toISOString())
  );

  // Build availability map by weekday
  const availMap: Record<number, { start_time: string; end_time: string }> = {};
  for (const av of availability) {
    availMap[av.weekday] = { start_time: av.start_time, end_time: av.end_time };
  }

  // Generate slots for next 14 days
  const days: { date: string; slots: string[] }[] = [];
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1); // start from tomorrow

  for (let i = 0; i < 14; i++) {
    const weekday = cursor.getDay(); // 0=Sun, 6=Sat
    const av = availMap[weekday];

    if (av) {
      const [startH, startM] = av.start_time.split(':').map(Number);
      const [endH, endM] = av.end_time.split(':').map(Number);

      const dayStart = new Date(cursor);
      dayStart.setHours(startH, startM, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(endH, endM, 0, 0);

      const slots: string[] = [];
      let slot = new Date(dayStart);

      while (addMinutes(slot, duration) <= dayEnd) {
        const slotIso = slot.toISOString();
        // Only include future slots not already booked
        if (slot > now && !bookedSet.has(slotIso)) {
          slots.push(toTimeStr(slot));
        }
        slot = addMinutes(slot, duration);
      }

      if (slots.length > 0) {
        days.push({ date: toDateStr(cursor), slots });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return NextResponse.json({ days, duration });
}
