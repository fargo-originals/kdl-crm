# Plan de integración Landing ↔ CRM ↔ Agentes IA

> **Audiencia ejecutora:** Codex. El plan está dividido en fases independientes y cada fase incluye paths exactos, contratos de API y criterios de aceptación verificables.

---

## Contexto

KentoDevLab tiene dos productos hoy desconectados:

1. **Landing pública** `kentodevlab.com` (Next.js App Router, repo `fargo-originals/kentodevlab`). Hoy el contenido vive hardcodeado y los formularios no llegan a ningún sitio.
2. **CRM interno** `kdl-crm` (Next.js 16 App Router, Drizzle + Supabase + Clerk, ya con módulos de contacts/companies/deals/tasks/tickets/prospecting). Repo `fargo-originals/kdl-crm`.

Se quiere:

- **Editar la landing desde el CRM** (CRUD de hero, servicios, portfolio, testimonios, FAQ, equipo, blog, header/footer) sin tocar código.
- **Capturar leads** del formulario de la web dentro del CRM, asignarlos y trazarlos.
- **Automatizar el primer contacto** con un agente IA por WhatsApp + Email que califica al lead, propone slots de cita y deja al comercial cerrar la confirmación.

Single-tenant (solo kentodevlab). Bilingüe (es/en) desde el inicio. Voz IA queda fuera de fase 1.

---

## Decisiones de arquitectura (cerradas)

| Tema | Decisión |
|---|---|
| Auth | JWT propio (`jose`) + `bcryptjs`. Email/contraseña + OAuth Google. Sin Clerk. |
| Modelo de contenido | JSON en Supabase con flag `draft`/`published`. Sin commits a Git. |
| Lectura desde landing | API REST pública del CRM con `fetch` + `next: { tags }` + ISR. CRM dispara `revalidateTag` vía webhook al publicar. |
| Storage media | Supabase Storage, bucket público `landing-media`. |
| Permisos CMS | Solo `users.role = 'owner'` |
| i18n | Campos con sufijo `_es` / `_en` o JSONB `{es, en}`. Landing detecta locale por path `/[locale]/...`. |
| WhatsApp | WhatsApp Cloud API (Meta) directo |
| Email | Resend (env var ya presente) |
| Voz / SMS | Twilio (solo fase 2, dejar abstracción preparada) |
| Calendario | Tabla propia (`sales_availability` + `appointments`). Sin Google Cal en fase 1. |
| Orquestación agente | Vercel AI SDK (`ai` package) con provider intercambiable Anthropic/OpenAI. |
| Notificación comercial | Email (Resend) + Slack DM + badge in-app + WhatsApp al comercial |
| LLM por defecto | Claude Sonnet 4.6 (`claude-sonnet-4-6`) vía Vercel AI SDK |

---

## Fase 0-A · Eliminar Clerk y reemplazar con JWT propio

**Repo:** `kdl-crm`. **Esta fase debe ejecutarse primero** porque el resto del código depende del sistema de auth.

### Resumen de la sustitución

| Clerk (eliminar) | Reemplazo |
|---|---|
| `@clerk/nextjs` package | `jose` (JWT, nativo Edge/Node) |
| `clerkMiddleware` en `src/middleware.ts` | Middleware JWT propio |
| `src/app/api/webhooks/clerk/route.ts` | Eliminar (ya no se sincroniza con Clerk) |
| `src/app/sign-in/` y `src/app/sign-up/` | `src/app/login/page.tsx` |
| `users.clerkId` column | `users.passwordHash text`, `users.googleId text` |
| Variables `CLERK_*` | `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

### Cambios en la tabla `users` (migración Drizzle)

```sql
ALTER TABLE users
  DROP COLUMN clerk_id,
  ADD COLUMN password_hash text,       -- null si solo usa Google OAuth
  ADD COLUMN google_id text unique,    -- null si solo usa email/password
  ADD COLUMN email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN last_login_at timestamp;
