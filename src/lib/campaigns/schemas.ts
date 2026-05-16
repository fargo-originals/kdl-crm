import { z } from 'zod';

const r = (field: string, max: number) =>
  z.string({ error: `${field} es obligatorio` }).trim().min(1, `${field} es obligatorio`).max(max);

export const SectorSchema = z.enum([
  'restaurantes', 'cafeterias', 'peluquerias', 'fisioterapia', 'dentistas', 'hoteles',
]);

export const TonoSchema = z.enum(['tu_cercano', 'tu_profesional', 'usted_formal']);

export const TemplateTypeSchema = z.enum([
  'email_1_first_contact', 'email_2_follow_up', 'email_3_breakup',
]);

export const CreateCampaignSchema = z.object({
  name: r('Nombre', 200),
  sector: SectorSchema,
  tono: TonoSchema,
  templateType: TemplateTypeSchema.optional().default('email_1_first_contact'),
  subject: r('Asunto', 300),
  bodyHtml: r('Cuerpo del email', 50000),
});

export const UpdateCampaignSchema = z.object({
  name: r('Nombre', 200).optional(),
  sector: SectorSchema.optional(),
  tono: TonoSchema.optional(),
  subject: r('Asunto', 300).optional(),
  bodyHtml: r('Cuerpo del email', 50000).optional(),
  status: z.enum(['draft', 'sent', 'archived']).optional(),
});

export const RecipientSelectionSchema = z.object({
  recipients: z.array(
    z.object({
      email: z.string().min(1, 'Email requerido').regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'),
      contactId: z.string().uuid().optional().nullable(),
      variables: z.object({
        firstName: z.string().optional(),
        businessName: z.string().optional(),
        neighborhood: z.string().optional(),
        rating: z.string().optional(),
        reviewCount: z.string().optional(),
        websiteUrl: z.string().optional(),
        category: z.string().optional(),
      }).optional(),
    })
  ).min(1, 'Debes seleccionar al menos un destinatario'),
});

export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>;
export type RecipientSelection = z.infer<typeof RecipientSelectionSchema>;
