-- The auth rewrite (JWT + bcrypt, replacing Clerk) expects these columns on
-- public.users, but the production database was never migrated off the
-- Clerk-era schema (supabase/schema.sql still has clerk_id). Without this,
-- /api/auth/login selects a non-existent password_hash column, the query
-- errors, and the route reports "Invalid credentials" regardless of the
-- password entered.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS google_id text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_unique'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_google_id_unique UNIQUE (google_id);
  END IF;
END $$;
