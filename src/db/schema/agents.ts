import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './index';
import { leadInquiries } from './landing';

export const agentChannelEnum = pgEnum('agent_channel', ['whatsapp', 'email']);
export const agentSessionStatusEnum = pgEnum('agent_session_status', ['active', 'awaiting_human', 'closed']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['proposed', 'confirmed', 'cancelled', 'rescheduled', 'no_show']);

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leadInquiries.id).notNull(),
  channel: agentChannelEnum('channel').notNull(),
  messages: jsonb('messages').notNull().default([]),
  status: agentSessionStatusEnum('status').notNull().default('active'),
  lastProviderMessageId: text('last_provider_message_id'),
  externalContactId: text('external_contact_id'), // WA phone or email address
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const salesAvailability = pgTable('sales_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  weekday: integer('weekday').notNull(), // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: text('start_time').notNull(), // 'HH:MM'
  endTime: text('end_time').notNull(),
  timezone: text('timezone').notNull().default('Europe/Madrid'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leadInquiries.id).notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id).notNull(),
  proposedSlots: jsonb('proposed_slots').default([]),
  confirmedSlot: timestamp('confirmed_slot'),
  status: appointmentStatusEnum('status').notNull().default('proposed'),
  meetingUrl: text('meeting_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // lead.received, appointment.proposed, etc.
  title: text('title').notNull(),
  body: text('body'),
  data: jsonb('data').default({}),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
