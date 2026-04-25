# KDL CRM

CRM profesional y moderno para gestión de relaciones con clientes.

## Características

- Gestión de Contactos y Leads
- Gestión de Empresas/Cuentas
- Pipeline de Ventas Visual
- Tickets de Soporte
- Tareas y Actividades
- Autenticación con Clerk
- Base de datos Supabase

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS v4
- **Base de datos:** Supabase (PostgreSQL)
- **ORM:** Drizzle
- **Auth:** Clerk
- **Hosting:** Vercel

## Getting Started

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa los valores:

```bash
cp .env.example .env.local
```

### 3. Ejecutar en desarrollo

```bash
pnpm dev
```

### 4. Abrir en navegador

http://localhost:3000

## Despliegue

El proyecto está configurado para Vercel. Haz push a GitHub y conecta el repositorio en Vercel.

## Licencia

MIT