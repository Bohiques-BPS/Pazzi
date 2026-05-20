import { z } from 'zod';

/**
 * Schemas atómicos reutilizados por el resto de los schemas del proyecto.
 * Mantener este archivo como la única fuente de verdad para tipos comunes
 * (email, teléfono, moneda, etc.).
 */

export const emailSchema = z.string().email('Email inválido').max(254);

export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-+()]{7,20}$/, 'Teléfono inválido')
  .optional()
  .nullable();

export const moneySchema = z
  .number({ message: 'Debe ser un número' })
  .nonnegative('No puede ser negativo')
  .multipleOf(0.01, 'Máximo 2 decimales');

export const positiveIntSchema = z
  .number({ message: 'Debe ser un número' })
  .int('Debe ser un entero')
  .positive('Debe ser mayor a 0');

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos');

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
  .regex(/[0-9]/, 'Debe contener al menos un número');

export const uuidSchema = z.string().uuid('ID inválido');

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, 'Fecha inválida (use YYYY-MM-DD)');

/** Convierte errores Zod (issues) en un mapa { field: message } para uso en forms. */
export function zodIssuesToFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_root';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
