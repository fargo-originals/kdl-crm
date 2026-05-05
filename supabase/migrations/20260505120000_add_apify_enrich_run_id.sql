alter table prospect_searches
  add column if not exists apify_enrich_run_id text;
