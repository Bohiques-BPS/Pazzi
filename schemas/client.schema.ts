import { z } from 'zod';
import { emailSchema, phoneSchema } from './common.schema';

/**
 * Schema de Cliente. Alineado con pazi-be/controllers/client.controller.ts.
 */

export const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  email: emailSchema.optional().nullable(),
  phone: phoneSchema,
  address: z.string().optional().nullable(),
  clientType: z.enum(['PARTICULAR', 'EMPRESA']).optional(),
  taxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const clientUpdateSchema = clientSchema.partial();

export type ClientInput = z.infer<typeof clientSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
