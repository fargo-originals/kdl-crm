import { z } from 'zod';

const emptyToNull = (value: unknown) => (value === '' ? null : value);

const nullableString = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const requiredString = (field: string, max: number) =>
  z.string({ error: `${field} es obligatorio` })
    .trim()
    .min(1, `${field} es obligatorio`)
    .max(max, `${field} no puede superar ${max} caracteres`);

const uuidField = z.preprocess(
  emptyToNull,
  z.string().uuid('Debe ser un UUID válido').nullable().optional(),
);

const dateTimeField = z.preprocess(
  emptyToNull,
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Debe ser una fecha válida').nullable().optional(),
);

const integerRange = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const ContactLifecycleStageSchema = z.enum(['lead', 'opportunity', 'customer', 'inactive']);
export const ContactStatusSchema = z.enum(['active', 'inactive', 'archived']);
export const DealStageSchema = z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']);
export const CurrencySchema = z.enum(['EUR', 'USD', 'GBP']);
export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const CreateContactSchema = z.object({
  first_name: requiredString('El nombre', 100),
  last_name: requiredString('El apellido', 100),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email('Debe ser un email válido').max(254).nullable().optional(),
  ),
  phone: nullableString(40),
  job_title: nullableString(120),
  department: nullableString(120),
  company_id: uuidField,
  lead_score: integerRange(0, 100).optional(),
  lifecycle_stage: ContactLifecycleStageSchema.default('lead'),
  status: ContactStatusSchema.default('active'),
  source: nullableString(80),
  notes: nullableString(5000),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
  last_activity_at: dateTimeField,
});

export const UpdateContactSchema = CreateContactSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Debes enviar al menos un campo para actualizar',
);

export const CreateDealSchema = z.object({
  name: requiredString('El nombre del deal', 160),
  company_id: uuidField,
  contact_id: uuidField,
  stage: DealStageSchema,
  value: z.coerce
    .number()
    .min(0, 'El importe no puede ser negativo')
    .max(999999999999.99, 'El importe supera el máximo permitido')
    .default(0),
  currency: CurrencySchema.default('EUR'),
  probability: integerRange(0, 100).default(50),
  expected_close_date: dateTimeField,
  closed_at: dateTimeField,
  won_reason: nullableString(500),
  lost_reason: nullableString(500),
  notes: nullableString(5000),
});

export const UpdateDealSchema = CreateDealSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Debes enviar al menos un campo para actualizar',
);

export const CreateTaskSchema = z.object({
  title: requiredString('El título', 160),
  description: nullableString(5000),
  status: TaskStatusSchema.default('todo'),
  due_date: dateTimeField,
  priority: TaskPrioritySchema.default('medium'),
  company_id: uuidField,
  contact_id: uuidField,
  deal_id: uuidField,
  assignee_id: uuidField,
  reminder_at: dateTimeField,
  completed_at: dateTimeField,
});

export const UpdateTaskSchema = z
  .object({
    title: requiredString('El título', 160).optional(),
    description: nullableString(5000),
    status: TaskStatusSchema.optional(),
    due_date: dateTimeField,
    priority: TaskPrioritySchema.optional(),
    company_id: uuidField,
    contact_id: uuidField,
    deal_id: uuidField,
    assignee_id: uuidField,
    reminder_at: dateTimeField,
    completed_at: dateTimeField,
  })
  .refine((value) => Object.keys(value).length > 0, 'Debes enviar al menos un campo para actualizar');

export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
