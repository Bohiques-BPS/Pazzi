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

export const productsService = {
  getAll: (filters?: ProductFilters) =>
    api.get<any[]>('/products', filters as any),

  getById: (id: string) =>
    api.get<any>(`/products/${id}`),

  create: (data: any) =>
    api.post<any>('/products', data),

  bulkImport: (items: any[]) =>
    api.post<{ created: number; updated?: number; failedCount: number; failed: { row: number; error: string }[] }>('/products/import', { items }),

  getReports: (type: string, days?: number) =>
    api.get<ProductReportRow[]>('/products/reports', { type, ...(days ? { days } : {}) } as any),

  bulkDelete: (ids: string[]) =>
    api.post<{ deleted: number; skippedCount: number; skipped: { id: string; reason: string }[] }>('/products/bulk-delete', { ids }),

  update: (id: string, data: any) =>
    api.put<any>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/products/${id}`),

  adjustStock: (id: string, data: { branchId: string; quantity: number; type?: string; notes?: string }) =>
    api.post<any>(`/products/${id}/adjust-stock`, data),
};
