export interface TemplateVars {
  firstName: string;
  businessName: string;
  neighborhood: string;
  rating: string;
  reviewCount: string;
  websiteUrl?: string;
  category?: string;
  sector?: string;
}

interface TemplateResult {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

function wrap(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
    <div style="white-space:pre-wrap;line-height:1.6">${escaped}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#6b7280">
      Felipe — Kento Dev Lab · kentodevlab.com<br/>
      Si no quieres recibir más correos, responde "BAJA" a este email.
    </p>
  </div>`;
}

// ── EMAIL 1 — Primer contacto ─────────────────────────────────────────────────

function email1Hosteleria(v: TemplateVars): TemplateResult {
  const webLine = v.websiteUrl
    ? `vuestra web tarda en cargar y no transmite el nivel real del sitio`
    : `no aparece web vuestra, solo Google Maps y redes sociales`;

  const subject = `${v.businessName} — una idea rápida`;
  const bodyText = `Hola ${v.firstName},

He visto ${v.businessName} en ${v.neighborhood} — ${v.rating}★ con ${v.reviewCount} reseñas en Google. La reputación que tenéis está fuera de duda.

Lo que me sorprende es que cuando alguien os busca en el móvil, ${webLine}. La gente que descubre ${v.businessName} hoy se va sin reservar porque no encuentra dónde hacerlo.

Soy Felipe, de Kento Dev Lab, y monto webs para negocios como el vuestro. Una web sencilla con reservas, menú/servicios y SEO local cuesta 499 €, dominio incluido, lista en 7 días.

¿Te interesa que te enseñe en 15 min cómo quedaría la vuestra?

Un saludo,
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

function email1Fisioterapia(v: TemplateVars): TemplateResult {
  const subject = `${v.firstName}, una observación sobre ${v.businessName}`;
  const bodyText = `Hola ${v.firstName},

He estado mirando ${v.businessName} en ${v.neighborhood}. ${v.rating}★ con ${v.reviewCount} valoraciones — el boca a boca lo tenéis ganado.

El detalle que me llamó la atención: cuando alguien busca en Google "fisioterapeuta ${v.neighborhood}" la primera página la dominan clínicas con webs optimizadas. La diferencia entre la calidad real del centro y lo que aparece online es enorme — y eso son pacientes nuevos que se van a otro sitio.

Soy Felipe, de Kento Dev Lab. Hago webs en Next.js con SEO local incluido (899 €, entrega en 10 días) y centros que las usan están captando entre 5 y 15 pacientes nuevos al mes solo por búsquedas locales.

¿Te puedo enviar un ejemplo y comentamos en una llamada de 15 min si encaja?

Un saludo,
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

function email1Dentistas(v: TemplateVars): TemplateResult {
  const subject = `Una propuesta para ${v.businessName}`;
  const bodyText = `Buenos días,

Le escribo después de ver ${v.businessName} — ${v.rating}★ con ${v.reviewCount} reseñas, una clínica de referencia en ${v.neighborhood}.

La observación que quería compartirle: los pacientes que hoy buscan dentista en ${v.neighborhood} comparan webs antes de llamar. Una web moderna con primera visita online, reseñas integradas y SEO local marca la diferencia entre que el paciente reserve con ustedes o con la clínica de la esquina.

Soy Felipe, de Kento Dev Lab. Por 1.499 € entregamos web profesional en Next.js con CRM propio (gestión de pacientes y citas) y SEO local incluido. Plazo: 2 semanas.

¿Tiene 20 minutos esta semana para una llamada en la que le enseñe ejemplos y hablemos de su clínica?

Un cordial saludo,
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

function email1Hoteles(v: TemplateVars): TemplateResult {
  const subject = `Reservas directas sin comisiones para ${v.businessName}`;
  const bodyText = `Buenos días,

Le escribo después de ver ${v.businessName} en ${v.neighborhood}. La valoración (${v.rating}★ con ${v.reviewCount} reseñas) habla por sí sola.

Una observación: probablemente Booking y Expedia les estén llevando entre el 60 % y el 80 % de las reservas, con comisiones del 15–20 %. Una web propia bien posicionada que capte reservas directas suele recuperar un 10–15 % de ese volumen — y lo que pagaban en comisión queda en su cuenta.

Soy Felipe, de Kento Dev Lab. Trabajamos con hoteles boutique en Madrid construyendo webs en Next.js con motor de reservas integrado y SEO. El proyecto cierra en 1.499 €, entrega en 2 semanas.

¿Le interesaría una llamada de 20 minutos para que le enseñe casos concretos y veamos si tiene sentido para ${v.businessName}?

Un cordial saludo,
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

// ── EMAIL 2 — Follow-up con valor ─────────────────────────────────────────────

function email2WithWeb(v: TemplateVars): TemplateResult {
  const subject = `RE: ${v.businessName} (auditoría rápida)`;
  const bodyText = `Hola ${v.firstName},

Te escribí la semana pasada y como entiendo que andas liado, te dejo algo más útil que insistir.

He revisado tu presencia online y encontré 3 cosas que te están costando clientes ahora mismo:

1. Sin web propia o web lenta en móvil — Google penaliza por encima de 2,5s de carga.
2. No aparece ningún botón de reservar/contactar visible — la gente se va sin acción.
3. Sin SEO local — cuando alguien busca "${v.category ?? v.sector} ${v.neighborhood}", no apareces en los primeros resultados.

Cualquiera de las 3 te está costando clientes. Te las arreglo en una web nueva por 499 € y te olvidas.

Si quieres que te lo cuente en 15 min, responde aquí y acordamos.

Un saludo,
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

function email2WithoutWeb(v: TemplateVars): TemplateResult {
  const subject = `Lo que vi hoy buscando "${v.category ?? v.sector} ${v.neighborhood}"`;
  const bodyText = `Hola ${v.firstName},

He buscado hoy en Google "${v.category ?? v.sector} ${v.neighborhood}" y los 3 primeros resultados son negocios con web propia. ${v.businessName} aparece solo a través de Google Maps.

La gente que descubre la zona y busca dónde ${v.sector === 'restaurantes' ? 'comer' : v.sector === 'peluquerias' ? 'cortarse el pelo' : 'ir'} encuentra a la competencia primero. Una web sencilla con SEO local cambia eso en 4–6 semanas.

499 € todo incluido (dominio, hosting en Vercel, entrega en 7 días).

¿Llamamos 15 min para que te enseñe cómo lo hacemos?

Un saludo,
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

// ── EMAIL 3 — Breakup ─────────────────────────────────────────────────────────

function email3Breakup(v: TemplateVars): TemplateResult {
  const subject = `Cerramos el tema, ${v.firstName}?`;
  const bodyText = `Hola ${v.firstName},

Te he escrito un par de veces y entiendo que no es prioridad ahora. Sin problema.

Cierro tu ficha por mi parte. Si en algún momento queréis renovar la web o queréis que os haga una auditoría gratis, escríbeme y lo retomamos.

Mucha suerte con ${v.businessName},
Felipe Díaz, fundador de Kento Dev Lab`;

  return { subject, bodyText, bodyHtml: wrap(bodyText) };
}

// ── Router público ─────────────────────────────────────────────────────────────

type TemplateType = 'email_1_first_contact' | 'email_2_follow_up' | 'email_3_breakup';
type Sector = 'restaurantes' | 'cafeterias' | 'peluquerias' | 'fisioterapia' | 'dentistas' | 'hoteles';

export function renderTemplate(
  type: TemplateType,
  sector: Sector,
  vars: TemplateVars,
): TemplateResult {
  if (type === 'email_3_breakup') return email3Breakup(vars);

  if (type === 'email_2_follow_up') {
    return vars.websiteUrl ? email2WithWeb(vars) : email2WithoutWeb(vars);
  }

  // email_1_first_contact
  if (sector === 'dentistas') return email1Dentistas(vars);
  if (sector === 'hoteles') return email1Hoteles(vars);
  if (sector === 'fisioterapia') return email1Fisioterapia(vars);
  return email1Hosteleria(vars); // restaurantes, cafeterias, peluquerias
}

export const SECTOR_LABELS: Record<Sector, string> = {
  restaurantes: 'Restaurantes',
  cafeterias: 'Cafeterías',
  peluquerias: 'Peluquerías',
  fisioterapia: 'Fisioterapia',
  dentistas: 'Dentistas',
  hoteles: 'Hoteles',
};

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  email_1_first_contact: 'Email 1 — Primer contacto (Día 0)',
  email_2_follow_up: 'Email 2 — Follow-up con valor (Día 7)',
  email_3_breakup: 'Email 3 — Breakup (Día 14)',
};

export const TONO_LABELS: Record<string, string> = {
  tu_cercano: 'Tú cercano (hostelería, peluquerías)',
  tu_profesional: 'Tú profesional (fisioterapia)',
  usted_formal: 'Usted formal (dentistas, hoteles)',
};
