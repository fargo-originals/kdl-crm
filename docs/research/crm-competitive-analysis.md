# Análisis Competitivo CRM — KDL CRM vs Industria
**Fecha:** Mayo 2026 | **Alcance:** Brevo · Keap · HubSpot Sales CRM · Affinity · Zoho CRM · Folk · Pipedrive  
**Propósito:** Identificar gaps de features, patrones arquitectónicos a adoptar/evitar, y roadmap priorizado para KDL CRM.

---

## 1. Executive Summary

KDL CRM tiene una base técnica sólida y dos diferenciadores únicos en el mercado SMB español:
1. **Prospección automática con Apify** (Google Maps → enriquecimiento web → import CRM en 1 clic)
2. **Agente IA conversacional (Claude)** integrado tanto para leads inbound como outreach frío, sobre canales email y WhatsApp nativos

Sin embargo, faltan features que el mercado considera **table stakes** para un CRM de ventas:

| Prioridad | Gap crítico | Todos los competidores lo tienen |
|-----------|-------------|----------------------------------|
| P0 | Custom fields configurables por usuario (UI) | ✓ todos 7 |
| P0 | Inbox sync Gmail/Outlook 2-way | HubSpot, Folk, Pipedrive, Zoho |
| P0 | Reporting/dashboards custom | ✓ todos 7 |
| P0 | Meeting scheduler self-service (tipo Calendly) | HubSpot, Keap, Brevo, Pipedrive, Zoho |
| P1 | Workflow automation visual | HubSpot, Keap, Zoho, Brevo |
| P1 | Lead scoring automático | HubSpot, Zoho, Keap, Brevo |
| P1 | Sales cadences / secuencias | HubSpot, Pipedrive, Keap |
| P1 | Mobile app (PWA mínimo) | HubSpot, Keap, Zoho, Pipedrive, Affinity |
| P2 | Quotes / invoicing | Keap, Zoho, HubSpot |
| P2 | Public API + webhooks externos | ✓ todos 7 |
| P3 | Custom objects / object designer | HubSpot, Zoho, Salesforce |
| P3 | Telephony / VoIP | HubSpot, Keap, Brevo, Zoho |

**Oportunidades de diferenciación genuina para KDL vs todos los competidores:**
- WhatsApp Business **nativo y automatizado** como canal principal de ventas (ninguno lo hace bien para España)
- Agente IA (Claude) para cualificación conversacional + gestión de respuestas (ninguno tiene algo equivalente en SMB tier)
- Prospección geolocalizada Madrid integrada en el mismo CRM (ninguno lo ofrece)
- Landing CMS integrado — pocas startups CRM tienen esto a este precio

---

## 2. Inventario KDL CRM — Estado Actual (Auditado del Código)

### Stack tecnológico
| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.4 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) |
| DB | Supabase Postgres + RLS |
| ORM | Drizzle |
| Auth | Custom JWT + Google OAuth (bcrypt passwords) |
| Email sending | Resend SDK |
| Email inbound | Resend webhook → `email.received` |
| WhatsApp | Meta Graph API v20.0 (send/receive/templates) |
| AI | Vercel AI SDK (`@ai-sdk/anthropic` + `@ai-sdk/openai`) |
| State client | TanStack React Query + Zustand |
| Drag & drop | dnd-kit + @hello-pangea/dnd |
| Notificaciones | Slack Web API + in-app |
| Prospecting | Apify (Google Maps Scraper + Website Content Crawler) |
| Hosting | Vercel |
| Facturación | — (no existe) |

### Objetos / tablas en DB

| Objeto | Campos destacados | Estado |
|--------|-------------------|--------|
| `users` | role (owner/admin/seller), googleId, emailVerified | ✓ |
| `companies` | name, domain, industry, size, revenue, phone, **email**, website, instagram, facebook, linkedin, notes | ✓ |
| `contacts` | first/last_name, email, phone, job_title, company_id, **lead_score int**, lifecycle_stage, custom_fields jsonb | ✓ |
| `deals` | stage, value, probability, expected_close_date, won/lost_reason | ✓ |
| `pipeline_stages` | name, position, color, probability_default, is_won, is_lost | ✓ |
| `tickets` | title, description, status, priority, category | ✓ |
| `tasks` | title, due_date, priority, reminder_at, assignee_id | ✓ |
| `activities` | type, subject, direction, duration, outcome | ✓ |
| `integrations` | type, access/refresh token | ✓ |
| `prospect_searches` | sector, zone, zone_type, keywords, status, apify_run_id | ✓ único |
| `prospect_results` | google_place_id, name, phone, email, website, google_rating, neighborhood, enrichment_status | ✓ único |
| `email_campaigns` | sector, tono, template_type, subject, body_html, status, sent/opened/clicked/bounced counts | ✓ |
| `email_campaign_recipients` | email, variables jsonb, status, sent/opened/clicked_at | ✓ |
| `email_campaign_events` | type, metadata | ✓ |
| `agent_sessions` | channel (email/whatsapp), messages jsonb, status, external_contact_id, campaign_recipient_id | ✓ único |
| `sales_availability` | weekday, start_time, end_time, timezone | ✓ |
| `appointments` | proposed_slots, confirmed_slot, meeting_url, status | ◐ básico |
| `notifications` | type, title, body, read | ✓ |
| `lead_inquiries` | full_name, email, phone, business_name, service_interest, preferred_channel, status, qualification_data | ✓ |
| `landing_*` (8 tablas) | hero, services, portfolio, testimonials, faq, team, blog, settings | ✓ único |

### Features por módulo

| Módulo | Estado | Notas |
|--------|--------|-------|
| Empresas CRUD | ✓ | Filtros sector/barrio/search, WA pre-cargado, social links |
| Contactos CRUD | ✓ | lead_score int presente pero sin UI de scoring rules |
| Pipeline/Deals kanban | ✓ | 1 pipeline, stages configurables |
| Tareas | ✓ | Asignación, reminder_at, prioridad |
| Tickets | ✓ | Help desk básico |
| Registro de actividades | ✓ | Vinculado a empresa/contacto/deal |
| Email campañas (outbound) | ✓ | Templates playbook, batch Resend, tracking open/click |
| Email inbound (replies) | ✓ | Webhook Resend → agente IA responde |
| WhatsApp Business (API) | ✓ | Templates aprobados, mensajes libres, inbound webhook |
| WhatsApp semi-manual | ✓ | wa.me con mensaje pre-cargado según sector/web |
| Agente IA (cualificación) | ✓ | Claude, tools (proposeSlots, saveAnswer, requestHumanHandoff), inbound + outreach |
| Prospección Apify | ✓ | Google Maps → enriquecimiento web → review → import CRM |
| Landing CMS | ✓ | Hero, servicios, portfolio, blog, FAQ, equipo, testimonios |
| Lead capture (landing form) | ✓ | → lead_inquiries → agent_session |
| Appointment scheduler | ◐ | proposed_slots manual, no self-service booking page pública |
| Notificaciones | ◐ | In-app + Slack, no push mobile |
| Reporting/Analytics | ◐ | Solo métricas básicas de campaña (sent/opened/clicked %) |
| Custom fields (UI) | ✗ | custom_fields jsonb existe en contacts pero sin editor |
| Workflow automation | ✗ | — |
| Inbox sync Gmail/Outlook | ✗ | Solo outbound + inbound webhook propio |
| Lead scoring (reglas) | ✗ | Campo lead_score int existe, sin lógica |
| Mobile app | ✗ | Solo web responsive |
| Public API + webhooks ext. | ✗ | Endpoints internos solamente |
| Multi-pipeline | ✗ | Un solo pipeline |
| Forecasting revenue | ✗ | — |
| Quotes / invoicing | ✗ | — |
| Custom objects | ✗ | — |
| Telephony | ✗ | — |
| 2FA / SSO / SAML | ✗ | Solo contraseña + Google OAuth |
| Audit log | ✗ | — |
| GDPR tooling (UI) | ✗ | Supabase RLS es técnico, sin UI de consent/RTBF |

