# KDL CRM — Módulo de Prospección Web (Spider) — Blueprint

> Generado por The Architect el 2026-04-30
> Archetype: Extensión de SaaS / CRM existente

---

## 1. Project Overview

### Visión

Este blueprint describe la implementación de un **módulo de prospección automatizada** para el CRM KDL ya existente. El módulo permite a los usuarios buscar negocios por sector y zona geográfica (inicialmente Madrid por barrios/distritos), obtener hasta 100 resultados por búsqueda con datos enriquecidos (nombre, teléfono, web, email, Instagram, dirección), revisar los resultados en una cola de aprobación, y finalmente importarlos directamente como `contacts` y `companies` en el CRM.

El sistema usa **Google Places API** para el descubrimiento inicial (datos estructurados, fiables) y **Apify** para el enriquecimiento asíncrono (scraping de webs de cada negocio para extraer email, Instagram, y nombre del responsable). Todo encaja sobre el stack actual: Next.js 15 + Supabase + Drizzle ORM + Vercel.

### Objetivos

- Permitir búsquedas de prospectos por sector + barrio/distrito de Madrid
- Obtener datos de contacto enriquecidos automáticamente (email, Instagram, responsable)
- Presentar resultados en una cola de revisión antes de importar al CRM
- Arquitectura extensible a nuevos sectores y ciudades sin cambios estructurales
- Todo el proceso visible en tiempo real (estado de enriquecimiento por fila)

### Métricas de éxito

- Búsqueda + primeros resultados visibles en menos de 5 segundos
- Tasa de enriquecimiento con email ≥ 40% de los resultados
- Importación al CRM en un clic desde la cola de revisión
- Cero duplicados importados (validación por nombre + teléfono antes de insertar)

---

## 2. Tech Stack

El stack es el existente del proyecto KDL CRM. Solo se añaden dos servicios externos:

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework | Next.js 15 App Router | Ya existe en el proyecto |
| Language | TypeScript strict | Ya existe |
| Styling | Tailwind CSS v4 + shadcn/ui | Ya existe |
| Database | Supabase (Postgres) | Ya existe — se añaden 2 tablas |
| ORM | Drizzle ORM | Ya existe |
| Auth | Clerk | Ya existe — las nuevas rutas son protegidas |
| Hosting | Vercel | Ya existe |
| **[NUEVO] Discovery** | **Google Places API** | API oficial, 100 resultados, datos fiables, precio bajo (~$0.50/run) |
| **[NUEVO] Enriquecimiento** | **Apify** | Scraping cloud async, actores listos para web scraping, sin Playwright en Vercel |

---

## 3. Directory Structure

Solo se muestran los archivos **nuevos o modificados**. No tocar nada que no esté listado aquí.

```
src/
  app/
    prospecting/
      page.tsx                        ← Página principal: formulario de búsqueda + historial
      [searchId]/
        page.tsx                      ← Resultados de una búsqueda + cola de revisión
    api/
      prospecting/
        search/
          route.ts                    ← POST: lanza búsqueda en Google Places, crea registro en DB
        enrich/
          route.ts                    ← POST: dispara job de Apify para enriquecer un lote
        webhook/
          route.ts                    ← POST: recibe resultados de Apify (webhook callback)
        import/
          route.ts                    ← POST: importa prospectos aprobados a contacts + companies
        searches/
          route.ts                    ← GET: historial de búsquedas del usuario
        searches/[searchId]/
          route.ts                    ← GET: resultados de una búsqueda específica
        results/[resultId]/
          route.ts                    ← PATCH: actualizar estado de un resultado (approve/discard)

  components/
    app/
      prospecting/
        search-form.tsx               ← Formulario: sector + distrito + radio
        results-table.tsx             ← Tabla de resultados con estado de enriquecimiento
        result-row.tsx                ← Fila individual con acciones (aprobar/descartar)
        enrichment-badge.tsx          ← Badge de estado: pending / enriching / done / failed
        import-button.tsx             ← Botón de importación masiva de aprobados
        search-history.tsx            ← Lista de búsquedas previas

  db/
    schema/
      index.ts                        ← MODIFICAR: añadir prospect_searches y prospect_results
    
  lib/
    prospecting/
      google-places.ts                ← Cliente Google Places API (TextSearch + Details)
      apify-client.ts                 ← Cliente Apify: lanzar actor + recibir resultados
      enrichment-parser.ts            ← Parsea respuesta de Apify → campos estructurados
      madrid-zones.ts                 ← Constantes: barrios y distritos de Madrid
      sectors.ts                      ← Constantes: sectores disponibles con keywords de búsqueda
      import-to-crm.ts               ← Lógica de importación: dedup + crear contact + company
```

---

## 4. Data Model

### Entidades nuevas

