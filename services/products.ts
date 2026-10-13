import { api } from './api';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  departmentId?: string;
  supplierId?: string;
  isActive?: boolean;
  branchId?: string;
  page?: number;
  limit?: number;
  /** Modo liviano para el type-ahead del POS: payload mínimo, búsqueda acotada, sin count. */
  slim?: boolean;
}

export interface ProductReportRow {
  id: string;
  name: string;
  unitPrice: number;
  costPrice: number | null;
  createdAt: string;
  isActive: boolean;
  qtySold: number;
  revenue: number;
  lastSale: string | null;
  profit: number;
}

export type ProductReportType = 'top-sold' | 'least-sold' | 'no-sales' | 'oldest-sale' | 'top-profit' | 'unused';

/**
 * Normaliza un producto tal como lo devuelve el backend (Prisma) a la forma que usa el FE:
 * `category` como nombre, `skus` como string[], `customSpecifications` desde `customSpecs`
 * y `stockByBranch` siempre como arreglo { branchId, quantity }.
 */
export const normalizeProductFromApi = (p: any) => ({
  ...p,
  // OJO: typeof null === 'object', por eso el guard `&& p.category`.
  category: (p?.category && typeof p.category === 'object') ? p.category.name : p?.category,
  skus: Array.isArray(p?.skus) ? p.skus.map((s: any) => typeof s === 'string' ? s : s?.sku) : [],
  customSpecifications: p?.customSpecs || p?.customSpecifications || [],
  stockByBranch: Array.isArray(p?.stockByBranch)
    ? p.stockByBranch.map((sb: any) => ({ branchId: sb.branchId, quantity: Number(sb.quantity) || 0 }))
    : [],
});

export const productsService = {
  getAll: (filters?: ProductFilters) =>
    api.get<any[]>('/products', filters as any),

  getById: (id: string) =>
    api.get<any>(`/products/${id}`),

  /** GET /products/:id ya normalizado (stock en TODAS las sucursales). */
  getByIdNormalized: async (id: string) =>
    normalizeProductFromApi(await api.get<any>(`/products/${id}`)),

  create: (data: any) =>
    api.post<any>('/products', data),

  bulkImport: (items: any[]) =>
    api.post<{ created: number; updated?: number; failedCount: number; failed: { row: number; error: string }[] }>('/products/import', { items }),

  getReports: (type: string, days?: number) =>
    api.get<ProductReportRow[]>('/products/reports', { type, ...(days ? { days } : {}) } as any),

  bulkDelete: (ids: string[]) =>
    api.post<{ deleted: number; skippedCount: number; skipped: { id: string; reason: string }[] }>('/products/bulk-delete', { ids }),

  resetLegacyCounters: () =>
    api.post<{ updated: number }>('/products/reset-legacy-counters', {}),

  migrateImagesToCloudinary: () =>
    api.post<{ migrated: number; categoriesMigrated: number; logoMigrated: number; failed: number; total: number }>('/products/migrate-images-to-cloudinary', {}),

  update: (id: string, data: any) =>
    api.put<any>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/products/${id}`),

  adjustStock: (id: string, data: { branchId: string; quantity: number; type?: string; notes?: string }) =>
    api.post<any>(`/products/${id}/adjust-stock`, data),
};
