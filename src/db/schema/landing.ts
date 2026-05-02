import { pgTable, uuid, text, timestamp, boolean, integer, numeric, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './index';

export const blogPostStatusEnum = pgEnum('blog_post_status', ['draft', 'scheduled', 'published', 'archived']);
export const leadChannelEnum = pgEnum('lead_channel', ['whatsapp', 'email', 'phone']);
export const leadSourceEnum = pgEnum('lead_source', ['landing_form', 'manual', 'import']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'scheduled', 'won', 'lost']);

export const landingSettings = pgTable('landing_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value'),
  publishedValue: jsonb('published_value'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingHero = pgTable('landing_hero', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: jsonb('title').notNull().default({}),
  subtitle: jsonb('subtitle').default({}),
  ctaLabel: jsonb('cta_label').default({}),
  ctaUrl: text('cta_url').default('/'),
  bgMediaUrl: text('bg_media_url'),
  bgMediaType: text('bg_media_type').default('image'),
  published: boolean('published').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingServices = pgTable('landing_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  icon: text('icon'),
  title: jsonb('title').notNull().default({}),
  description: jsonb('description').default({}),
  price: numeric('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('EUR'),
  slug: text('slug').notNull().unique(),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingPortfolio = pgTable('landing_portfolio', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: jsonb('title').notNull().default({}),
  clientName: text('client_name'),
  description: jsonb('description').default({}),
  coverUrl: text('cover_url'),
  gallery: jsonb('gallery').default([]),
  externalUrl: text('external_url'),
  tags: text('tags').array(),
  slug: text('slug').notNull().unique(),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingTestimonials = pgTable('landing_testimonials', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorName: text('author_name').notNull(),
  authorRole: jsonb('author_role').default({}),
  authorAvatarUrl: text('author_avatar_url'),
  quote: jsonb('quote').notNull().default({}),
  rating: integer('rating').default(5),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingFaq = pgTable('landing_faq', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: jsonb('question').notNull().default({}),
  answer: jsonb('answer').notNull().default({}),
  category: text('category'),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingTeam = pgTable('landing_team', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  role: jsonb('role').default({}),
  bio: jsonb('bio').default({}),
  avatarUrl: text('avatar_url'),
  socials: jsonb('socials').default({}),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const landingBlogPosts = pgTable('landing_blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: jsonb('title').notNull().default({}),
  excerpt: jsonb('excerpt').default({}),
  body: jsonb('body').default({}),
  coverUrl: text('cover_url'),
  tags: text('tags').array(),
  authorId: uuid('author_id').references(() => users.id),
  publishedAt: timestamp('published_at'),
  status: blogPostStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leadInquiries = pgTable('lead_inquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id'),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  businessName: text('business_name'),
  businessType: text('business_type'),
  serviceInterest: text('service_interest'),
  budgetRange: text('budget_range'),
  message: text('message'),
  preferredChannel: leadChannelEnum('preferred_channel').default('email'),
  preferredTimeWindow: text('preferred_time_window'),
  locale: text('locale').default('es'),
  utm: jsonb('utm').default({}),
  source: leadSourceEnum('source').default('landing_form'),
  status: leadStatusEnum('status').notNull().default('new'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  agentSessionId: uuid('agent_session_id'),
  qualificationData: jsonb('qualification_data').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
