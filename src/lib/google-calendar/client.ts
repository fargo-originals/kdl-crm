import { supabaseServer } from '@/lib/supabase-server';

async function getValidCalendarToken(userId: string): Promise<string | null> {
  const { data } = await supabaseServer
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('type', 'google_calendar')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.access_token) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  if (!expiresAt || expiresAt > new Date(Date.now() + 60_000)) {
    return data.access_token;
  }

  if (!data.refresh_token) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: data.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  const refreshed = await res.json();
  if (!refreshed.access_token) return null;

  await supabaseServer
    .from('integrations')
    .update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('type', 'google_calendar');

  return refreshed.access_token;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startIso: string;
  durationMinutes: number;
  attendeeEmail?: string;
  timezone?: string;
}

export async function createCalendarEvent(
  userId: string,
  event: CalendarEventInput
): Promise<string | null> {
  const token = await getValidCalendarToken(userId);
  if (!token) return null;

  const tz = event.timezone ?? 'Europe/Madrid';
  const start = new Date(event.startIso);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);

  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description ?? '',
    start: { dateTime: start.toISOString(), timeZone: tz },
    end: { dateTime: end.toISOString(), timeZone: tz },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  if (event.attendeeEmail) {
    body.attendees = [{ email: event.attendeeEmail }];
    // Send invite to attendee
    body.sendUpdates = 'all';
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    console.error('Google Calendar create event error:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.id ?? null;
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const token = await getValidCalendarToken(userId);
  if (!token) return false;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return res.ok || res.status === 404;
}
