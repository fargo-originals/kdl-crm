-- Aggregated audit table for rejected public landing lead submissions.
-- Keeps attack visibility without inserting rejected payloads into contacts or lead_inquiries.
CREATE TABLE IF NOT EXISTS landing_lead_rejection_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  reason text NOT NULL,
  origin text,
  ip_hash text NOT NULL,
  email_hash text,
  count integer NOT NULL DEFAULT 1,
  hour_started_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  latest_details jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS landing_lead_rejection_audits_reason_hour_idx
  ON landing_lead_rejection_audits (reason, hour_started_at DESC);

CREATE INDEX IF NOT EXISTS landing_lead_rejection_audits_ip_hour_idx
  ON landing_lead_rejection_audits (ip_hash, hour_started_at DESC);

CREATE INDEX IF NOT EXISTS landing_lead_rejection_audits_email_hour_idx
  ON landing_lead_rejection_audits (email_hash, hour_started_at DESC)
  WHERE email_hash IS NOT NULL;
