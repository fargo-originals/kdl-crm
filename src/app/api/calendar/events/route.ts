import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseServer } from '@/lib/supabase-server';
import { createCalendarEvent } from '@/lib/google-calendar/client';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    title: string;
    date: string;       // YYYY-MM-DD
    time: string;       // HH:MM
    duration: number;   // minutes
    description?: string;
    attendee_email?: string;
    deal_id?: string;
    lead_id?: string;
  };

  if (!body.title || !body.date || !body.time || !body.duration) {
    return NextResponse.json({ error: 'title, date, time y duration son requeridos' }, { status: 400 });
  }

  const startIso = `${body.date}T${body.time}:00`;

  const eventId = await createCalendarEvent(session.sub, {
    summary: body.title,
    description: body.description ?? '',
    startIso,
    durationMinutes: body.duration,
    attendeeEmail: body.attendee_email,
  });

  if (!eventId) {
    return NextResponse.json({ error: 'Google Calendar no conectado o error al crear el evento' }, { status: 400 });
  }

  // Log as activity
  const startDate = new Date(startIso);
  const subject = `📅 ${body.title} — ${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ${body.time}`;

  await supabaseServer.from('activities').insert({
    type: 'meeting',
    subject,
    content: body.description ?? null,
    user_id: session.sub,
    deal_id: body.deal_id ?? null,
    contact_id: null,
    company_id: null,
  });

  return NextResponse.json({ ok: true, event_id: eventId });
}
