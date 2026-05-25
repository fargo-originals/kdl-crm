-- Agente de llamadas de voz: canal 'phone', tabla voice_calls y seguimiento de llamadas por lead.

-- 1. Añadir 'phone' al enum agent_channel (idempotente)
ALTER TYPE agent_channel ADD VALUE IF NOT EXISTS 'phone';

-- 2. Columnas de seguimiento de llamadas en lead_inquiries
ALTER TABLE lead_inquiries
  ADD COLUMN IF NOT EXISTS call_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_call_at timestamp,
  ADD COLUMN IF NOT EXISTS do_not_call boolean DEFAULT false;

-- 3. Enums de la llamada de voz
DO $$ BEGIN
  CREATE TYPE voice_call_status AS ENUM ('queued','ringing','in_progress','completed','no_answer','busy','failed','voicemail');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE voice_call_outcome AS ENUM ('appointment_booked','callback_requested','not_interested','no_answer','wrong_number','qualified','dnc');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Tabla voice_calls
CREATE TABLE IF NOT EXISTS voice_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES lead_inquiries(id),
  contact_id uuid REFERENCES contacts(id),
  agent_session_id uuid REFERENCES agent_sessions(id),
  direction text NOT NULL DEFAULT 'outbound',
  provider text NOT NULL DEFAULT 'telnyx',
  provider_call_id text UNIQUE,
  from_number text,
  to_number text,
  status voice_call_status NOT NULL DEFAULT 'queued',
  started_at timestamp,
  ended_at timestamp,
  duration_seconds integer,
  ended_reason text,
  recording_url text,
  transcript jsonb DEFAULT '[]'::jsonb,
  summary text,
  outcome voice_call_outcome,
  objections_detected jsonb DEFAULT '[]'::jsonb,
  sentiment text,
  cost numeric(10,4),
  assigned_to uuid REFERENCES users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_calls_lead_id_idx ON voice_calls(lead_id);
CREATE INDEX IF NOT EXISTS voice_calls_status_idx ON voice_calls(status);
CREATE INDEX IF NOT EXISTS voice_calls_provider_call_id_idx ON voice_calls(provider_call_id);

-- 5. RLS: solo el service role (servidor) accede; sin políticas públicas.
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