---

## 3. Perfiles de Competidores

### 3.1 Brevo (ex-Sendinblue)

**Posicionamiento:** All-in-one marketing + ventas + conversaciones + transaccional. Raíces en email, CRM añadido después.  
**Segmento:** SMB 1-200 empleados. Fuerte en e-commerce, hostelería, retail — exactamente el target de KDL.  
**Precio entrada:** Gratis (300 emails/día). Business desde €18/mes (5K emails).

**Features destacadas:**
- ✓ WhatsApp Business nativo (24h window logic implementado)
- ✓ SMS nativo
- ✓ Conversaciones unificadas (email + WA + FB + Instagram + live chat + SMS)
- ✓ VoIP propio (Brevo Phone) incluido en Sales Advanced
- ✓ Meeting scheduler con Stripe (cobro de citas)
- ✓ Aura AI: genera workflows desde texto, sugiere contenido, send-time optimization
- ✓ MCP server publicado para Claude/ChatGPT
- ◐ Inbox sync email: SOLO para Conversations — sin 2-way Gmail/Outlook sync para reps comerciales
- ✗ Custom objects
- ✗ Propuestas / e-firma

**Arquitectura:**
- Frontend: React + Storybook + design system "Indigo" en Cloudflare Pages
- Backend: PHP legacy + Node.js (servicios nuevos) + Kafka (6 clusters, 40K+ particiones)
- DB: MongoDB primario + Redshift + Google Cloud Dataproc
- AI: "Aura" — proveedor LLM **no público**, agnóstico (MCP server compatible con Claude/GPT)
- Multi-tenancy: row-level, "centralized contact DB"
- API: REST v3, webhooks con límite de **40 por cuenta** (llamativo)
- Hosting: EU (multi-datacenter), Cloudflare edge

**Debilidades clave (G2/Capterra 2025):**
1. Suspensiones agresivas de deliverability sin escalación humana
2. Soporte lento y genérico
3. Reporting superficial (validado por su migración a Omni Analytics)

---

### 3.2 Keap (ex-Infusionsoft)

**Posicionamiento:** CRM + automatización + facturación para solopreneurs y microempresas de servicios. Mayoritariamente US.  
**Segmento:** 1-10 empleados, anglohablante, servicios profesionales (coaches, consultores, inmobiliaria).  
**Precio entrada:** $299/mes (caro). Adquirido por Thryv Holdings (2024) por $80M.

**Features destacadas:**
- ✓✓ Automatización visual: "Easy Automations" (when/then) + "Advanced Automations" (DAG visual completo) — la más madura del mercado SMB
- ✓✓ Facturación nativa: order forms, subscriptions, upsells, dunning, ACH, Stripe Connect
- ✓ Appointment scheduler embebido con recordatorios automáticos 24h+1h
- ✓ VoIP propio ("Keap Business Line") para US/CA
- ◐ Email sync: Gmail/Outlook 1-way únicamente (sin adjuntos, delay 5-10 min)
- ◐ SMS: US/CA solamente, vía add-on
- ✗ WhatsApp nativo (solo vía Sociocs/Twilio terceros)
- ✗ Custom objects
- ✗ Audit log
- ✗ SAML SSO

