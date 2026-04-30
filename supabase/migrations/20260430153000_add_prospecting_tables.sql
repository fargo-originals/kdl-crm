-- Add prospecting module tables.
-- Safe to run more than once.

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

CREATE INDEX IF NOT EXISTS idx_prospect_searches_user_id
  ON prospect_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_prospect_searches_apify_run_id
  ON prospect_searches(apify_run_id);

CREATE INDEX IF NOT EXISTS idx_prospect_results_search_id
  ON prospect_results(search_id);

CREATE INDEX IF NOT EXISTS idx_prospect_results_google_place_id
  ON prospect_results(google_place_id);

CREATE INDEX IF NOT EXISTS idx_prospect_results_review_status
  ON prospect_results(review_status);

CREATE INDEX IF NOT EXISTS idx_prospect_results_enrichment_status
  ON prospect_results(enrichment_status);

ALTER TABLE prospect_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prospect_searches'
      AND policyname = 'Prospect searches can do anything'
  ) THEN
    CREATE POLICY "Prospect searches can do anything"
      ON prospect_searches
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prospect_results'
      AND policyname = 'Prospect results can do anything'
  ) THEN
    CREATE POLICY "Prospect results can do anything"
      ON prospect_results
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