```

### Archivos nuevos

**`src/lib/auth/jwt.ts`**
- `signToken(payload, expiresIn?)` → firma con `jose` + `JWT_SECRET`, devuelve string.
- `verifyToken(token)` → verifica y retorna payload tipado `{ sub: string, role: string, email: string }`.
- Cookie name: `kdl_session`, `httpOnly: true`, `sameSite: 'lax'`, `secure: true` en prod.

**`src/lib/auth/password.ts`**
- `hashPassword(plain)` → `bcryptjs` (o `crypto.subtle` + PBKDF2 para zero-deps).
- `verifyPassword(plain, hash)` → bool.

**`src/lib/auth/session.ts`** (Server-side helper)
- `getSession(request | cookies)` → `{ userId, role, email } | null`.
- `requireSession()` → igual pero lanza redirect a `/login` si null.
- `requireOwner()` → idem pero lanza 403 si role ≠ 'owner'.

**`src/app/api/auth/login/route.ts`** — POST `{ email, password }` → valida hash, emite cookie JWT, redirige.

**`src/app/api/auth/logout/route.ts`** — POST → borra cookie, redirige a `/login`.

**`src/app/api/auth/google/route.ts`** — GET → redirige a Google OAuth2 URL con `state` CSRF.

**`src/app/api/auth/google/callback/route.ts`** — GET `?code&state` → canjea code, obtiene perfil Google, upsert user (google_id + email), emite cookie JWT.

**`src/app/login/page.tsx`** — Form email/password + botón "Continuar con Google". Client component simple.

**`src/middleware.ts`** — Reemplazar `clerkMiddleware` con:
```ts
// Rutas públicas: /login, /api/auth/*, /api/public/*
// Todo lo demás requiere cookie válida; si no, redirect /login
```

### Eliminar

- `src/app/api/webhooks/clerk/route.ts`
- `src/app/sign-in/` y `src/app/sign-up/`
- Todas las importaciones de `@clerk/nextjs` (`auth()`, `currentUser()`, `ClerkProvider`, `UserButton`, `useUser`, etc.)
- Variable `CLERK_*` de `.env.example`

### Patrón de creación inicial de usuario owner

Dado que no hay registro público, se crea el primer owner desde un script de seed:
`src/db/seed/create-owner.ts` — lee `OWNER_EMAIL` + `OWNER_PASSWORD` de env y hace INSERT directo.

### Dependencias

- Añadir: `jose`, `bcryptjs`, `@types/bcryptjs`
- Eliminar: `@clerk/nextjs`

**Aceptación fase 0-A:** `pnpm build` limpio sin ninguna referencia a Clerk. Login con email/contraseña funciona. OAuth Google redirige y crea sesión. Middleware protege `/dashboard` sin cookie válida. `requireOwner()` devuelve 403 a sellers.

---

## Fase 0 · Preparación común

**Repo:** `kdl-crm` (rama `claude/integrate-landing-page-dNHEC`).

1. Añadir dependencias:
   - `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`
   - `@supabase/storage-js` (ya implícito en `@supabase/supabase-js`)
   - `resend`
   - `@slack/web-api`
   - `zod` (verificar si ya está)
2. Ampliar `.env.example` con:
   ```
   # Auth (reemplaza Clerk)
   JWT_SECRET=
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   OWNER_EMAIL=        # solo para seed inicial
   OWNER_PASSWORD=     # solo para seed inicial

   # Landing integration
   LANDING_REVALIDATE_SECRET=
   NEXT_PUBLIC_LANDING_URL=https://kentodevlab.com

   # WhatsApp Cloud API
   WHATSAPP_PHONE_NUMBER_ID=
   WHATSAPP_ACCESS_TOKEN=
   WHATSAPP_VERIFY_TOKEN=
   WHATSAPP_APP_SECRET=

   # Email (ya existe RESEND_API_KEY)
   RESEND_FROM_EMAIL=hola@kentodevlab.com

   # AI agent
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=
   AI_AGENT_DEFAULT_PROVIDER=anthropic

   # Twilio (fase 2)
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_FROM_NUMBER=
   ```
3. Crear bucket público `landing-media` en Supabase (script SQL en `src/db/migrations/0001_landing_media_bucket.sql`).

**Repo:** `fargo-originals/kentodevlab`.

4. Crear (o adaptar) estructura de rutas i18n: `src/app/[locale]/...`.
5. Añadir `.env.example` con `CRM_API_BASE_URL`, `CRM_API_TOKEN`, `LANDING_REVALIDATE_SECRET`.

**Aceptación fase 0:** `pnpm install` y `pnpm build` pasan en ambos repos. `pnpm lint` limpio.

---

## Fase 1 · Modelo de datos del CMS de landing

**Repo:** `kdl-crm`.

**Archivo nuevo:** `src/db/schema/landing.ts` (exportado desde `src/db/schema/index.ts`).

Tablas (todas con `id uuid pk`, `created_at`, `updated_at`, `created_by` FK `users.id`):

| Tabla | Campos clave | Notas |
|---|---|---|
| `landing_settings` | `key text unique`, `value jsonb`, `published_value jsonb` | Singletons: `header`, `footer`, `seo_global`, `theme` |
| `landing_hero` | `title jsonb`, `subtitle jsonb`, `cta_label jsonb`, `cta_url`, `bg_media_url`, `bg_media_type`, `published bool`, `position int` | jsonb = `{es, en}` |
| `landing_services` | `icon`, `title jsonb`, `description jsonb`, `price`, `currency`, `slug unique`, `position`, `published bool` | CRUD ordenable |
| `landing_portfolio` | `title jsonb`, `client_name`, `description jsonb`, `cover_url`, `gallery jsonb (array urls)`, `external_url`, `tags text[]`, `slug unique`, `position`, `published bool` | |
| `landing_testimonials` | `author_name`, `author_role jsonb`, `author_avatar_url`, `quote jsonb`, `rating smallint`, `position`, `published bool` | |
| `landing_faq` | `question jsonb`, `answer jsonb`, `category`, `position`, `published bool` | |
| `landing_team` | `full_name`, `role jsonb`, `bio jsonb`, `avatar_url`, `socials jsonb`, `position`, `published bool` | |
| `landing_blog_posts` | `slug unique`, `title jsonb`, `excerpt jsonb`, `body jsonb` (Portable Text), `cover_url`, `tags text[]`, `author_id` FK users, `published_at`, `status enum('draft','scheduled','published','archived')` | |
| `lead_inquiries` | `contact_id` FK contacts (nullable), `full_name`, `email`, `phone`, `business_name`, `business_type`, `service_interest`, `budget_range`, `message text`, `preferred_channel enum('whatsapp','email','phone')`, `preferred_time_window text`, `locale text`, `utm jsonb`, `source enum('landing_form','manual','import')`, `status enum('new','contacted','qualified','scheduled','won','lost')`, `assigned_to` FK users, `agent_session_id` FK | Cola de entrada de la landing |

**Patrón draft/published:**
- Cada entidad tiene `published bool` (excepto `landing_settings` con dos jsonb).
- La API pública de la landing solo expone `where published = true`.
- El editor en el CMS escribe directo a la fila, el botón **Publicar** flipea `published=true` y dispara revalidate.

**Acción:** generar migración Drizzle (`pnpm drizzle-kit generate`), revisar SQL, commit. Añadir helpers de query a `src/lib/landing/queries.ts` (`getPublishedHero`, `listPublishedServices`, etc).

**Aceptación fase 1:** migración aplicada, `pnpm db:studio` muestra las tablas vacías, types generados sin errores.

---

## Fase 2 · API pública del CRM (consumida por la landing)

**Repo:** `kdl-crm`.

**Rutas nuevas** bajo `src/app/api/public/landing/`:

| Endpoint | Método | Respuesta |
|---|---|---|
| `/api/public/landing/snapshot` | GET `?locale=es` | Objeto único con `header`, `footer`, `hero[]`, `services[]`, `portfolio[]`, `testimonials[]`, `faq[]`, `team[]`, `theme`, `seo`. Solo published. |
| `/api/public/landing/blog` | GET `?locale=es&page=1&tag=` | Lista paginada de posts published |
| `/api/public/landing/blog/[slug]` | GET | Post completo |
| `/api/public/landing/lead` | POST | Recibe formulario; crea `lead_inquiries` + `contacts`; encola job al agente IA |

**Auth:** los `GET` son públicos pero rate-limited (`@upstash/ratelimit` o middleware propio sencillo basado en IP). El `POST /lead` valida `Origin` + token CSRF generado por la landing al renderizar el form.

**Cache headers:** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` y `next: { tags: ['landing:snapshot', 'landing:blog'] }` cuando se consuma desde la landing.

