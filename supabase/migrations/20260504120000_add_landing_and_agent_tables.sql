-- Landing CMS + Agent tables
-- Apply via Supabase SQL Editor or supabase db push

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM('draft', 'scheduled', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_channel AS ENUM('whatsapp', 'email', 'phone');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM('landing_form', 'manual', 'import');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM('new', 'contacted', 'qualified', 'scheduled', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_channel AS ENUM('whatsapp', 'email');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_session_status AS ENUM('active', 'awaiting_human', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM('proposed', 'confirmed', 'cancelled', 'rescheduled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Landing: Hero
CREATE TABLE IF NOT EXISTS landing_hero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title jsonb NOT NULL DEFAULT '{}',
  subtitle jsonb DEFAULT '{}',
  cta_label jsonb DEFAULT '{}',
  cta_url text DEFAULT '/',
  bg_media_url text,
  bg_media_type text DEFAULT 'image',
  published boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Landing: Services
CREATE TABLE IF NOT EXISTS landing_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon text,
  title jsonb NOT NULL DEFAULT '{}',
  description jsonb DEFAULT '{}',
  price numeric(10, 2),
  currency text DEFAULT 'EUR',
  slug text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT landing_services_slug_unique UNIQUE(slug)
);

-- Landing: Portfolio
CREATE TABLE IF NOT EXISTS landing_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title jsonb NOT NULL DEFAULT '{}',
  client_name text,
  description jsonb DEFAULT '{}',
  cover_url text,
  gallery jsonb DEFAULT '[]',
  external_url text,
  tags text[],
  slug text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT landing_portfolio_slug_unique UNIQUE(slug)
);

-- Landing: Testimonials
CREATE TABLE IF NOT EXISTS landing_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_role jsonb DEFAULT '{}',
  author_avatar_url text,
  quote jsonb NOT NULL DEFAULT '{}',
  rating integer DEFAULT 5,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Landing: FAQ
CREATE TABLE IF NOT EXISTS landing_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question jsonb NOT NULL DEFAULT '{}',
  answer jsonb NOT NULL DEFAULT '{}',
  category text,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Landing: Team
CREATE TABLE IF NOT EXISTS landing_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role jsonb DEFAULT '{}',
  bio jsonb DEFAULT '{}',
  avatar_url text,
  socials jsonb DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Landing: Blog posts
CREATE TABLE IF NOT EXISTS landing_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title jsonb NOT NULL DEFAULT '{}',
  excerpt jsonb DEFAULT '{}',
  body jsonb DEFAULT '{}',
  cover_url text,
  tags text[],
  author_id uuid REFERENCES users(id),
  published_at timestamp,
  status blog_post_status NOT NULL DEFAULT 'draft',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT landing_blog_posts_slug_unique UNIQUE(slug)
);

-- Landing: Settings (key-value store for header, footer, seo_global, theme)
CREATE TABLE IF NOT EXISTS landing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb,
  published_value jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT landing_settings_key_unique UNIQUE(key)
);

-- Lead inquiries from the landing page contact form
CREATE TABLE IF NOT EXISTS lead_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text,
  business_type text,
  service_interest text,
  budget_range text,
  message text,
  preferred_channel lead_channel DEFAULT 'email',
  preferred_time_window text,
  locale text DEFAULT 'es',
  utm jsonb DEFAULT '{}',
  source lead_source DEFAULT 'landing_form',
  status lead_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES users(id),
  agent_session_id uuid,
  qualification_data jsonb DEFAULT '{}',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- AI Agent sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES lead_inquiries(id),
  channel agent_channel NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  status agent_session_status NOT NULL DEFAULT 'active',
  last_provider_message_id text,
  external_contact_id text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES lead_inquiries(id),
  assigned_to uuid NOT NULL REFERENCES users(id),
  proposed_slots jsonb DEFAULT '[]',
  confirmed_slot timestamp,
  status appointment_status NOT NULL DEFAULT 'proposed',
  meeting_url text,
  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Sales availability schedule
CREATE TABLE IF NOT EXISTS sales_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  weekday integer NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  created_at timestamp DEFAULT now()
);

-- Default landing settings rows (idempotent)
INSERT INTO landing_settings (key, value) VALUES
  ('header',     '{"site_name":"KentoDevLab","logo_url":"","nav_links":[],"cta_label_es":"Contactar","cta_label_en":"Contact","cta_href":"/contacto"}'::jsonb),
  ('footer',     '{"description_es":"","description_en":"","copyright":"© 2025 KentoDevLab","links":[]}'::jsonb),
  ('seo_global', '{"title_es":"KentoDevLab","title_en":"KentoDevLab","description_es":"","description_en":"","keywords":"","og_image":""}'::jsonb),
  ('theme',      '{"primary_color":"#7c3aed","accent_color":"#a78bfa","font_heading":"","font_body":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