**prospect_searches** — Registro de cada búsqueda lanzada

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, defaultRandom() |
| userId | uuid | FK → users.id |
| sector | text | ej: "restaurantes", "dentistas" |
| zone | text | ej: "Malasaña", "Salamanca", "Madrid" |
| zoneType | text | "barrio" \| "distrito" \| "ciudad" |
| keywords | text | Query enviada a Google Places |
| status | text | "pending" \| "searching" \| "enriching" \| "done" \| "failed" |
| totalResults | integer | Número de resultados obtenidos |
| enrichedCount | integer | Resultados con enriquecimiento completo |
| importedCount | integer | Resultados importados al CRM |
| apifyRunId | text | ID del run de Apify para seguimiento |
| createdAt | timestamp | defaultNow() |
| updatedAt | timestamp | defaultNow() |

**prospect_results** — Cada negocio encontrado en una búsqueda

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, defaultRandom() |
| searchId | uuid | FK → prospect_searches.id |
| googlePlaceId | text | ID único de Google Places (evitar duplicados) |
| name | text | Nombre del negocio |
| address | text | Dirección completa |
| district | text | Distrito de Madrid |
| neighborhood | text | Barrio |
| phone | text | Teléfono (de Google Places) |
| website | text | Web (de Google Places) |
| googleRating | numeric | Rating de Google (1-5) |
| googleReviewCount | integer | Número de reseñas |
| category | text | Categoría de Google Places |
| email | text | Extraído por Apify del sitio web |
| instagram | text | Handle de Instagram (sin @) |
| contactName | text | Nombre del responsable (scraping web) |
| contactTitle | text | Cargo del responsable |
| tripAdvisorRating | numeric | Rating TheFork/TripAdvisor si disponible |
| enrichmentStatus | text | "pending" \| "enriching" \| "done" \| "failed" |
| enrichmentData | jsonb | Raw data completa de Apify |
| reviewStatus | text | "pending" \| "approved" \| "discarded" |
| importedAt | timestamp | Cuándo se importó al CRM |
| importedContactId | uuid | FK → contacts.id (si importado) |
| importedCompanyId | uuid | FK → companies.id (si importado) |
| createdAt | timestamp | defaultNow() |
| updatedAt | timestamp | defaultNow() |

### Relaciones

- `prospect_searches` → `users`: many-to-one (cada búsqueda pertenece a un usuario)
- `prospect_results` → `prospect_searches`: many-to-one (muchos resultados por búsqueda)
- `prospect_results` → `contacts`: one-to-one opcional (si fue importado)
- `prospect_results` → `companies`: one-to-one opcional (si fue importado)

### Schema Drizzle (añadir a `src/db/schema/index.ts`)

```typescript
export const prospectSearches = pgTable('prospect_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  sector: text('sector').notNull(),
  zone: text('zone').notNull(),
  zoneType: text('zone_type').notNull().default('barrio'),
  keywords: text('keywords').notNull(),
  status: text('status').notNull().default('pending'),
  totalResults: integer('total_results').default(0),
  enrichedCount: integer('enriched_count').default(0),
  importedCount: integer('imported_count').default(0),
  apifyRunId: text('apify_run_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const prospectResults = pgTable('prospect_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  searchId: uuid('search_id').references(() => prospectSearches.id).notNull(),
  googlePlaceId: text('google_place_id').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  district: text('district'),
  neighborhood: text('neighborhood'),
  phone: text('phone'),
  website: text('website'),
  googleRating: numeric('google_rating', { precision: 2, scale: 1 }),
  googleReviewCount: integer('google_review_count').default(0),
  category: text('category'),
  email: text('email'),
  instagram: text('instagram'),
  contactName: text('contact_name'),
  contactTitle: text('contact_title'),
  tripAdvisorRating: numeric('tripadvisor_rating', { precision: 2, scale: 1 }),
  enrichmentStatus: text('enrichment_status').notNull().default('pending'),
  enrichmentData: jsonb('enrichment_data'),
  reviewStatus: text('review_status').notNull().default('pending'),
  importedAt: timestamp('imported_at'),
  importedContactId: uuid('imported_contact_id').references(() => contacts.id),
  importedCompanyId: uuid('imported_company_id').references(() => companies.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

---

## 5. API Design

### Rutas

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/prospecting/search` | Lanza búsqueda en Google Places | Sí |
| POST | `/api/prospecting/enrich` | Inicia enriquecimiento con Apify | Sí |
| POST | `/api/prospecting/webhook` | Recibe resultados de Apify | Token secreto |
| POST | `/api/prospecting/import` | Importa prospectos aprobados al CRM | Sí |
| GET | `/api/prospecting/searches` | Historial de búsquedas | Sí |
| GET | `/api/prospecting/searches/[searchId]` | Resultados de una búsqueda | Sí |
| PATCH | `/api/prospecting/results/[resultId]` | Aprobar / descartar resultado | Sí |

### Endpoint clave: POST `/api/prospecting/search`