**Validación:** `zod` schemas en `src/lib/landing/schemas.ts` reutilizables por el form.

**Aceptación fase 2:** `curl https://crm.kentodevlab.com/api/public/landing/snapshot?locale=es` devuelve JSON válido. `POST /api/public/landing/lead` con payload válido crea fila en `lead_inquiries` y `contacts`.

---

## Fase 3 · Dashboard CMS dentro del CRM

**Repo:** `kdl-crm`.

**Rutas nuevas** bajo `src/app/(app)/landing/`:

```
landing/
  page.tsx                 → resumen + botón "Publicar todo" (sticky bar diff)
  hero/page.tsx
  services/page.tsx        → tabla CRUD ordenable (DnD-kit)
  services/[id]/page.tsx
  portfolio/page.tsx
  portfolio/[id]/page.tsx
  testimonials/page.tsx
  faq/page.tsx
  team/page.tsx
  blog/page.tsx
  blog/[id]/page.tsx       → editor Portable Text (Tiptap o Plate)
  settings/page.tsx        → header, footer, SEO global, theme
  media/page.tsx           → biblioteca del bucket landing-media
```

**Componentes nuevos** en `src/components/app/landing/`:
- `LangTabs.tsx` (es/en)
- `MediaPicker.tsx` (sube a Supabase Storage, copia URL)
- `PublishBar.tsx` (cuenta cambios pendientes, botón Publicar)
- `SortableList.tsx` (wrapper sobre `@dnd-kit/sortable`)
- `RichTextEditor.tsx` (Tiptap con extensiones básicas)

