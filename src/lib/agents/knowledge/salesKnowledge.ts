import { getPublishedSnapshot } from '@/lib/landing/queries';

export interface SalesKnowledge {
  full: string; // texto completo, para la tool lookup-knowledge
  distilled: string; // versión corta, inyectada en el prompt al montar la llamada
}

// Extrae el string del locale en campos jsonb localizados ({ es, en }).
function loc(value: unknown, locale: string): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return String(o[locale] ?? o.es ?? o.en ?? Object.values(o)[0] ?? '');
  }
  return String(value);
}

interface ServiceRow { title?: unknown; description?: unknown; price?: unknown; currency?: unknown }
interface FaqRow { question?: unknown; answer?: unknown }
interface TestimonialRow { quote?: unknown; author_name?: string; rating?: number }

export async function buildSalesKnowledge(locale = 'es'): Promise<SalesKnowledge> {
  const snap = await getPublishedSnapshot(locale);

  const services = (snap.services as ServiceRow[]).map((s) => {
    const price = s.price != null ? `${Number(s.price)} ${s.currency ?? 'EUR'}` : 'a consultar';
    return `- ${loc(s.title, locale)} (${price}): ${loc(s.description, locale)}`;
  });

  const faq = (snap.faq as FaqRow[]).map(
    (f) => `P: ${loc(f.question, locale)}\nR: ${loc(f.answer, locale)}`,
  );

  const testimonials = (snap.testimonials as TestimonialRow[]).map((t) => {
    const stars = t.rating ? ` (${t.rating}★)` : '';
    return `"${loc(t.quote, locale)}" — ${t.author_name ?? 'cliente'}${stars}`;
  });

  const full = [
    services.length ? `SERVICIOS Y PRECIOS:\n${services.join('\n')}` : '',
    faq.length ? `PREGUNTAS FRECUENTES:\n${faq.join('\n\n')}` : '',
    testimonials.length ? `TESTIMONIOS:\n${testimonials.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const distilled = [
    services.length ? `SERVICIOS Y PRECIOS:\n${services.join('\n')}` : '',
    testimonials.length ? `PRUEBA SOCIAL:\n${testimonials.slice(0, 3).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { full, distilled };
}