**Request body:**
```json
{
  "sector": "restaurantes",
  "zone": "Malasaña",
  "zoneType": "barrio"
}
```

**Lo que hace:**
1. Construye la query: `"restaurantes en Malasaña Madrid"`
2. Llama a Google Places Text Search API (paginación hasta 60 resultados)
3. Para cada resultado llama a Places Details API (teléfono, web, horarios)
4. Inserta `prospect_search` + todos los `prospect_results` en la DB
5. Lanza automáticamente el enriquecimiento (llama a `/api/prospecting/enrich`)
6. Devuelve `{ searchId, totalResults, status: "enriching" }`

**Response:**
```json
{
  "searchId": "uuid",
  "totalResults": 87,
  "status": "enriching",
  "redirectTo": "/prospecting/uuid"
}
```

### Endpoint clave: POST `/api/prospecting/enrich`

**Request body:**
```json
{
  "searchId": "uuid"
}
```

**Lo que hace:**
1. Obtiene todos los `prospect_results` con `website` del `searchId`
2. Construye lista de URLs para Apify
3. Lanza actor de Apify `apify/web-scraper` con webhook configurado
4. Guarda `apifyRunId` en `prospect_searches`
5. Actualiza `enrichmentStatus = "enriching"` en los resultados con web

### Endpoint clave: POST `/api/prospecting/webhook`

**Headers requeridos:** `x-apify-webhook-secret: {APIFY_WEBHOOK_SECRET}`

**Lo que hace:**
1. Valida el token secreto del header
2. Descarga resultados del dataset de Apify
3. Para cada resultado parsea: email, instagram, contactName usando `enrichment-parser.ts`
4. Actualiza cada `prospect_result` con los datos enriquecidos
5. Actualiza `enrichmentStatus = "done"` o `"failed"`
6. Actualiza contadores en `prospect_searches`

### Endpoint clave: POST `/api/prospecting/import`

**Request body:**
```json
{
  "resultIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Lo que hace (para cada resultId):**
1. Verifica que `reviewStatus === "approved"`
2. Verifica duplicados: busca en `companies` por nombre similar y teléfono
3. Si no existe: crea `company` con todos los datos disponibles
4. Crea `contact` asociado a la company (si hay nombre de responsable)
5. Actualiza `prospect_result`: `importedAt`, `importedContactId`, `importedCompanyId`
6. Actualiza `importedCount` en `prospect_searches`

---

## 6. Frontend Architecture

### Páginas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/prospecting` | ProspectingPage | Formulario de búsqueda + historial de búsquedas anteriores |
| `/prospecting/[searchId]` | SearchResultsPage | Tabla de resultados con estado en tiempo real |

### Jerarquía de componentes — `/prospecting/[searchId]`

```
SearchResultsPage (Server Component)
  ├── SearchSummaryHeader          ← nombre búsqueda, fecha, estado, contadores
  ├── EnrichmentProgressBar        ← progreso de enriquecimiento (X de Y completados)
  ├── BulkActionsBar               ← "Aprobar seleccionados" / "Importar aprobados"
  └── ResultsTable (Client Component — polling cada 10s)
        └── ResultRow[]
              ├── EnrichmentBadge  ← pending / enriching / done / failed
              ├── BusinessInfo     ← nombre, dirección, categoría
              ├── ContactInfo      ← teléfono, email, web, instagram
              └── RowActions       ← Aprobar / Descartar / Ver detalle
```

### Estado y tiempo real

- `ResultsTable` es un **Client Component** que hace polling con `useQuery` de React Query cada **10 segundos** mientras `enrichmentStatus` tenga resultados en `"enriching"`
- El polling se detiene automáticamente cuando todos los resultados están en `"done"` o `"failed"`
- No se usa WebSockets — polling es suficiente para este caso de uso y más simple en Vercel
- Los cambios de `reviewStatus` (aprobar/descartar) son optimistic updates con React Query

---

## 7. Design System

Heredado completamente del proyecto KDL CRM existente. No se introducen nuevos tokens.

### Colores del CRM existente (referencia para el nuevo módulo)

| Rol | Uso |
|-----|-----|
| Primary (brand blue) | Botones principales, links activos |
| Success (green) | Badge "done", botón aprobar, datos enriquecidos presentes |
| Warning (amber) | Badge "enriching", pendiente |
| Muted (gray) | Badge "pending", datos vacíos |
| Destructive (red) | Badge "failed", botón descartar |

### Nuevos badges de estado de enriquecimiento

```
pending    → badge gris    → "Pendiente"
enriching  → badge amber   → "Enriqueciendo..." (con spinner)
done       → badge verde   → "Completo"
failed     → badge rojo    → "Error"
```

### Nuevos badges de revisión

```
pending   → sin badge      → estado neutro
approved  → badge verde    → "Aprobado"
discarded → badge rojo     → "Descartado"
imported  → badge azul     → "Importado"
```

---

## 8. Authentication & Authorization

