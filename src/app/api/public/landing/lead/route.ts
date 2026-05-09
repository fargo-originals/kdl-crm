import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { LeadInquirySchema, type LeadInquiryInput } from '@/lib/landing/schemas';
import { supabaseServer } from '@/lib/supabase-server';
import { enqueueAgentRun } from '@/lib/agents';
import { notify } from '@/lib/notifications';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const IP_RATE_LIMIT = 20;
const EMAIL_RATE_LIMIT = 5;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_BUCKET_LIMIT = 10_000;

type RateBucket = { count: number; resetAt: number };
type RejectionReason =
  | 'blocked_origin'
  | 'invalid_json'
  | 'invalid_schema'
  | 'honeypot'
  | 'rate_limited_ip'
  | 'rate_limited_email'
  | 'captcha_failed'
  | 'blocked_email_domain'
  | 'blocked_ip'
  | 'low_quality'
  | 'duplicate';

type CaptchaProvider = 'turnstile' | 'recaptcha';
type CaptchaVerification = { ok: true; provider: CaptchaProvider | 'disabled' } | { ok: false; provider: CaptchaProvider | 'missing' | 'disabled'; reason: string };

declare global {
  var landingLeadRateLimits: Map<string, RateBucket> | undefined;
}

function rateLimitStore() {
  if (!globalThis.landingLeadRateLimits) {
    globalThis.landingLeadRateLimits = new Map<string, RateBucket>();
  }
  return globalThis.landingLeadRateLimits;
}

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins() {
  const rawOrigins = [
    process.env.NEXT_PUBLIC_LANDING_URL,
    ...(process.env.LANDING_ALLOWED_ORIGINS ?? '').split(','),
  ];

  return new Set(
    rawOrigins
      .map(origin => origin?.trim())
      .filter((origin): origin is string => Boolean(origin))
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin))
  );
}

function getOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  return origin ? normalizeOrigin(origin) : null;
}

function isAllowedOrigin(origin: string | null) {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.size === 0) {
    return process.env.NODE_ENV !== 'production';
  }

  return origin !== null && allowedOrigins.has(origin);
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = { Vary: 'Origin' };

  if (isAllowedOrigin(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function json(req: NextRequest, body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders(getOrigin(req)),
      ...init?.headers,
    },
  });
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || req.headers.get('x-real-ip') || 'unknown';
}

