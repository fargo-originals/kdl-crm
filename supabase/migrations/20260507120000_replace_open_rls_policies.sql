-- Replace broad RLS policies with authenticated, role-aware, ownership-aware rules.
-- Direct anonymous access is denied for sensitive CRM tables except the limited
-- landing lead form insert policy below.

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

GRANT EXECUTE ON FUNCTION public.current_crm_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_crm_admin() TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_results ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'users',
        'companies',
        'contacts',
        'deals',
        'tickets',
        'tasks',
        'activities',
        'pipeline_stages',
        'integrations',
        'prospect_searches',
        'prospect_results'
      )
      AND (
        (tablename, policyname) IN (
          ('users', 'Users can do anything'),
          ('companies', 'Companies can do anything'),
          ('contacts', 'Contacts can do anything'),
          ('deals', 'Deals can do anything'),
          ('tickets', 'Tickets can do anything'),
          ('tasks', 'Tasks can do anything'),
          ('activities', 'Activities can do anything'),
          ('pipeline_stages', 'Pipeline can do anything'),
          ('integrations', 'Integrations can do anything'),
          ('prospect_searches', 'Prospect searches can do anything'),
          ('prospect_results', 'Prospect results can do anything')
        )
        OR qual = 'true'
        OR with_check = 'true'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

-- Users: people can see/update themselves; owners/admins can manage the team.
CREATE POLICY "Users select self or admin"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_crm_admin());

CREATE POLICY "Users insert admin only"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_crm_admin());

CREATE POLICY "Users update self or admin"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_crm_admin())
  WITH CHECK (id = auth.uid() OR public.is_crm_admin());

CREATE POLICY "Users delete owner only"
  ON public.users FOR DELETE TO authenticated
  USING (public.current_crm_role() = 'owner');

-- Core CRM records: owners/admins can manage all; sellers manage owned records.
CREATE POLICY "Companies owned or admin"
  ON public.companies FOR ALL TO authenticated
  USING (public.is_crm_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR owner_id = auth.uid());

CREATE POLICY "Contacts owned or admin"
  ON public.contacts FOR ALL TO authenticated
  USING (public.is_crm_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR owner_id = auth.uid());

CREATE POLICY "Deals owned or admin"
  ON public.deals FOR ALL TO authenticated
  USING (public.is_crm_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR owner_id = auth.uid());

CREATE POLICY "Tickets assigned reported or admin"
  ON public.tickets FOR ALL TO authenticated
  USING (public.is_crm_admin() OR assignee_id = auth.uid() OR reporter_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR assignee_id = auth.uid() OR reporter_id = auth.uid());

CREATE POLICY "Tasks assigned created or admin"
  ON public.tasks FOR ALL TO authenticated
  USING (public.is_crm_admin() OR assignee_id = auth.uid() OR created_by_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR assignee_id = auth.uid() OR created_by_id = auth.uid());

CREATE POLICY "Activities owned user or admin"
  ON public.activities FOR ALL TO authenticated
  USING (public.is_crm_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR user_id = auth.uid());

-- Pipeline stages are readable to authenticated users; only owners/admins mutate them.
CREATE POLICY "Pipeline read authenticated"
  ON public.pipeline_stages FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Pipeline write admin"
  ON public.pipeline_stages FOR ALL TO authenticated
  USING (public.is_crm_admin())
  WITH CHECK (public.is_crm_admin());

-- Tokens/configuration stay private to the integration owner or admins.
CREATE POLICY "Integrations owned or admin"
  ON public.integrations FOR ALL TO authenticated
  USING (public.is_crm_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR user_id = auth.uid());

-- Prospecting records belong to the user who launched the search.
CREATE POLICY "Prospect searches owned or admin"
  ON public.prospect_searches FOR ALL TO authenticated
  USING (public.is_crm_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_crm_admin() OR user_id = auth.uid());

CREATE POLICY "Prospect results owned search or admin"
  ON public.prospect_results FOR ALL TO authenticated
  USING (
    public.is_crm_admin()
    OR EXISTS (
      SELECT 1 FROM public.prospect_searches
      WHERE prospect_searches.id = prospect_results.search_id
        AND prospect_searches.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_crm_admin()
    OR EXISTS (
      SELECT 1 FROM public.prospect_searches
      WHERE prospect_searches.id = prospect_results.search_id
        AND prospect_searches.user_id = auth.uid()
    )
  );

-- Lead inquiries are sensitive: no anonymous reads/updates/deletes. The only
-- direct anonymous action allowed is submitting a new landing form lead.
ALTER TABLE IF EXISTS public.lead_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lead inquiries assigned or admin" ON public.lead_inquiries;
DROP POLICY IF EXISTS "Lead inquiries public landing insert" ON public.lead_inquiries;

CREATE POLICY "Lead inquiries assigned or admin"
  ON public.lead_inquiries FOR ALL TO authenticated
  USING (public.is_crm_admin() OR assigned_to = auth.uid())
  WITH CHECK (public.is_crm_admin() OR assigned_to = auth.uid());

CREATE POLICY "Lead inquiries public landing insert"
  ON public.lead_inquiries FOR INSERT TO anon
  WITH CHECK (
    source = 'landing_form'
    AND status = 'new'
    AND assigned_to IS NULL
    AND contact_id IS NULL
    AND agent_session_id IS NULL
  );