Sin cambios en el sistema de auth. Todas las rutas nuevas siguen el patrón existente:

- **Middleware:** las rutas `/prospecting/*` están protegidas por Clerk (ya configurado en `middleware.ts`)
- **API routes:** verificar `auth()` de Clerk en cada handler. Si no hay userId, return 401.
- **Webhook de Apify:** NO usa Clerk. Validar con header `x-apify-webhook-secret` comparado con `APIFY_WEBHOOK_SECRET` en env vars.

```typescript
// Patrón para API routes del módulo
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // obtener user de DB por clerkId
  // ...
}
```

---

## 9. Build Order

**IMPORTANTE: Este es el orden obligatorio. Cada paso depende del anterior.**

---

### Paso 1: Configurar Google Places API

1. Ir a [https://console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto nuevo o usar uno existente
3. Activar las siguientes APIs:
   - **Places API (New)** — para Text Search y Place Details
4. Ir a "Credentials" → "Create Credentials" → "API Key"
5. Restringir la API key: HTTP referrers (tu dominio) + solo Places API
6. Añadir al `.env.local`:
   ```
   GOOGLE_PLACES_API_KEY=tu_api_key_aqui
   ```
7. Verificar: hacer una llamada de prueba con curl:
   ```bash
   curl "https://places.googleapis.com/v1/places:searchText" \
     -H "Content-Type: application/json" \
     -H "X-Goog-Api-Key: TU_API_KEY" \
     -H "X-Goog-FieldMask: places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.id" \
     -d '{"textQuery": "restaurantes en Malasaña Madrid", "maxResultCount": 20, "languageCode": "es"}'
   ```

**Coste estimado Google Places:**
- Text Search: $0.017 por solicitud (cada página de 20 resultados = 1 solicitud)
- Place Details: $0.017 por lugar
- Una búsqueda de 60 resultados ≈ 3 Text Search + 60 Details = $1.07 máximo
- Con $200 de crédito gratuito mensual de Google → ~180 búsquedas gratis al mes

---

### Paso 2: Configurar Apify

1. Ir a [https://apify.com](https://apify.com) y crear cuenta
2. Plan recomendado: **Starter ($49/mes)** — incluye $49 de crédito de compute
3. Ir a "Settings" → "Integrations" → copiar **API Token**
4. Crear el **Webhook secret**:
   - Generar string aleatorio seguro: `openssl rand -hex 32`
   - Guardar como `APIFY_WEBHOOK_SECRET`
5. Añadir al `.env.local`:
   ```
   APIFY_API_TOKEN=apify_api_xxxxx
   APIFY_WEBHOOK_SECRET=tu_webhook_secret_aqui
   ```
6. El actor que se usará es **`apify/website-content-crawler`** — está disponible en el Apify Store, no hay que crearlo
7. Verificar acceso al actor en: `https://apify.com/apify/website-content-crawler`

**Coste estimado Apify:**
- ~$0.002 por URL scrapeada (website-content-crawler)
- 100 resultados con web ≈ $0.20 por búsqueda completa
- Con plan Starter: ~245 búsquedas completas al mes

---

### Paso 3: Añadir variables de entorno

Añadir a `.env.local` (y a Vercel en Settings → Environment Variables):

```env
# Google Places
GOOGLE_PLACES_API_KEY=

# Apify
APIFY_API_TOKEN=
APIFY_WEBHOOK_SECRET=

# URL de la app (necesaria para el webhook de Apify)
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

**En Vercel:**
1. Dashboard → tu proyecto → Settings → Environment Variables
2. Añadir cada variable para los entornos: Production, Preview, Development

---

### Paso 4: Extender el schema de Drizzle

**Archivo a modificar:** `src/db/schema/index.ts`

Añadir al final del archivo las dos tablas nuevas (código completo en sección 4 de este blueprint):
- `prospectSearches`
- `prospectResults`

Luego ejecutar:
```bash
pnpm db:generate    # genera la migración
pnpm db:push        # aplica la migración a Supabase
```

Verificar en Supabase Dashboard → Table Editor que las tablas `prospect_searches` y `prospect_results` existen con todas las columnas.

---

### Paso 5: Crear constantes de zonas y sectores

**Crear `src/lib/prospecting/madrid-zones.ts`:**

```typescript
export const MADRID_DISTRICTS = [
  'Centro', 'Arganzuela', 'Retiro', 'Salamanca', 'Chamartín',
  'Tetuán', 'Chamberí', 'Fuencarral-El Pardo', 'Moncloa-Aravaca',
  'Latina', 'Carabanchel', 'Usera', 'Puente de Vallecas',
  'Moratalaz', 'Ciudad Lineal', 'Hortaleza', 'Villaverde',
  'Villa de Vallecas', 'Vicálvaro', 'San Blas-Canillejas', 'Barajas'
] as const;

export const MADRID_NEIGHBORHOODS: Record<string, string[]> = {
  'Centro': ['Malasaña', 'Chueca', 'Sol', 'La Latina', 'Lavapiés', 'Huertas', 'Conde Duque'],
  'Salamanca': ['Recoletos', 'Goya', 'Lista', 'Castellana'],
  'Chamberí': ['Almagro', 'Trafalgar', 'Ríos Rosas', 'Gaztambide', 'Arapiles'],
  // ... añadir resto de distritos
};

export type MadridDistrict = typeof MADRID_DISTRICTS[number];
```

**Crear `src/lib/prospecting/sectors.ts`:**

```typescript
export const SECTORS = [
  {
    id: 'restaurantes',
    label: 'Restaurantes',
    keywords: ['restaurante', 'bar de tapas', 'taberna', 'bistró'],
    googleType: 'restaurant',
  },
  {
    id: 'cafeterias',
    label: 'Cafeterías y Brunch',
    keywords: ['cafetería', 'café', 'brunch', 'desayunos'],
    googleType: 'cafe',
  },
  {
    id: 'hoteles',
    label: 'Hoteles',
    keywords: ['hotel', 'hostal', 'pensión'],
    googleType: 'lodging',
  },
  {
    id: 'dentistas',
    label: 'Clínicas Dentales',
    keywords: ['clínica dental', 'dentista', 'odontología'],
    googleType: 'dentist',
  },
  {
    id: 'fisioterapia',
    label: 'Fisioterapia',
    keywords: ['fisioterapia', 'fisioterapeuta', 'rehabilitación'],
    googleType: 'physiotherapist',
  },
  {
    id: 'peluquerias',
    label: 'Peluquerías',
    keywords: ['peluquería', 'barbería', 'salón de belleza'],
    googleType: 'hair_care',
  },
] as const;

export type SectorId = typeof SECTORS[number]['id'];
```

---

### Paso 6: Crear cliente de Google Places

**Crear `src/lib/prospecting/google-places.ts`:**

Este módulo debe implementar:

```typescript
// Tipos
type PlaceResult = {
  googlePlaceId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Función principal
async function searchPlaces(
  query: string,
  maxResults: number = 60
): Promise<PlaceResult[]>
```

**Implementación usando Google Places API (New) — Text Search:**

```
POST https://places.googleapis.com/v1/places:searchText
Headers:
  Content-Type: application/json
  X-Goog-Api-Key: {GOOGLE_PLACES_API_KEY}
  X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.location,nextPageToken

Body:
{
  "textQuery": "{query}",
  "maxResultCount": 20,
  "languageCode": "es",
  "locationBias": {
    "circle": {
      "center": { "latitude": 40.4168, "longitude": -3.7038 },
      "radius": 50000.0
    }
  }
}
```

- Manejar paginación con `nextPageToken` hasta obtener `maxResults` o no haya más páginas
- Máximo 3 páginas (60 resultados)
- Rate limiting: esperar 200ms entre páginas

---

### Paso 7: Crear cliente de Apify

**Crear `src/lib/prospecting/apify-client.ts`:**

```typescript
// Lanzar un run del actor website-content-crawler
async function launchEnrichmentRun(
  urls: string[],
  webhookUrl: string,
  webhookSecret: string
): Promise<{ runId: string }>

// Descargar dataset de un run completado
async function getRunDataset(runId: string): Promise<ApifyRecord[]>
```

**Configuración del actor `apify/website-content-crawler`:**

```json
{
  "startUrls": [{"url": "https://ejemplo.com"}],
  "maxCrawlPages": 3,
  "maxCrawlDepth": 1,
  "crawlerType": "cheerio",
  "proxyConfiguration": {"useApifyProxy": true}
}
```

**Webhook al lanzar el run:**
```
POST https://api.apify.com/v2/acts/apify~website-content-crawler/runs
Headers:
  Authorization: Bearer {APIFY_API_TOKEN}
Body:
{
  "startUrls": [...],
  "webhooks": [{
    "eventTypes": ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
    "requestUrl": "https://tu-app.vercel.app/api/prospecting/webhook",
    "headersTemplate": "{\"x-apify-webhook-secret\": \"{APIFY_WEBHOOK_SECRET}\"}"
  }]
}
```

---

### Paso 8: Crear parser de enriquecimiento

**Crear `src/lib/prospecting/enrichment-parser.ts`:**

Este módulo recibe el texto HTML/markdown de cada página scrapeada y extrae:

```typescript
type EnrichedData = {
  email: string | null;
  instagram: string | null;
  contactName: string | null;
  contactTitle: string | null;
};

function parseEnrichedData(pageContent: string, pageUrl: string): EnrichedData
```

**Lógica de extracción:**

1. **Email:** regex `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` — filtrar emails genéricos (info@, contacto@, etc.) y quedarse con el más específico. Si hay varios, priorizar el que no sea genérico.

2. **Instagram:** buscar patrones:
   - `instagram.com/(@?[\w.]+)`
   - `@[\w.]+ en Instagram`
   - Links en el HTML con `href` que contengan `instagram.com`

3. **Nombre responsable:** buscar patrones comunes en webs de pequeño negocio:
   - `<meta name="author" content="...">`
   - Frases como "Hola, soy [Nombre]", "Fundado por [Nombre]", "Chef [Nombre]"
   - Sección "Sobre nosotros" / "Quiénes somos" — primer nombre propio encontrado
   - Este campo tendrá baja fiabilidad — está bien dejarlo null si no es claro

---

### Paso 9: Crear lógica de importación al CRM

**Crear `src/lib/prospecting/import-to-crm.ts`:**

```typescript
async function importProspectToCRM(
  result: ProspectResult,
  userId: string
): Promise<{ contactId: string | null; companyId: string | null }>
```

**Lógica de deduplicación antes de insertar:**

1. Buscar en `companies` por `name` similar (ILIKE `%nombre%`) Y mismo `phone` o `website`
2. Si existe empresa: no crear duplicado, asociar al contacto si se va a crear
3. Si no existe: crear `company` con:
   - `name` ← result.name
   - `phone` ← result.phone
   - `website` ← result.website
   - `address` ← result.address
   - `city` ← "Madrid"
   - `country` ← "España"
   - `industry` ← result.sector (de la búsqueda)
   - `ownerId` ← userId
4. Si `result.contactName` existe: crear `contact` con:
   - `firstName` / `lastName` ← split de contactName
   - `email` ← result.email
   - `jobTitle` ← result.contactTitle
   - `companyId` ← company recién creada o encontrada
   - `source` ← "prospecting"
   - `lifecycleStage` ← "lead"
   - `ownerId` ← userId

---

### Paso 10: Crear API routes

Crear los 7 archivos de routes descritos en la sección 5. Orden de implementación:

1. `GET /api/prospecting/searches` — más simple, solo leer de DB
2. `GET /api/prospecting/searches/[searchId]` — leer resultados
3. `PATCH /api/prospecting/results/[resultId]` — actualizar reviewStatus
4. `POST /api/prospecting/webhook` — validar secret + parsear + guardar
5. `POST /api/prospecting/enrich` — lanzar Apify
6. `POST /api/prospecting/search` — orquestar todo
7. `POST /api/prospecting/import` — importar al CRM

**Patrón de response consistente para todos los endpoints:**

```typescript
// Éxito
return Response.json({ data: resultado }, { status: 200 });

// Error de validación
return Response.json({ error: 'mensaje descriptivo' }, { status: 400 });

// No autorizado
return Response.json({ error: 'Unauthorized' }, { status: 401 });

// Error de servidor
return Response.json({ error: 'Internal server error' }, { status: 500 });
```

---

### Paso 11: Crear componentes de UI

Orden de implementación:

1. **`enrichment-badge.tsx`** — el más simple, solo lógica de color por estado
2. **`result-row.tsx`** — fila de tabla con todos los campos y acciones
3. **`results-table.tsx`** — tabla completa con polling de React Query
4. **`import-button.tsx`** — botón con confirmación y feedback
5. **`search-form.tsx`** — formulario con selects de sector y zona
6. **`search-history.tsx`** — lista de búsquedas previas con link a resultados

**Nota sobre `results-table.tsx`:**

```typescript
// Polling con React Query — parar cuando todo esté enriquecido
const { data } = useQuery({
  queryKey: ['prospecting', 'results', searchId],
  queryFn: () => fetch(`/api/prospecting/searches/${searchId}`).then(r => r.json()),
  refetchInterval: (data) => {
    const hasEnriching = data?.results?.some(r => r.enrichmentStatus === 'enriching');
    return hasEnriching ? 10000 : false; // 10s si hay pendientes, parar si no
  },
});
```

---

### Paso 12: Crear páginas

1. **`src/app/prospecting/page.tsx`** (Server Component):
   - Obtener historial de búsquedas del usuario actual
   - Renderizar `<SearchForm />` + `<SearchHistory />`

2. **`src/app/prospecting/[searchId]/page.tsx`** (Server Component):
   - Obtener datos iniciales de la búsqueda desde DB
   - Renderizar `<SearchSummaryHeader />` + `<ResultsTable />` (Client)

---

### Paso 13: Añadir enlace en la sidebar

**Archivo a modificar:** `src/components/app/sidebar.tsx`

Añadir item de navegación al módulo de Prospecting, agrupado con los módulos existentes:

```typescript
{
  href: '/prospecting',
  label: 'Prospección',
  icon: SearchIcon, // o Radar, Target — de lucide-react
}
```

---

### Paso 14: Verificación end-to-end

Pasos de verificación manual:

1. Ir a `/prospecting`
2. Seleccionar sector "Restaurantes" + zona "Malasaña"
3. Click en buscar → debe redirigir a `/prospecting/[searchId]`
4. Verificar que aparecen resultados de Google Places (nombre, dirección, teléfono)
5. Esperar ~2-5 min → verificar que el estado de enriquecimiento cambia de "Pendiente" a "Enriqueciendo" a "Completo"
6. Verificar que los campos email e instagram se completan donde estén disponibles
7. Aprobar 3-5 resultados y hacer click en "Importar aprobados"
8. Ir a `/companies` y verificar que las empresas aparecen
9. Ir a `/contacts` y verificar que los contactos aparecen (si había nombre)
10. Verificar que no hay duplicados si se importa el mismo resultado dos veces

---

## 10. Environment Setup

### Variables de entorno completas

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `GOOGLE_PLACES_API_KEY` | API Key de Google Places | [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials |
| `APIFY_API_TOKEN` | Token de autenticación de Apify | [apify.com](https://apify.com) → Settings → Integrations → API token |
| `APIFY_WEBHOOK_SECRET` | Secret para verificar webhooks de Apify | Generar: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | URL de producción de la app | Tu dominio en Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Ya existe en el proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima Supabase | Ya existe |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio Supabase | Ya existe |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Ya existe |
| `CLERK_SECRET_KEY` | Clerk secret key | Ya existe |

### Configurar Google Places paso a paso

```
1. Ir a https://console.cloud.google.com
2. Crear/seleccionar proyecto
3. Menú → APIs & Services → Library
4. Buscar "Places API (New)" → Enable
5. Menú → APIs & Services → Credentials
6. + Create Credentials → API Key
7. Click en la key creada → Application restrictions: HTTP referrers
8. Añadir: https://tu-dominio.vercel.app/* y http://localhost:3000/*
9. API restrictions: Restrict key → Places API (New)
10. Save → copiar la key al .env.local
```

### Configurar Apify paso a paso

```
1. Ir a https://apify.com → Sign Up
2. Elegir plan Starter ($49/mes) o Free para testing inicial
3. Settings (icono usuario) → Integrations
4. Copiar "Personal API token"
5. Generar webhook secret: openssl rand -hex 32
6. Ambos valores al .env.local
```

### Comandos de setup

```bash
# 1. Instalar dependencias (no hay nuevas — todo se hace con fetch nativo)
pnpm install

# 2. Aplicar migraciones de DB
pnpm db:generate
pnpm db:push

# 3. Verificar que las tablas existen en Supabase
# Ir a Supabase Dashboard → Table Editor → buscar prospect_searches

# 4. Iniciar dev server
pnpm dev

# 5. Para testing del webhook de Apify en local, usar ngrok:
npx ngrok http 3000
# Copiar la URL de ngrok como NEXT_PUBLIC_APP_URL temporalmente para testing
```

---

## 11. Dependencies

No se añaden dependencias npm nuevas. Todo se implementa con:

- **`fetch`** nativo de Node.js 18+ para llamadas a Google Places API y Apify API
- **Drizzle ORM** (ya instalado) para las queries de DB
- **React Query** (ya instalado) para el polling en el cliente
- **shadcn/ui** (ya instalado) para los componentes de UI

Esto es intencional: mantener el bundle size igual y no introducir dependencias que haya que mantener.

---

## 12. Deployment Strategy

### Vercel — configuración adicional

1. En Vercel Dashboard → Settings → Environment Variables: añadir las 4 variables nuevas
2. En Vercel Dashboard → Settings → Functions: verificar que el timeout es mínimo **30s** (necesario para `/api/prospecting/search` que hace múltiples llamadas a Google)
3. Si el plan es Hobby (10s timeout), **actualizar a Pro** antes de implementar este módulo

### Consideración importante sobre el webhook de Apify

Apify necesita llamar a `/api/prospecting/webhook` cuando termina el enriquecimiento. Esto requiere que la app esté desplegada en un URL público. **En desarrollo local usar ngrok:**

```bash
npx ngrok http 3000
# La URL temporal de ngrok va como NEXT_PUBLIC_APP_URL en .env.local durante dev
```

### Estimación de costes en producción (50 búsquedas/mes)

| Servicio | Uso estimado | Coste |
|----------|-------------|-------|
| Google Places | 50 búsquedas × $1.07 | ~$53/mes |
| Apify | 50 búsquedas × $0.20 | ~$10/mes |
| Vercel Pro (si aplica) | plan fijo | $20/mes |
| Supabase | sin cambio significativo | $0 extra |
| **Total adicional** | | **~$63/mes** |

Con el crédito gratuito de $200/mes de Google Maps Platform, el coste real en el primer período es aproximadamente **$10-30/mes**.

---

## 13. Testing Strategy

### Tests manuales (obligatorios antes de merge)

1. Búsqueda exitosa con resultados (sector + zona válidos)
2. Búsqueda con zona sin resultados (zona muy específica) — verificar manejo de 0 resultados
3. Enriquecimiento completo end-to-end (esperar webhook de Apify)
4. Importación sin duplicados
5. Intento de importar el mismo prospecto dos veces — verificar que no crea duplicado

### Tests de integración recomendados

```typescript
// src/lib/prospecting/enrichment-parser.test.ts
// Casos a cubrir:
// - Email en mailto: link
// - Email en texto plano
// - Instagram en href
// - Instagram en texto @handle
// - Página sin email ni Instagram → todo null
// - Múltiples emails → retorna el más específico
```

### No es necesario (para esta fase)

- E2E con Playwright para el flujo completo (el webhook de Apify hace el test E2E imposible en CI)
- Tests de las API routes de Google/Apify (son llamadas externas, testear con mocks es poco valor)

---

## 14. Skills para usar durante el build

| Skill | Cuándo usarla |
|-------|---------------|
| `/verification-before-completion` | Antes de marcar cualquier paso como completado |
| `/simplify` | Después de implementar cada API route, para revisar calidad |
| `/security-review` | Antes del deploy final — revisar que el webhook valida el secret correctamente |

---

## 15. CLAUDE.md para el proyecto objetivo

```markdown
# KDL CRM

CRM para gestión de clientes y prospección automatizada de negocios locales en Madrid.

## Commands

- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm lint` — Run linter
- `pnpm db:generate` — Generar migración Drizzle
- `pnpm db:push` — Aplicar schema a Supabase

## Tech Stack

Next.js 15 App Router + TypeScript strict + Tailwind CSS v4 + shadcn/ui + Supabase (Postgres) + Drizzle ORM + Clerk Auth + Vercel

## Architecture

### Directory Structure
- `src/app/` — Pages y API routes (App Router)
- `src/components/ui/` — Componentes base de shadcn/ui
- `src/components/app/` — Componentes específicos de la app por módulo
- `src/lib/` — Utilidades, clientes de DB, helpers de auth
- `src/lib/prospecting/` — Lógica del módulo de prospección (Google Places, Apify, parser)
- `src/db/schema/` — Schema de Drizzle ORM

### Data Flow
- Server Components leen de DB directamente con Drizzle
- Client Components usan React Query para estado del servidor
- API routes validan auth con Clerk antes de cualquier operación
- El módulo de prospección usa polling (React Query, 10s interval) en lugar de WebSockets

### Key Patterns
- Server Components por defecto — "use client" solo cuando hay interactividad
- Todas las queries de DB pasan por Drizzle ORM (nunca SQL raw ni cliente Supabase directo para queries)
- Auth en API routes: `const { userId } = await auth()` — return 401 si no hay userId
- Response shape consistente: `{ data: ... }` éxito, `{ error: '...' }` error
- El webhook de Apify se valida con header `x-apify-webhook-secret`

## Environment Variables

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | App URL — necesario para webhooks de Apify |
| `GOOGLE_PLACES_API_KEY` | Google Places API key (Places API New) |
| `APIFY_API_TOKEN` | Apify personal API token |
| `APIFY_WEBHOOK_SECRET` | Secret para validar webhooks entrantes de Apify |

## Reglas No Negociables

1. TypeScript strict — sin `any`, sin `@ts-ignore`
2. Todos los endpoints nuevos devuelven `{ data }` o `{ error }` — sin excepciones
3. El webhook de Apify SIEMPRE valida el header `x-apify-webhook-secret` antes de procesar
4. Nunca insertar en `contacts` o `companies` sin verificar duplicados primero
5. El polling de React Query DEBE parar cuando no hay resultados en estado "enriching"
6. Un componente por archivo, máximo 300 líneas
7. Nunca hacer llamadas a APIs externas desde Client Components — siempre a través de API routes
```

---

## 16. Reglas No Negociables

1. **No modificar tablas existentes.** Solo añadir `prospect_searches` y `prospect_results`. Las tablas `contacts` y `companies` se usan tal cual están.
2. **Webhook de Apify siempre validado.** Antes de procesar cualquier payload del webhook, verificar `x-apify-webhook-secret`. Sin validación = sin procesamiento.
3. **Deduplicación obligatoria antes de importar.** Nunca crear un `company` o `contact` sin buscar primero si ya existe por nombre + teléfono/web.
4. **Timeout de Vercel.** La ruta `/api/prospecting/search` puede tardar 15-25s (múltiples llamadas a Google). Requiere plan Pro de Vercel (60s timeout). No usar plan Hobby.
5. **No Playwright en Vercel.** El enriquecimiento se delega a Apify. Nunca instalar puppeteer/playwright como dependencia de este proyecto.
6. **Source tracking obligatorio.** Todo contact importado desde prospección tiene `source: "prospecting"`. Nunca omitir este campo.
7. **Polling debe terminar.** El `refetchInterval` de React Query debe retornar `false` cuando no haya resultados en estado `"enriching"`. Sin polling infinito.
