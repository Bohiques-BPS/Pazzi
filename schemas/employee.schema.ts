import { z } from 'zod';
import { emailSchema, phoneSchema, pinSchema, moneySchema } from './common.schema';

/**
 * Schema de Colaborador. Alineado con pazi-be/controllers/shared.controller.ts (employeeSchema).
 * El campo `permissions` se valida como Record<string,boolean> y se sanitiza en el BE
 * contra el catálogo (no lo restringimos aquí porque el catálogo es dinámico).
 */

export const employeeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: emailSchema,
  role: z.string().min(1, 'El puesto es requerido'),
  hireDate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: phoneSchema,
  department: z.string().optional().nullable(),
  salary: moneySchema.optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  socialSecurityNumber: z.string().optional().nullable(),
  profilePictureUrl: z.string().optional().nullable(),
  pin: pinSchema.optional().nullable().or(z.literal('')),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactRelationship: z.string().optional().nullable(),
  emergencyContactPhone: phoneSchema,
  enableLogin: z.boolean().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

export const employeeUpdateSchema = employeeSchema.partial();

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
