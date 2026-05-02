import { z } from 'zod';

export const LocaleSchema = z.enum(['es', 'en']).default('es');

export const LeadInquirySchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  serviceInterest: z.string().optional(),
  budgetRange: z.string().optional(),
  message: z.string().optional(),
  preferredChannel: z.enum(['whatsapp', 'email', 'phone']).default('email'),
  preferredTimeWindow: z.string().optional(),
  locale: LocaleSchema,
  utm: z.record(z.string(), z.string()).optional(),
  honeypot: z.string().optional(), // must be empty
});

export type LeadInquiryInput = z.infer<typeof LeadInquirySchema>;
