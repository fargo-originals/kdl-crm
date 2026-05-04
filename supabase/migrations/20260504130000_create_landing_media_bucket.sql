-- Create public storage bucket for landing page media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-media',
  'landing-media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated requests via service role (uploads go through /api/upload)
-- No RLS policies needed since the API route uses service_role_key