function hashValue(value: string) {
  const salt = process.env.LANDING_AUDIT_HASH_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'landing-lead-audit';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function incrementRateLimit(key: string, limit: number) {
  const now = Date.now();
  const store = rateLimitStore();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  bucket.count += 1;
  store.set(key, bucket);

  if (store.size > RATE_BUCKET_LIMIT) {
    for (const [bucketKey, value] of store.entries()) {
      if (value.resetAt <= now) store.delete(bucketKey);
      if (store.size <= RATE_BUCKET_LIMIT) break;
    }
  }

  return { limited: bucket.count > limit, resetAt: bucket.resetAt };
}

function getEmailDomain(email: string) {
  return email.toLowerCase().split('@')[1] ?? '';
}

function getBlockedEmailDomains() {
  return new Set(
    (process.env.LANDING_BLOCKED_EMAIL_DOMAINS ?? '')
      .split(',')
      .map(domain => domain.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getBlockedIpHashes() {
  return new Set(
    (process.env.LANDING_BLOCKED_IP_HASHES ?? '')
      .split(',')
      .map(ipHash => ipHash.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFKC');
}

function isLowQualityLead(data: LeadInquiryInput) {
  const fullName = normalizeText(data.fullName);
  const message = normalizeText(data.message ?? '');
  const businessName = normalizeText(data.businessName ?? '');
  const combined = `${fullName} ${businessName} ${message}`;
  const hasUrl = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:ru|cn|xyz|top|click|zip)\b)/i.test(combined);
  const spamTerms = /\b(casino|crypto|forex|loan|porn|viagra|seo backlinks|guest post|telegram)\b/i.test(combined);
  const repeatedChars = /(.)\1{7,}/.test(combined);
  const placeholderName = /^(test|asdf|qwerty|admin|unknown|n\/a|na)$/i.test(data.fullName.trim());
  const noUsefulContext = !data.phone && !data.businessName && !data.serviceInterest && (data.message?.trim().length ?? 0) < 10;

  return hasUrl || spamTerms || repeatedChars || placeholderName || noUsefulContext;
}

function getCaptchaToken(data: LeadInquiryInput) {
  return data.turnstileToken ?? data.recaptchaToken ?? data.captchaToken ?? '';
}

async function verifyCaptcha(data: LeadInquiryInput, ip: string): Promise<CaptchaVerification> {
  const token = getCaptchaToken(data);
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

  if (!turnstileSecret && !recaptchaSecret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, provider: 'disabled', reason: 'captcha secret is not configured' };
    }
    return { ok: true, provider: 'disabled' };
  }

  if (!token) {
    return { ok: false, provider: 'missing', reason: 'captcha token is missing' };
  }

  if (turnstileSecret) {
    const form = new FormData();
    form.append('secret', turnstileSecret);
    form.append('response', token);
    form.append('remoteip', ip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const result = await response.json() as { success?: boolean; ['error-codes']?: string[] };

    return result.success
      ? { ok: true, provider: 'turnstile' }
      : { ok: false, provider: 'turnstile', reason: result['error-codes']?.join(', ') || 'verification failed' };
  }

  const form = new FormData();
  form.append('secret', recaptchaSecret!);
  form.append('response', token);
  form.append('remoteip', ip);

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: form,
  });
  const result = await response.json() as { success?: boolean; score?: number; ['error-codes']?: string[] };
  const minimumScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');

  if (result.success && (result.score === undefined || result.score >= minimumScore)) {
    return { ok: true, provider: 'recaptcha' };
  }

  return { ok: false, provider: 'recaptcha', reason: result['error-codes']?.join(', ') || `score ${result.score ?? 'unknown'}` };
}

function publicAcceptedResponse(req: NextRequest) {
  return json(req, { ok: true }, { status: 202 });
}

async function logRejectedAttempt(req: NextRequest, reason: RejectionReason, email?: string, details: Record<string, unknown> = {}) {
  const ip = getClientIp(req);
  const origin = getOrigin(req);
  const hourStartedAt = new Date(Math.floor(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000).toISOString();
  const ipHash = hashValue(ip);
  const emailHash = email ? hashValue(email.toLowerCase()) : null;
  const fingerprint = hashValue(`${hourStartedAt}:${reason}:${ipHash}:${emailHash ?? ''}:${origin ?? ''}`);

  try {
    const { data: existing } = await supabaseServer
      .from('landing_lead_rejection_audits')
      .select('id,count')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      await supabaseServer
        .from('landing_lead_rejection_audits')
        .update({
          count: (existing.count ?? 0) + 1,
          last_seen_at: new Date().toISOString(),
          latest_details: details,
        })
        .eq('id', existing.id);
      return;
    }

    await supabaseServer
      .from('landing_lead_rejection_audits')
      .insert({
        fingerprint,
        reason,
        origin,
        ip_hash: ipHash,
        email_hash: emailHash,
        count: 1,
        hour_started_at: hourStartedAt,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        latest_details: details,
      });
  } catch (error) {
    console.error('Rejected landing lead audit failed:', error);
  }
}

async function recentlySubmitted(email: string) {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data } = await supabaseServer
    .from('lead_inquiries')
    .select('id')
    .eq('email', email.toLowerCase())
    .gte('created_at', since)
    .limit(1);

  return Boolean(data?.length);
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAllowedOrigin(origin)) {
    await logRejectedAttempt(req, 'blocked_origin', undefined, { origin: req.headers.get('origin') });
    return json(req, { error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const ipHash = hashValue(ip);
  const ipRateLimit = incrementRateLimit(`ip:${ipHash}`, IP_RATE_LIMIT);
  if (ipRateLimit.limited) {
    await logRejectedAttempt(req, 'rate_limited_ip', undefined, { resetAt: new Date(ipRateLimit.resetAt).toISOString() });
    return json(req, { error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await logRejectedAttempt(req, 'invalid_json');
    return json(req, { error: 'Invalid JSON' }, { status: 400 });
  }

  const rawEmail = typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string'
    ? body.email.toLowerCase().slice(0, 254)
    : undefined;

  const parsed = LeadInquirySchema.safeParse(body);
  if (!parsed.success) {
    await logRejectedAttempt(req, 'invalid_schema', rawEmail, { fields: Object.keys(parsed.error.flatten().fieldErrors) });
    return json(req, { error: parsed.error.flatten() }, { status: 422 });
  }

  const { honeypot, ...data } = parsed.data;
  const email = data.email.toLowerCase();
  const emailRateLimit = incrementRateLimit(`email:${hashValue(email)}`, EMAIL_RATE_LIMIT);
  if (emailRateLimit.limited) {
    await logRejectedAttempt(req, 'rate_limited_email', email, { resetAt: new Date(emailRateLimit.resetAt).toISOString() });
    return json(req, { error: 'Too many requests' }, { status: 429 });
  }

  if (honeypot) {
    await logRejectedAttempt(req, 'honeypot', email);
    return publicAcceptedResponse(req);
  }

  const captcha = await verifyCaptcha(parsed.data, ip);
  if (!captcha.ok) {
    await logRejectedAttempt(req, 'captcha_failed', email, { provider: captcha.provider, reason: captcha.reason });
    return json(req, { error: 'Captcha verification failed' }, { status: 403 });
  }

  if (getBlockedIpHashes().has(ipHash.toLowerCase())) {
    await logRejectedAttempt(req, 'blocked_ip', email);
    return publicAcceptedResponse(req);
  }

  if (getBlockedEmailDomains().has(getEmailDomain(email))) {
    await logRejectedAttempt(req, 'blocked_email_domain', email, { domain: getEmailDomain(email) });
    return publicAcceptedResponse(req);
  }

  if (isLowQualityLead(data)) {
    await logRejectedAttempt(req, 'low_quality', email);
    return publicAcceptedResponse(req);
  }

  if (await recentlySubmitted(email)) {
    await logRejectedAttempt(req, 'duplicate', email);
    return publicAcceptedResponse(req);
  }

  // Upsert contact
  const contactUpsert = await supabaseServer
    .from('contacts')
    .upsert({
      first_name: data.fullName.split(' ')[0] ?? data.fullName,
      last_name: data.fullName.split(' ').slice(1).join(' ') || '',
      email,
      phone: data.phone,
      source: 'landing_form',
      lifecycle_stage: 'lead',
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select('id')
    .single();

  // Assign to first available seller (round-robin simplified: first owner/seller)
  const { data: sellers } = await supabaseServer
    .from('users')
    .select('id')
    .eq('active', true)
    .order('created_at')
    .limit(1);

  const assignedTo = sellers?.[0]?.id ?? null;

  // Insert lead inquiry
  const { data: lead, error } = await supabaseServer
    .from('lead_inquiries')
    .insert({
      contact_id: contactUpsert.data?.id ?? null,
      full_name: data.fullName,
      email,
      phone: data.phone,
      business_name: data.businessName,
      business_type: data.businessType,
      service_interest: data.serviceInterest,
      budget_range: data.budgetRange,
      message: data.message,
      preferred_channel: data.preferredChannel,
      preferred_time_window: data.preferredTimeWindow,
      locale: data.locale,
      utm: data.utm ?? {},
      source: 'landing_form',
      status: 'new',
      assigned_to: assignedTo,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Lead insert error:', error);
    return json(req, { error: 'Database error' }, { status: 500 });
  }

  // Log activity
  await supabaseServer.from('activities').insert({
    type: 'lead_received',
    subject: `Nuevo lead desde la landing: ${data.fullName}`,
    content: data.message ?? '',
    contact_id: contactUpsert.data?.id ?? null,
    user_id: assignedTo,
  });

  // Notify assigned user
  if (assignedTo) {
    notify(assignedTo, 'lead.received', {
      title: `Nuevo lead: ${data.fullName}`,
      body: `${email}${data.businessName ? ` · ${data.businessName}` : ''}`,
      data: { leadId: lead.id },
      leadId: lead.id,
    }).catch(err => console.error('Notify error:', err));
  }

  // Start AI agent conversation only after duplicate, block and quality checks passed.
  enqueueAgentRun(lead.id).catch(err => console.error('Agent enqueue failed:', err));

  return json(req, { ok: true, leadId: lead.id }, { status: 201 });
}

export async function OPTIONS(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAllowedOrigin(origin)) {
    return new NextResponse(null, {
      status: 403,
      headers: corsHeaders(origin),
    });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
