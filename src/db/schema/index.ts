import { pgTable, uuid, text, timestamp, boolean, integer, numeric, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').notNull().default('seller'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  active: boolean('active').default(true),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  notificationPreferences: jsonb('notification_preferences'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
