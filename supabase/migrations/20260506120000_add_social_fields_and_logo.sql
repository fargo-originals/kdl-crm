-- Add social media fields to companies
alter table companies
  add column if not exists instagram text,
  add column if not exists facebook  text,
  add column if not exists linkedin  text;

-- Add logo URL to prospect_results (captured from Google Maps Scraper)
alter table prospect_results
  add column if not exists logo_url text;
