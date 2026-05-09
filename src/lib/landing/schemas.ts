import { z } from 'zod';

export const LocaleSchema = z.enum(['es', 'en']).default('es');

const emptyToNull = (value: unknown) => (value === '' ? null : value);

const localizedText = (max: number) =>
  z
    .object({
      es: z.string().trim().max(max).optional().default(''),
      en: z.string().trim().max(max).optional().default(''),
    })
    .refine((value) => Boolean(value.es || value.en), 'Debe incluir texto en al menos un idioma');

const optionalLocalizedText = (max: number) =>
  z.object({
    es: z.string().trim().max(max).optional().default(''),
    en: z.string().trim().max(max).optional().default(''),
  });

const slug = z
  .string({ error: 'El slug es obligatorio' })
  .trim()
  .min(1, 'El slug es obligatorio')
  .max(120, 'El slug no puede superar 120 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo puede contener minúsculas, números y guiones');

const absoluteUrl = z.preprocess(
  emptyToNull,
  z.string().trim().url('Debe ser una URL válida').max(2048).nullable().optional(),
);

const absoluteOrRelativeUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value.startsWith('/') || URL.canParse(value), 'Debe ser una URL válida')
    .nullable()
    .optional(),
);

const nullableString = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const dateTimeField = z.preprocess(
  emptyToNull,
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Debe ser una fecha válida').nullable().optional(),
);

export const BlogPostStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived']);
export const LandingMediaTypeSchema = z.enum(['image', 'video']);

export const CreateLandingHeroSchema = z.object({
  title: localizedText(120),
  subtitle: optionalLocalizedText(300).optional(),
  cta_label: optionalLocalizedText(80).optional(),
  cta_url: absoluteOrRelativeUrl,
  bg_media_url: absoluteUrl,
  bg_media_type: LandingMediaTypeSchema.default('image'),
  published: z.boolean().default(false),
});

export const UpdateLandingHeroSchema = CreateLandingHeroSchema.partial()
  .pick({
    title: true,
    subtitle: true,
    cta_label: true,
    cta_url: true,
    bg_media_url: true,
    bg_media_type: true,
    published: true,
  })
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para actualizar');

export const CreateLandingServiceSchema = z.object({
  icon: nullableString(80),
  title: localizedText(120),
  description: optionalLocalizedText(1200).optional(),
  price: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0, 'El importe no puede ser negativo').max(99999999.99).nullable().optional(),
  ),
  currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
  slug,
  published: z.boolean().default(false),
});

export const UpdateLandingServiceSchema = CreateLandingServiceSchema.partial()
  .pick({
    icon: true,
    title: true,
    description: true,
    price: true,
    currency: true,
    slug: true,
    published: true,
  })
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para actualizar');

export const CreateLandingBlogPostSchema = z.object({
  slug,
  title: localizedText(180),
  excerpt: optionalLocalizedText(500).optional(),
  body: optionalLocalizedText(50000).optional(),
  cover_url: absoluteUrl,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  published_at: dateTimeField,
  status: BlogPostStatusSchema.default('draft'),
});

export const UpdateLandingBlogPostSchema = CreateLandingBlogPostSchema.partial()
  .pick({
    slug: true,
    title: true,
    excerpt: true,
    body: true,
    cover_url: true,
    tags: true,
    published_at: true,
    status: true,
  })
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para actualizar');

export const LeadInquirySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  businessName: z.string().trim().max(160).optional(),
  businessType: z.string().trim().max(120).optional(),
  serviceInterest: z.string().trim().max(160).optional(),
  budgetRange: z.string().trim().max(80).optional(),
  message: z.string().trim().max(5000).optional(),
  preferredChannel: z.enum(['whatsapp', 'email', 'phone']).default('email'),
  preferredTimeWindow: z.string().trim().max(160).optional(),
  locale: LocaleSchema,
  utm: z.record(z.string(), z.string().max(500)).optional(),
  honeypot: z.string().max(0).optional(), // must be empty
});

export type LeadInquiryInput = z.infer<typeof LeadInquirySchema>;
export type CreateLandingHeroInput = z.infer<typeof CreateLandingHeroSchema>;
export type UpdateLandingHeroInput = z.infer<typeof UpdateLandingHeroSchema>;
export type CreateLandingServiceInput = z.infer<typeof CreateLandingServiceSchema>;
export type UpdateLandingServiceInput = z.infer<typeof UpdateLandingServiceSchema>;
export type CreateLandingBlogPostInput = z.infer<typeof CreateLandingBlogPostSchema>;
export type UpdateLandingBlogPostInput = z.infer<typeof UpdateLandingBlogPostSchema>;
