import { api } from './api';

export interface SupplierPayload {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  storeOwnerId?: string;
}

export interface SupplierRecord extends SupplierPayload {
  id: string;
  createdAt: string;
}

export const suppliersService = {
  getAll: () => api.get<SupplierRecord[]>('/suppliers'),
  getById: (id: string) => api.get<SupplierRecord>(`/suppliers/${id}`),
  create: (data: SupplierPayload) => api.post<SupplierRecord>('/suppliers', data),
  update: (id: string, data: Partial<SupplierPayload>) => api.put<SupplierRecord>(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/suppliers/${id}`),
};
