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
}

export const productsService = {
  getAll: (filters?: ProductFilters) =>
    api.get<any[]>('/products', filters as any),

  getById: (id: string) =>
    api.get<any>(`/products/${id}`),

  create: (data: any) =>
    api.post<any>('/products', data),

  update: (id: string, data: any) =>
    api.put<any>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/products/${id}`),

  adjustStock: (id: string, data: { branchId: string; quantity: number; type?: string; notes?: string }) =>
    api.post<any>(`/products/${id}/adjust-stock`, data),
};
