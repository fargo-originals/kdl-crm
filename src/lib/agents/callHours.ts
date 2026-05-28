export interface CallWindowOptions {
  globalStartHour?: number;
  globalEndHour?: number;
  allowSunday?: boolean;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function localParts(timezone: string, date: Date): { hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(date);
  let hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  if (hour === 24) hour = 0; // Intl puede devolver "24" a medianoche
  const weekday = WEEKDAY_MAP[parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'] ?? 0;
  return { hour, weekday };
}

// Traduce un "horario preferido" libre ("mañanas", "tardes", "09:00-14:00") a un rango horario.
function normalizePreferred(pref?: string | null): { start: number; end: number } | null {
  if (!pref) return null;
  const s = pref.toLowerCase().trim();
  const range = s.match(/(\d{1,2})(?::\d{2})?\s*[-–a]\s*(\d{1,2})(?::\d{2})?/);
  if (range) {
    const start = parseInt(range[1], 10);
    const end = parseInt(range[2], 10);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) return { start, end };
  }
  if (/(mañana|manana|morning)/.test(s)) return { start: 9, end: 14 };
  if (/(mediod|noon|comida)/.test(s)) return { start: 12, end: 16 };
  if (/(tarde|afternoon)/.test(s)) return { start: 16, end: 20 };
  if (/(noche|evening|night)/.test(s)) return { start: 18, end: 20 };
  return null;
}

// Fuente única de verdad para "¿puedo llamar ahora?". La usan el botón, el cron y el orquestador.
export function isWithinCallWindow(
  timezone: string,
  preferredTimeWindow?: string | null,
  now: Date = new Date(),
  opts: CallWindowOptions = {},
): boolean {
  const { globalStartHour = 9, globalEndHour = 20, allowSunday = false } = opts;
  const tz = timezone || 'Europe/Madrid';
  const { hour, weekday } = localParts(tz, now);

  if (!allowSunday && weekday === 0) return false; // nunca domingos
  if (hour < globalStartHour || hour >= globalEndHour) return false;

  const pref = normalizePreferred(preferredTimeWindow);
  if (pref && (hour < pref.start || hour >= pref.end)) return false;

  return true;
}

// Próximo instante válido para llamar, a partir de `from` + retardo mínimo (reintentos con backoff).
export function nextValidCallTime(
  timezone: string,
  preferredTimeWindow?: string | null,
  from: Date = new Date(),
  minDelayMs: number = 4 * 60 * 60 * 1000,
): Date {
  let t = new Date(from.getTime() + minDelayMs);
  for (let i = 0; i < 24 * 14; i++) {
    if (isWithinCallWindow(timezone, preferredTimeWindow, t)) return t;
    t = new Date(t.getTime() + 60 * 60 * 1000);
  }
  return t;
}
