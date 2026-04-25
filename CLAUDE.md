# CLAUDE.md

Project: KDL CRM

## Commands

- `pnpm dev` — Start development server
- `pnpm build` — Production build
- `pnpm lint` — Run linter

## Tech Stack

Next.js 15 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase (Postgres) + Drizzle ORM + Clerk Auth + Vercel

## Architecture

- `src/app/` — Next.js App Router pages
- `src/components/ui/` — Base UI components
- `src/components/app/` — App-specific components
- `src/lib/` — Utilities and DB clients
- `src/db/schema/` — Drizzle schema

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | App URL (production) |

## Key Patterns

- Server Components by default
- Client Components only with "use client"
- Supabase for database
- Clerk for authentication
- Middleware protects routes

## Development

1. Copy `.env.example` to `.env.local` and fill in values
2. Run `pnpm dev`
3. Open http://localhost:3000