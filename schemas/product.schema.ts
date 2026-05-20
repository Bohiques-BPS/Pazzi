import { z } from 'zod';
import { moneySchema, uuidSchema, dateStringSchema } from './common.schema';

/**
 * Schema de Producto. Alineado con pazi-be/controllers/product.controller.ts.
 * El BE espera `categoryId` (UUID o null) — el FE traduce `category` (string) a `categoryId`.
 */

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  unitPrice: moneySchema,
  costPrice: moneySchema.optional().default(0),
  profit: z.number().optional().default(0),
  ivuRate: z.number().min(0, 'No puede ser negativo').max(1, 'Máximo 100%').default(0.115),
  isEmergencyTaxExempt: z.boolean().optional().default(false),
  categoryId: uuidSchema.nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  supplierId: uuidSchema.nullable().optional(),
  initialBranchId: uuidSchema.nullable().optional(),
  initialStock: z.number().int().min(0).optional().default(0),
  barcode13Digits: z.string().optional().nullable(),
  barcode2: z.string().optional().nullable(),
  family: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  physicalLocation: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  quality: z.string().optional().nullable(),
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  compatibility: z.string().optional().nullable(),
  customSpecifications: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  hasPriceLevels: z.boolean().optional(),
  priceLevels: z.array(z.object({ id: z.string(), levelName: z.string(), price: z.number() })).optional(),
  hasVariations: z.boolean().optional(),
  variations: z.array(z.object({ id: z.string(), name: z.string(), sku: z.string().optional(), unitPrice: z.number() })).optional(),
  displayOnScreen: z.boolean().optional().default(true),
  requiresSerialNumber: z.boolean().optional().default(false),
  useKitchenPrinter: z.boolean().optional().default(false),
  useBarcodePrinter: z.boolean().optional().default(false),
  creationDate: dateStringSchema.optional(),
  skus: z.array(z.string()).optional(),
}).refine(
  d => !d.costPrice || !d.unitPrice || d.unitPrice >= d.costPrice,
  { message: 'El precio de venta no debe ser menor al costo', path: ['unitPrice'] }
);

export type ProductInput = z.infer<typeof productSchema>;