**Server actions** en `src/app/(app)/landing/_actions/`:
- `upsertHero`, `upsertService`, `deleteService`, `reorderServices`, etc.
- `publishLanding(): Promise<{ revalidated: string[] }>` — flipea todas las filas con cambios a `published=true`, llama al webhook de revalidate de la landing.

**Permisos:** wrapper `requireOwner()` en `src/lib/auth/guards.ts`. El sidebar de `app-layout.tsx` solo muestra el item "Landing" si `user.role === 'owner'`. Cualquier seller que entre por URL recibe 403.

**Aceptación fase 3:** owner puede crear/editar/borrar/reordenar servicios, subir imagen, alternar es/en y al pulsar **Publicar** la API pública refleja el cambio.

---

## Fase 4 · Adaptar la landing para consumir el CRM

**Repo:** `fargo-originals/kentodevlab`.

1. Estructura `src/app/[locale]/page.tsx` que llama:
   ```ts
   const data = await fetch(
     `${process.env.CRM_API_BASE_URL}/api/public/landing/snapshot?locale=${locale}`,
     { next: { tags: ['landing:snapshot'], revalidate: 3600 } }
   ).then(r => r.json());
   ```
2. Cliente tipado en `src/lib/crm.ts` con tipos compartidos. Opción recomendada: copiar tipos generados desde el CRM (`pnpm --filter crm generate-types` produce `landing-types.d.ts`).
3. Componentes por sección consumiendo el snapshot: `<Hero/>`, `<Services/>`, `<Portfolio/>`, `<Testimonials/>`, `<FAQ/>`, `<Team/>`, `<Footer/>`.
4. **Formulario de contacto** `<ContactForm/>` (client component) que hace `POST /api/public/landing/lead` con los campos: `fullName`, `email`, `phone`, `businessName`, `businessType`, `serviceInterest`, `budgetRange`, `message`, `preferredChannel`, `preferredTimeWindow`, `locale`, `utm` (capturado de `searchParams`). Envía honeypot + reCAPTCHA v3 (token validado en el CRM).
5. Página `/[locale]/blog` y `/[locale]/blog/[slug]` con SSG/ISR.
6. Endpoint `/api/revalidate` en la landing que recibe `POST` con header `x-revalidate-secret`, llama `revalidateTag('landing:snapshot' | 'landing:blog')`.

