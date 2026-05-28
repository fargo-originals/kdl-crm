import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users, contacts } from './index';
import { leadInquiries } from './landing';
import { agentSessions } from './agents';

export const voiceCallStatusEnum = pgEnum('voice_call_status', [
  'queued',
  'ringing',
  'in_progress',
  'completed',
  'no_answer',
  'busy',
  'failed',
  'voicemail',
]);

export const voiceCallOutcomeEnum = pgEnum('voice_call_outcome', [
  'appointment_booked',
  'callback_requested',
  'not_interested',
  'no_answer',
  'wrong_number',
  'qualified',
  'dnc',
]);

export const voiceCalls = pgTable('voice_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leadInquiries.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  agentSessionId: uuid('agent_session_id').references(() => agentSessions.id),
  direction: text('direction').notNull().default('outbound'),
  provider: text('provider').notNull().default('telnyx'),
  providerCallId: text('provider_call_id').unique(),
  fromNumber: text('from_number'),
  toNumber: text('to_number'),
  status: voiceCallStatusEnum('status').notNull().default('queued'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  endedReason: text('ended_reason'),
  recordingUrl: text('recording_url'),
  transcript: jsonb('transcript').default([]),
  summary: text('summary'),
  outcome: voiceCallOutcomeEnum('outcome'),
  objectionsDetected: jsonb('objections_detected').default([]),
  sentiment: text('sentiment'),
  cost: numeric('cost', { precision: 10, scale: 4 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
