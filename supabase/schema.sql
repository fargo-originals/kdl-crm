-- KDL CRM Database Schema for Supabase

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'seller',
  avatar_url TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  revenue NUMERIC(12,2),
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  website TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  job_title TEXT,
  department TEXT,
  company_id UUID REFERENCES companies(id),
  owner_id UUID REFERENCES users(id),
  lead_score INTEGER DEFAULT 0,
  lifecycle_stage TEXT DEFAULT 'lead',
  status TEXT DEFAULT 'active',
  source TEXT,
  notes TEXT,
  custom_fields JSONB,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  owner_id UUID REFERENCES users(id),
  stage TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  probability INTEGER DEFAULT 50,
  expected_close_date TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  won_reason TEXT,
  lost_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT,
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  assignee_id UUID REFERENCES users(id),
  reporter_id UUID REFERENCES users(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  assignee_id UUID REFERENCES users(id),
  created_by_id UUID REFERENCES users(id),
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT,
  direction TEXT,
  duration INTEGER,
  outcome TEXT,
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  ticket_id UUID REFERENCES tickets(id),
  task_id UUID REFERENCES tasks(id),
  user_id UUID REFERENCES users(id),
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#64748b',
  probability_default INTEGER DEFAULT 50,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prospect Searches table
CREATE TABLE IF NOT EXISTS prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sector TEXT NOT NULL,
  zone TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'barrio',
  keywords TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_results INTEGER DEFAULT 0,
  enriched_count INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  apify_run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prospect Results table
CREATE TABLE IF NOT EXISTS prospect_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES prospect_searches(id),
  google_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  district TEXT,
  neighborhood TEXT,
  phone TEXT,
  website TEXT,
  google_rating NUMERIC(2,1),
  google_review_count INTEGER DEFAULT 0,
  category TEXT,
  email TEXT,
  instagram TEXT,
  contact_name TEXT,
  contact_title TEXT,
  tripadvisor_rating NUMERIC(2,1),
  enrichment_status TEXT NOT NULL DEFAULT 'pending',
  enrichment_data JSONB,
  review_status TEXT NOT NULL DEFAULT 'pending',
  imported_at TIMESTAMPTZ,
  imported_contact_id UUID REFERENCES contacts(id),
  imported_company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_prospect_searches_user_id ON prospect_searches(user_id);
CREATE INDEX idx_prospect_results_search_id ON prospect_results(search_id);
CREATE INDEX idx_prospect_results_google_place_id ON prospect_results(google_place_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_results ENABLE ROW LEVEL SECURITY;

-- RLS helpers and policies (authenticated, role-aware, ownership-aware)
CREATE OR REPLACE FUNCTION public.current_crm_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_crm_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_crm_role() IN ('owner', 'admin')
$$;

CREATE POLICY "Users select self or admin" ON users FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_crm_admin());
CREATE POLICY "Users insert admin only" ON users FOR INSERT TO authenticated WITH CHECK (public.is_crm_admin());
CREATE POLICY "Users update self or admin" ON users FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_crm_admin()) WITH CHECK (id = auth.uid() OR public.is_crm_admin());
CREATE POLICY "Users delete owner only" ON users FOR DELETE TO authenticated USING (public.current_crm_role() = 'owner');
CREATE POLICY "Companies owned or admin" ON companies FOR ALL TO authenticated USING (public.is_crm_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR owner_id = auth.uid());
CREATE POLICY "Contacts owned or admin" ON contacts FOR ALL TO authenticated USING (public.is_crm_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR owner_id = auth.uid());
CREATE POLICY "Deals owned or admin" ON deals FOR ALL TO authenticated USING (public.is_crm_admin() OR owner_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR owner_id = auth.uid());
CREATE POLICY "Tickets assigned reported or admin" ON tickets FOR ALL TO authenticated USING (public.is_crm_admin() OR assignee_id = auth.uid() OR reporter_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR assignee_id = auth.uid() OR reporter_id = auth.uid());
CREATE POLICY "Tasks assigned created or admin" ON tasks FOR ALL TO authenticated USING (public.is_crm_admin() OR assignee_id = auth.uid() OR created_by_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR assignee_id = auth.uid() OR created_by_id = auth.uid());
CREATE POLICY "Activities owned user or admin" ON activities FOR ALL TO authenticated USING (public.is_crm_admin() OR user_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR user_id = auth.uid());
CREATE POLICY "Pipeline read authenticated" ON pipeline_stages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Pipeline write admin" ON pipeline_stages FOR ALL TO authenticated USING (public.is_crm_admin()) WITH CHECK (public.is_crm_admin());
CREATE POLICY "Integrations owned or admin" ON integrations FOR ALL TO authenticated USING (public.is_crm_admin() OR user_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR user_id = auth.uid());
CREATE POLICY "Prospect searches owned or admin" ON prospect_searches FOR ALL TO authenticated USING (public.is_crm_admin() OR user_id = auth.uid()) WITH CHECK (public.is_crm_admin() OR user_id = auth.uid());
CREATE POLICY "Prospect results owned search or admin" ON prospect_results FOR ALL TO authenticated USING (public.is_crm_admin() OR EXISTS (SELECT 1 FROM public.prospect_searches WHERE prospect_searches.id = prospect_results.search_id AND prospect_searches.user_id = auth.uid())) WITH CHECK (public.is_crm_admin() OR EXISTS (SELECT 1 FROM public.prospect_searches WHERE prospect_searches.id = prospect_results.search_id AND prospect_searches.user_id = auth.uid()));

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, position, color, probability_default, is_won, is_lost) VALUES
  ('New', 0, '#64748b', 20, false, false),
  ('Qualified', 1, '#2563EB', 40, false, false),
  ('Meeting', 2, '#8B5CF6', 60, false, false),
  ('Proposal', 3, '#F59E0B', 75, false, false),
  ('Negotiation', 4, '#F97316', 90, false, false),
  ('Closed Won', 5, '#16A34A', 100, true, false),
  ('Closed Lost', 6, '#DC2626', 0, false, true);