**Aceptación fase 4:** la landing se renderiza con datos del CRM. Editar en el CMS y pulsar Publicar refresca la web en < 30s. El formulario crea un lead visible en el CRM.

---

## Fase 5 · Pipeline de leads en el CRM

**Repo:** `kdl-crm`.

1. Nueva ruta `src/app/(app)/leads/` con tabla de `lead_inquiries` (filtros por status, canal, fecha). Reutilizar patrón de `prospecting/ResultsTable.tsx`.
2. Detalle `src/app/(app)/leads/[id]/page.tsx`: timeline de la conversación con el agente, datos del contact, botones "Asignarme", "Confirmar slot", "Marcar perdido", "Convertir a deal".
3. Al crear `lead_inquiries` (POST `/api/public/landing/lead`):
   - Upsert en `contacts` por email/teléfono.
   - Insert en `activities` (`type='lead_received'`).
   - Disparar `enqueueAgentRun(leadId)` (fase 6).
   - Notificar al owner: email Resend + Slack DM + (si ya hay seller asignado por round-robin) WhatsApp.
4. Round-robin de asignación: helper en `src/lib/leads/assignment.ts` que distribuye por `users.role='seller'` activos.

**Aceptación fase 5:** un POST de prueba aparece en `/leads` en < 5s y el comercial asignado recibe email + Slack.

---

## Fase 6 · Agente IA (WhatsApp + Email)

**Repo:** `kdl-crm`.

### Estructura

```
src/lib/agents/
  index.ts              → enqueueAgentRun, runAgent
  providers/
    ai.ts               → wrapper Vercel AI SDK con provider configurable
    whatsapp.ts         → sendTemplate, sendMessage, parseWebhook (Meta Cloud API)
    email.ts            → sendEmail (Resend) + parseInbound (Resend webhook)
  prompts/
    qualifier.ts        → system prompt: califica + propone 3 slots
    es.ts / en.ts       → variantes por idioma
  tools/
    proposeSlots.ts     → tool-call: lee sales_availability y devuelve 3 huecos
    saveAnswer.ts       → guarda respuesta en lead.qualification_data
    requestHumanHandoff.ts → marca lead status='qualified', notifica comercial
  state.ts              → agent_sessions table: leadId, channel, messages jsonb, status
```

### Tablas adicionales (migración Drizzle)

- `agent_sessions`: `lead_id`, `channel enum('whatsapp','email')`, `messages jsonb[]`, `status enum('active','awaiting_human','closed')`, `last_provider_message_id`, `created_at`, `updated_at`.
- `sales_availability`: `user_id`, `weekday smallint`, `start_time`, `end_time`, `timezone text`.
- `appointments`: `lead_id`, `assigned_to`, `proposed_slots jsonb (array)`, `confirmed_slot timestamptz`, `status enum('proposed','confirmed','cancelled','rescheduled','no_show')`, `meeting_url`.

### Webhooks

