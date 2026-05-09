import { z } from 'zod';

const trimString = (maxLength: number) => z.string().trim().max(maxLength);
const optionalTrimString = (maxLength: number) => trimString(maxLength).optional();

export const LocaleSchema = z.enum(['es', 'en']).default('es');

export const LeadInquirySchema = z.object({
  fullName: trimString(120).min(2),
  email: trimString(254).email(),
  phone: z.string().trim().max(32).regex(/^[+()\d\s.-]*$/).optional(),
  businessName: optionalTrimString(160),
  businessType: optionalTrimString(120),
  serviceInterest: optionalTrimString(120),
  budgetRange: optionalTrimString(80),
  message: optionalTrimString(2000),
  preferredChannel: z.enum(['whatsapp', 'email', 'phone']).default('email'),
  preferredTimeWindow: optionalTrimString(120),
  locale: LocaleSchema,
  utm: z.record(z.string().trim().max(64), z.string().trim().max(256)).optional(),
  honeypot: z.string().trim().max(256).optional(), // must be empty
  turnstileToken: z.string().trim().max(4096).optional(),
  recaptchaToken: z.string().trim().max(4096).optional(),
  captchaToken: z.string().trim().max(4096).optional(),
}).strict();

export type LeadInquiryInput = z.infer<typeof LeadInquirySchema>;