**Arquitectura:**
- Backend: Java histórico. Dos UIs coexisten (Keap + "Max Classic" legacy) — 10+ años de migración incompleta
- DB: MySQL histórico, **no público** en stack actual
- API: REST v1 + v2. OAuth 2.0, scope único `full` (sin granularidad). Rate limit: 25 req/s
- SDKs: OpenAPI-generated en github.com/infusionsoft/keap-sdk (Node, Java, PHP, Python, C#, TypeScript) — patrón eficiente a copiar
- Hosting: US-only (sin EU region) — bloqueante para SMBs en Madrid (RGPD)
- Status: 635+ outages en ~3 años. Sin SLA público.

**Debilidades clave:**
1. Precio: $299/mes — el más caro del benchmark para SMB. Sin free tier.
2. "Entorno fracturado": dos UIs, dos help centers, API v1 + v2 sin unificar en 10 años
3. US-only: sin WhatsApp, sin EU hosting, sin soporte multilingüe real

---

### 3.3 HubSpot Sales CRM

**Posicionamiento:** La referencia obligatoria del mercado. Full-stack CRM con ecosistema de 1,500+ integraciones.  
**Segmento:** Mid-market y enterprise. SMB solo con múltiples Hubs.  
**Precio entrada:** Free (CRM básico sin sequences). Pro: $100/seat/mes + onboarding $1,500 obligatorio.

**Features destacadas:**
- ✓ Sequences multi-canal (email + llamada + LinkedIn) — cadencias de outreach
- ✓ Email tracking 2-way (Gmail/Outlook) con notificaciones en tiempo real
- ✓ Breeze AI (2025): multi-modelo (GPT-4o principal, Claude secundario), Prospecting Agent ($1/lead), Customer Agent ($0.50/conversación)
- ✓ Custom objects (Enterprise): object designer completo
- ✓ Workflows visuales potentes + Operations Hub (Python/JS scripting)
- ✓ Custom Report Builder en Pro+
- ✓ Conversations Inbox unificada (email, chat, WhatsApp, FB Messenger)
- ✓ Meeting scheduler (round-robin, grupos)
- ✓ 1,500+ integraciones en marketplace
- ◐ WhatsApp: nativo en Pro/Enterprise, sin mensajería proactiva masiva
- ◐ Mobile: existe pero reducida vs web

**Arquitectura:**
- Frontend: React + Backbone.js legacy, sistema de diseño "Canvas". Micro-frontends en módulos nuevos.
- Backend: **Java monoglot** (decisión arquitectónica fundacional). 3,000+ microservicios. Frameworks: Dropwizard, gRPC, GraphQL.
- DB: **Vitess/MySQL** (core transaccional, 1,000+ clusters), HBase (series temporales), Elasticsearch (búsqueda), Kafka (mensajería eventos)
- Multi-tenancy: row-level con `portalId`. 288,706 clientes.
- API: REST v3 + GraphQL (30K puntos/request). Rate: 100-190 req/10s. Webhooks con retry + idempotencia por `eventId`.
- AI: OpenAI GPT-4o (principal) + Anthropic Claude (secundario). "Model Zero Data Retention".
- Hosting: AWS, regiones EU (Frankfurt/Irlanda). Data residency EU en Enterprise.
- Open source: github.com/HubSpot — vitess fork, jinjava, Singularity, Baragon

**Engineering blog:** product.hubspot.com/engineering — activo, muy técnico (Vitess migrations, microservices tooling, Kafka patterns)

**Debilidades clave:**
1. Trampa de precio: Starter $15/seat es inútil sin sequences/automation; salto a Pro $100/seat muy agresivo
2. Contratos difíciles de cancelar. Trustpilot 2.0/5 por billing disputes.
3. Demasiado complejo para equipos <10 personas

---

### 3.4 Affinity

**Posicionamiento:** CRM de inteligencia relacional para VC/PE/banca de inversión. Auto-llena contactos desde email/calendar del equipo.  
**Segmento:** Firmas de capital riesgo, PE, M&A advisory, family offices. **No aplica directamente a KDL.**  
**Precio:** ~$2,000-2,700/usuario/año. Enterprise desde $150K ACV.

**Features únicas (adaptables a KDL):**
- ✓✓ Auto-population de contactos: cualquier email intercambiado → Contact record automático
- ✓✓ Relationship score 1-10 por contacto (recency + frequency firmwide)
- ✓✓ Pathfinder: "¿quién en mi equipo tiene mejor relación con esta persona?"
- ✓✓ AI Notetaker: auto-join a Zoom/Meet + transcript + sync al CRM
- ✓ Deal Assist: Q&A conversacional sobre notas/PDFs del deal (RAG sobre datos del cliente)
- ✓ MCP server publicado (Anthropic Claude es el LLM confirmado)
- ◐ Workflow automation: básico (if-then dependent fields), no es n8n-grade
- ✗ Email marketing/campañas
- ✗ WhatsApp / SMS

**Arquitectura:**
- Frontend: React + TypeScript
- Backend: Ruby (on Rails probable) + PostgreSQL + AWS Kubernetes
- LLM: **Anthropic Claude** (subprocessor confirmado en security page)
- Multi-tenancy: logical isolation, RBAC por lista/campo/registro
- Webhooks: solo 3 subscriptions por instancia (limitación notable)
- Modelo de "relationship graph": **NOT Neo4j** — Postgres con tablas de interactions bien indexadas + scores materializados. Demuestra que no se necesita graph DB para esta funcionalidad.

**Qué adaptar a KDL para SMB Madrid:**
1. Auto-creation de contacto desde cualquier interacción WhatsApp/email con número/email desconocido
2. "Engagement score" por cliente (recency + frequency de visitas, compras, respuestas a campañas) → versión SMB del relationship score
3. AI summarization de hilos de conversación → "resume las 20 últimas interacciones con este cliente"
4. "Quién en tu equipo atendió mejor a este cliente" → para hostelería multi-empleado

---

### 3.5 Zoho CRM

**Posicionamiento:** Suite completa a precio agresivo. La navaja suiza del CRM SMB/mid-market.  
**Segmento:** SMB → mid-market global. Muy fuerte en India/Asia/LATAM. Creciente en EU.  
**Precio entrada:** Free (3 usuarios). Standard €14/usuario/mes. Zoho One (45+ apps): €37/usuario/mes.

**Features destacadas:**
- ✓ Blueprint: state machine visual para procesos complejos con validaciones y SLAs — más allá de workflows simples
- ✓ Custom Modules: hasta 50 módulos custom con campos, relaciones, workflows propios
- ✓ Zia AI: voice assistant, predicciones ML per-tenant, sentiment analysis, best time to contact, anomaly detection, OCR business cards — suite AI más madura del segmento SMB
- ✓ Deluge scripting: DSL propietario server-side para lógica custom sin código externo
- ✓ Territory management + field-level security + granular RBAC
- ✓ Zoho Sign (e-firma) integrado nativamente en deals
- ✓ WhatsApp Business nativo (desde 2022, mejorado 2024)
- ✓ Zoho Voice: VoIP propio con números en España
- ✓ Bigin: CRM ligero separado para freelancers/microempresas
- ◐ Email: SalesInbox solo en Enterprise+

**Arquitectura:**
- Frontend: "ZeT" (framework propio), no React público en core CRM
- Backend: Java + Scala + Python (ML/Zia). Microservicios.
- DB: MySQL legacy + PostgreSQL (nuevos) + Cassandra (escala) + Elasticsearch
- **Hosting propio** (NO AWS/GCP/Azure): datacenters en EU (Ámsterdam, Dublín), US, India, AU, JP, CA. Diferenciador único en el mercado.
- AI (Zia): modelos entrenados in-house. **Zia LLM** propio anunciado en Zoholics 2024. No usa OpenAI/Anthropic públicamente.
- Deluge sandbox: timeout 5 min, max recursion, max API calls. DSL constrained pero potente para power-users.
- Escala: 100M usuarios declarados across suite, 700K+ empresas clientes.

**Debilidades clave:**
1. UI dated y sobrecargada — queja #1 consistente. Configuración inicial abrumadora.
2. Soporte lento y poco técnico — queja recurrente.
3. Integraciones third-party inconsistentes fuera del ecosistema Zoho.

---

### 3.6 Folk CRM

**Posicionamiento:** CRM AI-native para founders y equipos relacionales pequeños. Sin automatización, con mucha magia de AI en datos.  
**Segmento:** Startups, solopreneurs, agencias <15 personas, VCs pequeños, sales relacional.  
**Precio:** $24/usuario/mes (Standard). Sin free tier.

**Features destacadas:**
- ✓ Magic Fields: campos auto-rellenados por AI desde datos del contacto (prompt personalizable). 2,000 usos/mes org.
- ✓ folkX Chrome extension: captura desde LinkedIn/web con detección de duplicados
- ✓ AI Assistants: sugiere follow-ups, resume reuniones, genera email openers
- ✓ Research Notes: investigación web del contacto via Perplexity
- ✓ AI Call Transcripts: transcripción + extracción de datos de llamadas
- ✓ Email sync Gmail/Outlook 2-way
- ✓ Email campaigns con sequences en Premium
- ◐ WhatsApp: solo sync lectura vía Chrome extension, sin envío nativo
- ✗ Workflow automation (ausencia total — la queja #2 más citada)
- ✗ Mobile app (queja #1 por diferencia — 26 menciones en G2)
- ✗ Forms de captura nativos
- ✗ Lead scoring automático

**Arquitectura:**
- Stack: **No público**. Probable React/TypeScript frontend, Node.js/TypeScript backend, Postgres.
- AI: Perplexity para Research Notes. Provider de Magic Fields **no público** (probable OpenAI GPT-4o).
- Empresa: 55 personas, €8.3M ARR, $4.5M raised (Accel). Startup madura pero sin Series A confirmada.
- Hosting: No público.

**Debilidades clave:**
1. Sin app móvil — bloqueante para cualquier vendedor de campo
2. Cero workflow automation — no sirve para ventas de alto volumen
3. Precio escala rápido sin automatización que lo justifique

---

### 3.7 Pipedrive

**Posicionamiento:** El CRM de pipeline visual más limpio. Diseñado para equipos de ventas B2B de 5-200 personas.  
**Segmento:** PMEs y equipos de ventas europeos. Origen estoniano, muy fuerte en EU.  
**Precio entrada:** $14/seat/mes (Lite). Growth ($39) para email sync y automation.

**Features destacadas:**
- ✓✓ Pipeline kanban visual: la mejor UX de deals del benchmark
- ✓ Email tracking 2-way (Gmail/Outlook) en Growth+
- ✓ Pipedrive Scheduler (meeting booking page embebida)
- ✓ AI Sales Assistant: win probability, next best action, deal insights (OpenAI GPT)
- ✓ Smart Contact Data: enriquecimiento automático de contactos
- ✓ Reporting/Insights en Professional+
- ✓ Apps iOS/Android bien valoradas
- ◐ Workflow automation: básico (trigger → acción), sin conditional branching avanzado
- ◐ WhatsApp: Messaging Inbox via Twilio (no nativo API)
- ◐ Email campaigns: add-on separado ($16/mes extra)
- ◐ Lead capture: LeadBooster add-on ($32.50/empresa/mes extra)
- ✗ Custom objects

**Arquitectura:**
- Frontend: React + TypeScript + Design Language System (DLS) propio
- Backend: **Migración activa de PHP monolito → TypeScript/Node.js microservicios** (2020-2025, casi completada). Kafka para eventos. Kubernetes.
- DB: **MySQL con schema-per-customer** (cada empresa = schema propio). ProxySQL para routing. 1,000 companies/servidor MySQL. Redis (caché). Elasticsearch (búsqueda). AWS (migración completa desde Rackspace completada 2023).
- API: REST v1. Token-based rate limits desde 2025: `30,000 × multiplicador_plan × seats`. Webhooks v2 sin rate limits desde mar 2025.
- Multi-tenancy: schema-per-customer — aislamiento fuerte. "Noisy neighbor problem" gestionado con load balancing automático.
- Escala: 100,000+ clientes, €207M revenue (2024).

**Engineering blog:** medium.com/pipedrive-engineering — activo, posts técnicos sobre MySQL/ProxySQL, migración a TypeScript, Kubernetes.

**Debilidades clave:**
1. Post-venta vacío: excelente para gestionar deals, inútil para gestionar clientes post-venta
2. Email marketing y captura de leads son add-ons caros — propuesta de valor se fragmenta
3. Automation básica para flujos con lógica condicional compleja

---

## 4. Matriz Comparativa de Features

**Leyenda:** ✓ nativo · ◐ parcial/limitado · ✗ no · 💰 solo en plan caro

| Feature | KDL | Brevo | Keap | HubSpot | Affinity | Zoho | Folk | Pipedrive |
|---------|-----|-------|------|---------|----------|------|------|-----------|
| **DATOS CORE** | | | | | | | | |
| Companies CRUD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contacts CRUD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Custom fields (UI configurable) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Custom objects / módulos | ✗ | ✗ | ✗ | 💰 Enterprise | ✗ | ✓ Profesional+ | ◐ Premium | ✗ |
| Segmentación / listas | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **PIPELINE & VENTAS** | | | | | | | | |
| Pipeline kanban visual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓✓ |
| Multi-pipeline | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ |
| Forecasting revenue | ✗ | ◐ | ◐ | ✓ Pro+ | ✗ | ✓ | ✗ | ✓ Pro+ |
| Won/Lost reasons | ✓ | ◐ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ |
| Sales cadences / sequences | ✗ | ✗ | ◐ | ✓ Pro+ | ✗ | ◐ | ◐ email | ◐ |
| **PRODUCTIVIDAD** | | | | | | | | |
| Tasks + reminders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ |
| Calendar sync (Google/Outlook) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Meeting scheduler (self-service) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Help desk / tickets | ✓ | ✗ | ✗ | 💰 Service Hub | ✗ | Zoho Desk sep. | ✗ | ✗ |
| **EMAIL** | | | | | | | | |
| Email campañas bulk | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ Campaigns | ✓ | 💰 add-on |
| Email tracking (open/click) | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Inbox sync 2-way Gmail/Outlook | ✗ | ✗ | ◐ 1-way | ✓ | ✓ | ✓ Enterprise+ | ✓ | ✓ Growth+ |
| Email inbound (reply handling) | ✓ webhook | ✓ Conversations | ✓ | ✓ | ✓ | ✓ SalesInbox | ✓ | ✓ |
| **MENSAJERÍA** | | | | | | | | |
| WhatsApp Business (nativo) | ✓ | ✓ | ✗ | ◐ Pro+ | ✗ | ✓ | ◐ sync only | ◐ Twilio |
| WhatsApp campañas masivas | ✓ | ◐ | ✗ | ✗ | ✗ | ◐ | ✗ | ✗ |
| SMS | ✗ | ✓ | ◐ US/CA | ◐ US | ✗ | ◐ 3rd party | ✗ | ◐ 3rd party |
| Live chat | ✗ | ✓ | ✗ | ✓ | ✗ | Zoho SalesIQ | ✗ | 💰 LeadBooster |
| Multi-channel inbox unificado | ✗ | ✓ | ✗ | ✓ | ✗ | ◐ SalesSignals | ✗ | ◐ Messaging |
| **CAPTACIÓN DE LEADS** | | | | | | | | |
| Forms embebibles | ◐ landing | ✓ | ✓ | ✓ | ✗ | ✓ Zoho Forms | ✗ | 💰 LeadBooster |
| Landing pages | ✓ CMS propio | ✓ | ✓ | ✓ | ✗ | Zoho LP | ✗ | 💰 LeadBooster |
| Chatbot de captación | ✗ | ✓ | ✗ | ✓ | ✗ | Zoho SalesIQ | ✗ | 💰 LeadBooster |
| Prospección automatizada (outbound) | ✓✓ Apify | ✗ | ✗ | ◐ Breeze Agent | ✗ | ✗ | ✗ | 💰 Prospector |
| Chrome extension (LinkedIn) | ✗ | ✗ | ✗ | ◐ | ✓✓ Pathfinder | ✗ | ✓✓ folkX | ✗ |
| **AI & AUTOMATIZACIÓN** | | | | | | | | |
| Agente IA conversacional | ✓✓ Claude | ◐ Aura | ◐ | ◐ Breeze | ✓ Deal Assist | ◐ Zia | ◐ Magic Fields | ✗ |
| AI para cualificación de leads | ✓✓ agente | ◐ | ◐ | ✓ Pro+ | ✗ | ✓ Zia | ✗ | ◐ AI Assistant |
| Workflow automation visual | ✗ | ✓ | ✓✓ | ✓ | ◐ básico | ✓✓ Blueprint | ✗ | ◐ básico |
| AI generación de contenido | ✗ | ✓ Aura | ◐ | ✓ Breeze | ✗ | ✓ Zia | ✓ Magic | ◐ |
| Lead scoring automático | ✗ | ◐ manual | ◐ manual | ✓ Pro+ | ◐ rel. score | ✓ Zia | ✗ | ◐ win prob. |
| Contact enrichment automático | ✗ | ✗ | ✗ | ◐ Breeze | ✓✓ email sync | ✓ Zia Vision | ✓ People Data | ✓ Smart Data |
| **REPORTING** | | | | | | | | |
| Reporting básico | ◐ campañas | ✓ | ◐ | ✓ | ◐ | ✓ | ✗ | ◐ |
| Dashboards custom | ✗ | ✗ | ✗ | ✓ Pro+ | ✗ | ✓ Analytics | ◐ Premium | ✓ Pro+ |
| Revenue attribution | ✗ | ✗ | ✗ | 💰 Enterprise | ✗ | ◐ | ✗ | ✗ |
| **DOCUMENTOS & FACTURACIÓN** | | | | | | | | |
| Quotes / propuestas | ✗ | ✗ | ✓✓ | ✓ Pro+ | ✗ | ✓ | ✗ | 💰 Smart Docs |
| E-firma | ✗ | ✗ | 3rd party | ✓ Enterprise | ✗ | ✓ Zoho Sign | ✗ | ◐ Smart Docs |
| Facturación / payments | ✗ | ◐ Stripe Meetings | ✓✓ | ◐ | ✗ | Zoho Books | ✗ | ✗ |
| **MÓVIL & CAMPO** | | | | | | | | |
| App iOS/Android | ✗ | ◐ Conversations | ✓ | ◐ | ✓ | ✓ | ✗ | ✓ |
| Modo offline | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| **INTEGRACIONES & API** | | | | | | | | |
| Public REST API | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ Premium | ✓ |
| Webhooks externos | ✗ | ✓ (lim. 40) | ✓ | ✓ | ✓ (lim. 3) | ✓ | ✗ | ✓ |
| Zapier/Make | ✗ | ✓ | ✓ | ✓ | ◐ | ✓ | ✓ via | ✓ |
| Marketplace de integraciones | ✗ | ◐ ~150 | ◐ ~300 | ✓ 1500+ | ◐ | ✓ 2000+ | ✗ | ✓ 400+ |
| **SEGURIDAD & CUMPLIMIENTO** | | | | | | | | |
| 2FA | ✗ | ✓ | ✓ (obligatorio) | ✓ | ✓ | ✓ | ✓ | ✓ |
| SSO / SAML | ✗ | 💰 Enterprise | ✗ | 💰 Enterprise | ✓ | 💰 Enterprise | 💰 Custom | ◐ Power+ |
| Audit log | ✗ | 💰 Enterprise | ✗ | 💰 Enterprise | ✓ | ✓ | ✗ | ◐ |
| GDPR tooling (UI) | ✗ | ✓ | ◐ | ✓ | ✓ | ✓ | ◐ | ✓ |
| EU data residency | ✓ Supabase EU | ✓ | ✗ (US only) | ✓ Enterprise | ✓ AWS EU | ✓ (DC propio) | ✓ (FR) | ✓ (EE) |

---

## 5. Matriz Comparativa de Arquitectura

| Dimensión | KDL CRM | Brevo | Keap | HubSpot | Affinity | Zoho | Folk | Pipedrive |
|-----------|---------|-------|------|---------|----------|------|------|-----------|
| **Frontend** | Next.js 15 + React 19 + shadcn | React + "Indigo" design system | 2 UIs legacy coexisten | React + "Canvas" (legacy Backbone) | React + TypeScript | ZeT (propio) | No público (probable React) | React + "DLS" propio |
| **Backend** | Next.js API routes (Node/TS) | PHP legacy + Node.js | Java legacy (2 codebases) | Java monoglot, 3,000+ microservicios | Ruby + Postgres + Kubernetes | Java + Scala + Python | No público (probable Node/TS) | PHP → TypeScript/Node.js (migración ~completada) |
| **DB principal** | Postgres (Supabase) | MongoDB | MySQL (no confirmado actual) | Vitess/MySQL (1,000+ clusters) | PostgreSQL | MySQL + Postgres + Cassandra | No público | MySQL con **schema-per-customer** |
| **Multi-tenancy** | Row-level (Supabase RLS) | Row-level | Row-level (subdominio por tenant) | Row-level (`portalId`) | Logical isolation + RBAC | Row-level + on-prem option | No público | **Schema-per-customer** (fuerte isolación) |
| **Mensajería/Eventos** | No explícito (webhooks Resend/WA) | Kafka (6 clusters, 40K partitions) | No público | Kafka | No público | Kafka | No público | Kafka + RabbitMQ |
| **Extensibilidad** | Ninguna para terceros | API + Zapier (sin scripting) | API REST (sin scripting) | Operations Hub (Python/JS) + Custom Objects | API REST (básica) | **Deluge DSL** + Custom Modules + Catalyst serverless | API Premium (básica) | API REST + Marketplace apps |
| **AI** | Anthropic Claude (AI SDK) | Aura (proveedor no público) | Proveedor no público | OpenAI GPT-4o + Anthropic Claude | **Anthropic Claude** (confirmado) | **Zia LLM propio** (in-house) | Perplexity + proveedor no público | OpenAI GPT (declarado) |
| **Email provider** | Resend | **Propio** (infraestructura email end-to-end) | Propio (SMTP) | Propio | No aplica | Zoho Mail (propio) | No público | No aplica (sync only) |
| **WhatsApp** | Meta Graph API v20.0 (nativo) | Meta Graph API (nativo) | Solo via Sociocs/Twilio | Meta Graph API (nativo) | No aplica | Meta Graph API (nativo) | Solo sync lectura | Twilio (no nativo) |
| **Hosting** | Vercel + Supabase (AWS) | Multi-DC EU + Cloudflare edge | US-only (no EU) | AWS (EU regions) | AWS (VPC isolated) | **DCs propios** (EU/US/IN/AU) | No público | AWS (migrado desde Rackspace 2023) |
| **Public API** | No | REST v3 | REST v1+v2 | REST v3 + GraphQL | REST v1+v2 | REST v6 | REST (Premium) | REST v1 |
| **Rate limits** | No aplica | Tiers + headers `x-sib-ratelimit-*` | 25 req/s, headers propios | 100-190 req/10s | 900 req/min | 5K-25K calls/día | No público | Token-based 30K×plan×seats/día |
| **Webhooks** | Solo inbound (Resend, WA) | Max 40/cuenta | At-least-once | Retry + idempotencia por eventId | Max 3/instancia | 5 reintentos backoff | No público | Webhooks v2 sin rate limits (mar 2025) |
| **Escala clientes** | ~1 (startup) | 600K+ | 250K | 288K+ (enterprise) | ~3K firmas | 700K+ empresas | ~$8M ARR | 100K+ |
| **Auth** | Custom JWT + Google OAuth | OAuth 2.0 | OAuth 2.0 (scope único `full`) | OAuth 2.0 (granular) | OAuth 2.0 | OAuth 2.0 | OAuth 2.0 | OAuth 2.0 |
| **Open Source** | — | github.com/getbrevo (SDKs, MCP) | github.com/infusionsoft/keap-sdk | github.com/HubSpot (vitess, jinjava) | — | github.com/zoho (SDKs básicos) | — | github.com/pipedrive (SDKs) |
| **Decisión arquitectural más notable** | Vercel edge functions para AI | Kafka backbone para email masivo | Dual codebase legacy — no hacer esto | Java monoglot (opinionated, funciona a escala) | Postgres para relationship graph (no Neo4j) | DCs propios (control total) | No público | Schema-per-customer MySQL (aislamiento fuerte) |

---

## 6. Gap Analysis Priorizado

### Prioridad P0 — Table Stakes (implementar en los próximos 60 días)

---

#### Gap 1: Custom Fields configurables por usuario

**Quién lo tiene:** Los 7 competidores (universal)  
**Por qué importa para KDL:** La base ya existe (`custom_fields jsonb` en contacts). El gap es la UI. Sin ella, adaptar el CRM a cada sector (campo "tipo de cocina" en restauración, "especialidad" en fisioterapia, "número de habitaciones" en hostelería) es imposible sin tocar código. Es la feature que más rápido desbloquea ventas a sectores nuevos.  
**Complejidad en stack KDL:** **S (3-4 días)** — `custom_fields jsonb` ya existe. Solo necesita un editor de campos (nombre, tipo: text/number/date/select, opciones) en la página de Ajustes + renderizado dinámico en forms de contacto/empresa.  
**Dependencias:** Ninguna previa  
**Recomendación de stack:** Drizzle para guardar la definición de campos en nueva tabla `custom_field_definitions` (object_type, name, type, options jsonb). UI con shadcn/ui `<Form>` dinámico.  
**Esfuerzo estimado:** 4 días-persona  

---

#### Gap 2: Inbox Sync Gmail/Outlook (2-way)

**Quién lo tiene:** HubSpot, Folk, Pipedrive (Growth+), Zoho (Enterprise+)  
**Por qué importa para KDL:** Los vendedores viven en Gmail/Outlook, no en el CRM. Sin sync 2-way, cada email enviado/recibido por el rep comercial es invisible para el CRM — el historial de conversación queda fragmentado. Para restauración/salud donde las negociaciones son largas (presupuesto de web → revisiones → aprobación), esto es crítico.  
**Complejidad:** **L (10-15 días)** — requiere OAuth Google/Microsoft, sincronización periódica o push notifications, parsing de emails, match con contactos por email address.  
**Dependencias:** Custom fields (para etiquetar tipo de email)  
**Recomendación de stack:** Unipile o Nylas API (unified email/calendar API, $99-299/mes) para evitar implementar el protocolo IMAP desde cero. Alternativamente Google Gmail API + Microsoft Graph API directamente (gratis pero más mantenimiento).  
**Esfuerzo estimado:** 12 días-persona (con Nylas/Unipile) · 20 días (desde cero)  

---

#### Gap 3: Meeting Scheduler self-service (tipo Calendly)

**Quién lo tiene:** HubSpot, Keap, Brevo, Pipedrive, Zoho  
**Por qué importa para KDL:** KDL ya tiene `sales_availability` + `appointments` en DB. El gap es la página pública de reserva. Para clínicas de fisio/dental, la primera reunión de venta es ya una cita clínica — un link de booking embebido en WhatsApp ("reserva tu consulta gratuita → [link]") tiene conversión mucho más alta que proponer slots manualmente.  
**Complejidad:** **M (5-7 días)** — la lógica de disponibilidad ya existe. Necesita: página pública `/book/[userId]`, selector de slot, confirmación por email/WA, actualización de `appointments`.  
**Dependencias:** Calendar sync (opcional pero recomendado para no overbooking)  
**Recomendación de stack:** Route público en Next.js (`/book/[slug]`) sin autenticación, usando `sales_availability` + `appointments` existentes. Envío de confirmación por Resend. Opcional: integrar con Google Calendar para bloquear el slot.  
**Esfuerzo estimado:** 6 días-persona  

---

#### Gap 4: Dashboards y Reporting configurable

**Quién lo tiene:** Los 7 (aunque con calidades distintas — Brevo y Affinity son los más débiles)  
**Por qué importa para KDL:** El usuario necesita ver KPIs de negocio: deals cerrados este mes, empresas contactadas por sector, tasa de respuesta a campañas, revenue pipeline. Sin esto, el CRM es una herramienta de entrada de datos, no de toma de decisiones.  
**Complejidad:** **M (7-10 días)** — empezar con widgets predefinidos: deals por stage, actividad por rep, campañas performance, leads nuevos/semana. Configurable en fase 2.  
**Dependencias:** Ninguna previa  
**Recomendación de stack:** Página `/dashboard` con Server Components que agreguen datos via Supabase. Charts con Recharts (ya en el ecosistema) o Tremor (shadcn-compatible). Widgets guardables en tabla `dashboard_widgets` (type, config jsonb, position).  
**Esfuerzo estimado:** 8 días-persona (widgets predefinidos) · 15 días (builder configurable)  

---

### Prioridad P1 — Diferenciadores SMB (próximos 90 días)

---

#### Gap 5: Lead Scoring automático (reglas configurables)

**Quién lo tiene:** HubSpot, Zoho (Zia), Keap, Brevo  
**Por qué importa para KDL:** `lead_score int` ya existe en contacts. El gap es la lógica de scoring. Para outreach a SMBs: "empresa con 4+ estrellas en Google, sin web, en barrio premium, respondió al email = score 80/100 → priorizar". Convierte la tabla de prospectos en una cola priorizada de trabajo.  
**Complejidad:** **M (5-7 días)** — UI de reglas (if campo = valor → +N puntos), engine de evaluación al crear/actualizar contacto, badge de score en listado.  
**Recomendación:** Tabla `lead_scoring_rules` (condition_field, condition_op, condition_value, points). Function Postgres/Drizzle que recalcula score en trigger o scheduled job.  
**Esfuerzo:** 6 días-persona  

---

#### Gap 6: Workflow Automation (básico → visual)

**Quién lo tiene:** HubSpot (mejor), Zoho (Blueprint), Keap (más madura para SMB), Brevo (Aura)  
**Por qué importa para KDL:** Automatizar el seguimiento del playbook: "lead no respondió en 3 días → enviar email_2_follow_up automáticamente". Sin esto, el comercial tiene que recordar manualmente cuándo hacer follow-up de cada lead. Para 50+ leads activos simultáneos, imposible.  
**Complejidad:** **XL (20-30 días para visual builder completo)** · **L (10 días para automatizaciones predefinidas)**  
**Recomendación:** Empezar con **automatizaciones predefinidas** (no visual builder): 5 triggers hardcoded (deal stage change, lead created, lead no response in N days, campaign opened, appointment confirmed) con acciones hardcoded (send email, send WA, update field, create task, notify Slack). UI para configurar los parámetros. El visual builder viene en fase 2.  
**Esfuerzo (fase 1):** 10 días-persona  

---

#### Gap 7: Sales Cadences / Secuencias de outreach

**Quién lo tiene:** HubSpot (mejor del benchmark), Pipedrive (básico), Keap  
**Por qué importa para KDL:** El playbook actual (email_1 → email_2 → email_3 en 14 días) es manual por campaña. Las cadences permiten enrolar leads individualmente en una secuencia de N pasos con delays configurables, pausando automáticamente si hay respuesta.  
**Complejidad:** **M (8-10 días)**  
**Recomendación:** Tabla `cadences` (name, steps jsonb) + `cadence_enrollments` (lead_id, cadence_id, current_step, next_send_at, status). Cron job diario ejecuta pasos pendientes. Se integra con `agent_sessions` existente para detectar respuesta y pausar.  
**Esfuerzo:** 9 días-persona  

---

#### Gap 8: Mobile (PWA o app nativa)

**Quién lo tiene:** HubSpot, Keap, Zoho, Pipedrive, Affinity. Folk NO (su queja #1).  
**Por qué importa para KDL:** Los usuarios target (dueños de restaurante, recepcionistas de clínica) no están en un escritorio — están en el local. Sin mobile, KDL se usa solo en la oficina o nunca.  
**Complejidad:** **L (15 días PWA) · XL (45+ días app nativa)**  
**Recomendación:** **PWA primero** — Next.js soporta PWA nativamente (`next-pwa`). Priorizar vistas móviles: companies list + company detail + pipeline kanban + quick-add activity. Push notifications via Web Push API.  
**Esfuerzo (PWA):** 15 días-persona  

---

### Prioridad P2 — Nice to Have (próximos 6 meses)

---

#### Gap 9: Public API + Webhooks externos

**Quién lo tiene:** Los 7  
**Por qué importa:** Necesario para Zapier/Make integration (abre marketplace de 7,000+ apps). Para el cliente actual de KDL (SMB Madrid) no es urgente — no tienen developers que consuman API. Sí necesario cuando KDL escale o quiera ofrecerse a agencias.  
**Complejidad:** **M (8-10 días)**  
**Recomendación:** Reutilizar las rutas API existentes, añadiendo: (1) API keys por usuario en `api_keys` table, (2) autenticación Bearer en middleware, (3) webhooks externos: tabla `webhook_subscriptions` + dispatcher al procesar eventos (contact.created, deal.updated, etc.).  
**Esfuerzo:** 10 días-persona  

---

#### Gap 10: 2FA + GDPR tooling básico

**Quién lo tiene:** Los 7 (2FA universal). GDPR tools: HubSpot, Zoho, Brevo, Pipedrive.  
**Por qué importa:** Clínicas de salud en España están bajo RGPD con datos sanitarios. Sin 2FA, cualquier breach es responsabilidad del vendedor. Sin GDPR tooling, el dueño no puede atender solicitudes de "derecho al olvido".  
**Complejidad:** **S (4-5 días 2FA) + M (5-7 días GDPR básico)**  
**Recomendación:** 2FA con TOTP (authenticator app) usando `otplib` en Node.js. GDPR básico: campo `consent_given_at` en contacts + `gdpr_requests` table + UI para exportar/anonimizar contacto.  
**Esfuerzo:** 10 días-persona  

---

#### Gap 11: Multi-pipeline

**Quién lo tiene:** HubSpot, Keap, Zoho, Brevo, Pipedrive, Affinity  
**Por qué importa:** Si KDL escala a clientes con múltiples líneas de servicio (ej: agencia con pipeline "Web Design" separado de pipeline "SEO"), necesitan pipelines distintos. Actualmente `pipeline_stages` es un conjunto único.  
**Complejidad:** **S (3-4 días)** — añadir `pipeline_id` a `pipeline_stages` y `deals`. Crear página de gestión de pipelines.  
**Esfuerzo:** 4 días-persona  

---

#### Gap 12: Contact Enrichment automático

**Quién lo tiene:** Folk (People Data Labs), Pipedrive (Smart Contact Data), Affinity (email sync), Zoho (Zia Vision)  
**Por qué importa:** Al añadir un lead por email, rellenar automáticamente: nombre, empresa, URL de LinkedIn, foto. Ahorra tiempo al comercial.  
**Complejidad:** **M (5-7 días)** — integrar Hunter.io Enrichment API o Clearbit o Apollo.io. Trigger en contact.created.  
**Esfuerzo:** 5 días-persona  

---

### Prioridad P3 — Skip / Fuera de Scope

| Feature | Por qué no ahora |
|---------|-----------------|
| Custom objects (object designer) | Solo útil cuando tengas clientes con procesos muy complejos. Over-engineering para Madrid SMB. |
| Telephony / VoIP | WhatsApp + wa.me links cubre el 90% del caso de uso en España. VoIP es para US/UK. |
| E-firma nativa | Integrar DocuSign/Signaturit vía webhook es suficiente. No construir propio. |
| Facturación/payments | Fuera del scope de CRM de ventas. Integrar Stripe Checkout para el caso concreto. |
| Enterprise SSO/SAML | Overkill para target SMB Madrid. Solo si entras en mid-market. |
| Marketplace de integraciones | Necesita base de developers. Construye primero Zapier webhook, luego piensa en marketplace. |
| Affinity-style network intelligence | El target no es VC. Pero adaptar "engagement score por cliente" sí (ver Gap 5). |
| On-prem / self-hosted | No aplica al modelo SaaS. |

---

## 7. Roadmap de Implementación Recomendado

### Sprint 1 (días 1-30): Foundations P0

| Semana | Tarea | Esfuerzo |
|--------|-------|---------|
| 1-2 | Custom fields UI (editor + render dinámico en forms) | 4 días |
| 2-3 | Meeting scheduler self-service (página pública `/book/[slug]`) | 6 días |
| 3-4 | Dashboard básico con KPIs predefinidos (deals, leads, campañas) | 8 días |

**Entregable Sprint 1:** CRM adaptable por sector + primera herramienta de cierre (booking link para WhatsApp)

---

### Sprint 2 (días 31-60): P0 restante + P1 inicial

| Semana | Tarea | Esfuerzo |
|--------|-------|---------|
| 5-7 | Inbox sync Gmail via Google API (OAuth + sync periódico) | 10 días |
| 7-8 | Lead scoring rules UI + engine | 6 días |

**Entregable Sprint 2:** CRM con historial de email unificado + leads priorizados automáticamente

---

### Sprint 3 (días 61-90): P1 diferenciadores

| Semana | Tarea | Esfuerzo |
|--------|-------|---------|
| 9-11 | Automatizaciones predefinidas (triggers hardcoded + UI configuración) | 10 días |
| 11-12 | Sales cadences / secuencias de outreach | 9 días |

**Entregable Sprint 3:** Playbook de outreach automatizado (email_1 → email_2 → email_3 en 14 días sin intervención manual)

---

### Sprint 4 (días 91-120): Mobile + API

| Semana | Tarea | Esfuerzo |
|--------|-------|---------|
| 13-15 | PWA: vistas móviles prioritarias (companies, pipeline, quick-activity) | 15 días |
| 15-16 | 2FA + GDPR básico (consent, RTBF) | 10 días |

**Entregable Sprint 4:** Vendedor en el local con el CRM en el móvil

---

### Sprint 5 (días 121-150): Escala

| Semana | Tarea | Esfuerzo |
|--------|-------|---------|
| 17-18 | Public API + webhooks externos | 10 días |
| 18-19 | Multi-pipeline | 4 días |
| 19-20 | Contact enrichment (Hunter.io/Apollo) | 5 días |

**Entregable Sprint 5:** KDL preparado para integrarse con el ecosistema externo (Zapier, etc.)

---

### Resumen de esfuerzo total

| Prioridad | Features | Esfuerzo estimado |
|-----------|----------|------------------|
| P0 | Custom fields, Inbox sync, Meeting scheduler, Dashboards | ~34 días-persona |
| P1 | Lead scoring, Automations básicas, Cadences, PWA mobile, 2FA+GDPR | ~50 días-persona |
| P2 | Public API, Multi-pipeline, Enrichment | ~19 días-persona |
| **Total P0+P1** | | **~84 días-persona** |

Con 1 desarrollador a tiempo completo: **~4 meses** para P0+P1.  
Con 2 desarrolladores: **~2 meses**.

---

## 8. Decisiones Arquitecturales Clave a Aprender del Benchmark

### Adoptar:

| Decisión | Aprendida de | Implementación en KDL |
|----------|-------------|----------------------|
| **SDK OpenAPI-generated** | Keap (github.com/infusionsoft/keap-sdk) | Generar SDK TypeScript desde las rutas API para uso en integraciones externas |
| **Webhook rate-limit headers** | Brevo (`x-sib-ratelimit-*`) + Keap | Añadir `x-ratelimit-limit/remaining/reset` en todas las respuestas de API |
| **Schema-per-customer** para datos sensibles | Pipedrive | Considera para tenants con datos médicos (clínicas) — Supabase lo soporta vía schemas |
| **Postgres para relationship scoring** | Affinity | Tabla `contact_interactions` + scores materializados. No necesitas graph DB. |
| **Automatizaciones en dos niveles** | Keap | "Easy" (when/then templates) para usuarios no técnicos + "Advanced" (DAG) para power users |
| **MCP server publicado** | Brevo + Affinity | Con AI SDK ya integrado, publicar MCP server para que Claude/ChatGPT externos accedan al CRM |
| **Meeting scheduler con Stripe** | Brevo Meetings | Para hostelería/salud: cobro de cita de consulta directamente desde booking page |
| **Token-based rate limits** | Pipedrive (v2 webhooks sin límites) | Webhooks sin rate limits, REST API con token budget |

### Evitar:

| Anti-patrón | Aprendido de | Por qué evitar |
|------------|-------------|----------------|
| **Dual codebase + rebrand incompleto** | Keap (Infusionsoft + Keap conviven 10 años) | Una vez comprometido con un stack, completar la migración o no empezarla |
| **Webhook cap arbitrario** | Brevo (límite de 40 webhooks/cuenta) | Limitar webhooks por volumen o rate, nunca por cantidad fija |
| **Scope OAuth único** | Keap (`full` scope sin granularidad) | Scopes granulares desde el día 1 |
| **US-only sin EU region** | Keap | Supabase EU region desde el inicio para RGPD |
| **AI como afterthought** | Zoho (Zia añadida después) | KDL nace con Claude integrado — mantenerlo como capa central, no módulo opcional |
| **Bloquear features básicos en Enterprise** | HubSpot (custom objects, SSO, audit log) + Brevo (audit log, SAML) | Para SMB: custom fields, 2FA y audit log básico deben estar en todos los planes |
| **Java monoglot** | HubSpot (3,000 microservicios en Java) | KDL con Next.js API routes es correcto para el volumen actual. Escalar a microservicios cuando el equipo tenga 10+ devs. |
| **DCs propios sin economía de escala** | Zoho | La ventaja de Zoho (datacenter propio) requiere 100M+ usuarios para ser económica. Vercel+Supabase es la elección correcta hasta $10M ARR. |

---

## 9. Posicionamiento Competitivo de KDL CRM

### Mapa de posicionamiento (2 ejes: Automatización AI × Foco en mercado local ES)

```
                        ALTA AUTOMATIZACIÓN AI
                               ↑
                          HubSpot Breeze
                               |
              Zoho Zia         |          KDL CRM ← (potencial)
                    \          |          /
  MERCADO            -------- +--------/--------- MERCADO
  GLOBAL                      |    /              LOCAL ES/LATAM
  (inglés)                     | /
              Keap   Folk  Pipedrive  Brevo
                               |
                          BAJA AUTOMATIZACIÓN AI
                               ↓
```

### Propuesta de valor única de KDL vs todos los competidores

> **"El único CRM diseñado para las PYMEs de Madrid: prospección automática en Google Maps, WhatsApp como canal principal de ventas automatizado, y agente IA (Claude) que cualifica y responde leads mientras duermes — todo integrado en una plataforma en español, con precios SMB y datos en Europa."**

Ningún competidor del benchmark puede afirmar simultáneamente:
1. ✓ Prospección de negocios por barrio/sector de Madrid integrada en el CRM
2. ✓ WhatsApp Business nativo + automatizado (no vía Twilio, no vía add-on)
3. ✓ Agente IA conversacional (Claude) para outreach frío Y cualificación inbound
4. ✓ Landing page CMS integrado para captura de leads del propio negocio
5. ✓ Precio SMB y UI en español diseñada para no-técnicos

---

*Documento generado: Mayo 2026. Para actualizar, re-ejecutar los agentes de investigación y regenerar la Sección 3.*