- `POST /api/webhooks/whatsapp` — verifica firma con `WHATSAPP_APP_SECRET`, parsea entrante, busca `agent_sessions` activa por `from`, llama `runAgent(session, userMessage)`.
- `GET /api/webhooks/whatsapp` — verificación inicial con `hub.challenge`.
- `POST /api/webhooks/email-inbound` — Resend inbound parsing (configurar dominio MX en Resend hacia el CRM).

### Flujo

1. Lead nuevo → `enqueueAgentRun(leadId)`.
2. Si `preferredChannel === 'whatsapp'` y hay teléfono: enviar **plantilla aprobada** de Meta (saludo + propuesta de calificar). Si no, mandar email Resend.
3. Cuando el lead responde → `runAgent`:
   - Construye contexto con `messages` previos + datos del lead.
   - Llama `streamText` (Vercel AI SDK) con tools (`proposeSlots`, `saveAnswer`, `requestHumanHandoff`).
   - Persiste turno y envía respuesta por el canal correspondiente.
4. Cuando el modelo invoca `proposeSlots`: lee `sales_availability` del comercial asignado, calcula 3 huecos > 24h en futuro, los devuelve. El agente los propone al lead.
5. Cuando el lead acepta uno: crea `appointments` con `status='proposed'`. Notifica al comercial (email + Slack + WA + badge in-app) con botón **Confirmar** que pasa a `status='confirmed'` y avisa al lead por su canal.

### Plantillas WhatsApp

Documentar en `docs/whatsapp-templates.md` los nombres exactos de plantillas a aprobar en Meta Business: `lead_first_contact_es`, `lead_first_contact_en`, `appointment_confirmed_es`, `appointment_confirmed_en`. Sin plantilla aprobada no se puede iniciar conversación fuera de la ventana de 24h.

### Provider abstraction (Vercel AI SDK)

```ts
// src/lib/agents/providers/ai.ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const getModel = () => {
  const provider = process.env.AI_AGENT_DEFAULT_PROVIDER ?? 'anthropic';
  return provider === 'openai'
    ? openai('gpt-4.1')
    : anthropic('claude-sonnet-4-6');
};
```

**Aceptación fase 6:** un lead de prueba con `preferredChannel='whatsapp'` recibe la plantilla en el WA del tester, conversa con el bot, recibe 3 slots, confirma uno, se crea fila en `appointments` con `status='proposed'` y el comercial recibe Slack DM.

---

## Fase 7 · Notificaciones unificadas

**Repo:** `kdl-crm`.

`src/lib/notifications/index.ts` con un único `notify(userId, event, payload)` que abre canales según `users.notification_preferences jsonb` (nuevo campo en tabla `users`). Implementaciones:

- `email.ts` (Resend)
- `slack.ts` (lookup token en `integrations` con `type='slack'` y `user_id` o team)
- `inApp.ts` (insert en nueva tabla `notifications`, badge en sidebar)
- `whatsappOps.ts` (envío al teléfono del comercial vía plantilla `internal_lead_alert_es`)

Eventos: `lead.received`, `lead.qualified`, `appointment.proposed`, `appointment.confirmed`, `appointment.cancelled`.

**Aceptación fase 7:** crear lead de prueba; el owner recibe los 4 canales habilitados. Toggle en `/settings/notifications` los desactiva.

---

## Fase 8 · QA y release

1. Tests E2E mínimos con Playwright en `kdl-crm/tests/e2e/`:
   - `landing-cms.spec.ts`: owner edita hero, publica, fetch a `/api/public/landing/snapshot` lo refleja.
   - `lead-flow.spec.ts`: POST `/api/public/landing/lead` → aparece en `/leads` → agent_session creada → mock de webhook WA simula respuesta → appointment proposed.
