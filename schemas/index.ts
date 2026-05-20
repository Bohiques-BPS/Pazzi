/**
 * Barril de schemas Zod compartidos del proyecto.
 *
 * Convenciones:
 *   - Cada archivo exporta el schema Zod + un tipo inferido (z.infer).
 *   - Los schemas reflejan los Zod schemas del backend (pazi-be/controllers/...)
 *     para tener validación coherente en ambos lados.
 *   - Si cambia un schema aquí, cambiar también el del BE.
 *
 * TODO (Fase 1+): unificar en un paquete monorepo (`packages/shared-schemas`)
 * para compartir definiciones reales en vez de copy manual.
 */

export * from './common.schema';
export * from './auth.schema';
export * from './employee.schema';
export * from './product.schema';
export * from './client.schema';