2. Test unitario de los tools del agente (`proposeSlots` con fixtures de availability).
3. `docs/integration.md` en `kdl-crm` con diagrama (Mermaid), variables de entorno, runbook.
4. Checklist de despliegue:
   - [ ] Migraciones aplicadas en Supabase prod.
   - [ ] Bucket `landing-media` creado y público.
   - [ ] Plantillas WA aprobadas en Meta.
   - [ ] Dominio MX configurado en Resend (inbound).
   - [ ] Webhook WA verificado en Meta con `WHATSAPP_VERIFY_TOKEN`.
   - [ ] Variables en Vercel (CRM y landing).
   - [ ] `LANDING_REVALIDATE_SECRET` igual en ambos repos.

---

## Archivos críticos a modificar/crear (resumen)

**kdl-crm:**
- `src/lib/auth/jwt.ts` (nuevo)
- `src/lib/auth/password.ts` (nuevo)
- `src/lib/auth/session.ts` (nuevo — reemplaza helpers de Clerk)
- `src/app/api/auth/login/route.ts` (nuevo)
- `src/app/api/auth/logout/route.ts` (nuevo)
- `src/app/api/auth/google/route.ts` (nuevo)
- `src/app/api/auth/google/callback/route.ts` (nuevo)
- `src/app/login/page.tsx` (nuevo — reemplaza sign-in/sign-up)
- `src/middleware.ts` (reescritura completa, eliminar clerkMiddleware)
- `src/db/schema/index.ts` (quitar clerkId, añadir passwordHash/googleId)
- `src/db/seed/create-owner.ts` (nuevo)
- `src/app/api/webhooks/clerk/route.ts` (ELIMINAR)
- `src/app/sign-in/` y `src/app/sign-up/` (ELIMINAR)
- `src/db/schema/landing.ts` (nuevo)
- `src/db/schema/agents.ts` (nuevo)
- `src/db/migrations/*` (autogen)
- `src/app/api/public/landing/**` (nuevo)
- `src/app/api/webhooks/whatsapp/route.ts` (nuevo)
- `src/app/api/webhooks/email-inbound/route.ts` (nuevo)
- `src/app/(app)/landing/**` (nuevo)
- `src/app/(app)/leads/**` (nuevo)
- `src/lib/landing/{queries,schemas,revalidate}.ts` (nuevo)
- `src/lib/agents/**` (nuevo)
- `src/lib/notifications/**` (nuevo)
- `src/lib/auth/guards.ts` (nuevo)
- `src/components/app/landing/**` (nuevo)
- `src/components/app/app-layout.tsx` (añadir items Landing/Leads, gated por role)
- `.env.example` (ampliado)

**fargo-originals/kentodevlab (nuevo PR):**
- `src/app/[locale]/page.tsx`
- `src/app/[locale]/blog/**`
- `src/components/sections/**`
- `src/components/ContactForm.tsx`
- `src/lib/crm.ts`
- `src/app/api/revalidate/route.ts`
- `.env.example`

---

## Verificación end-to-end

1. **Smoke local del CRM:** `pnpm dev` → login owner → `/landing/services` crear "Diseño web" → publicar → `curl localhost:3000/api/public/landing/snapshot?locale=es | jq '.services'` muestra el servicio.
2. **Smoke local de la landing:** `CRM_API_BASE_URL=http://localhost:3000 pnpm dev` en el repo landing → home renderiza el servicio creado.
3. **Lead end-to-end con Meta sandbox:** rellenar form → ver fila en `/leads` → con número de tester en WA, recibir plantilla → responder → ver mensajes en `agent_sessions` → recibir slots → aceptar → ver `appointments.proposed`.
4. **Permisos:** login con seller → `/landing/services` devuelve 403; `/leads` accesible.
5. **Tests:** `pnpm test` y `pnpm test:e2e` en verde antes del merge.

---

## Fuera de alcance (fase 2+)

- Llamadas de voz IA (Twilio Voice + Vapi/Retell)
- Multi-tenant
- A/B testing del contenido
- Integración Google Calendar (cuando se quiera, ya hay OAuth listo en `integrations`)
- Editor visual WYSIWYG por bloques (estilo Builder.io)
