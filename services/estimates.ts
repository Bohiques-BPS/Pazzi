import { api } from './api';

export type EstimateStatus = 'Borrador' | 'Enviado' | 'Aceptado' | 'Rechazado' | 'Expirado' | 'Combinado';

export interface EstimateItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export interface EstimatePayload {
  clientId: string;
  branchId: string;
  status?: EstimateStatus;
  notes?: string;
  expiryDate?: string;
  items: EstimateItemPayload[];
}

export interface EstimateRecord {
  id: string;
  date: string;
  clientId: string;
  branchId: string;
  employeeId: string;
  totalAmount: number;
  status: EstimateStatus;
  notes?: string | null;
  expiryDate?: string | null;
  client?: { id: string; name: string; lastName?: string };
  branch?: { id: string; name: string };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discountType?: string | null;
    discountValue?: number | null;
    product?: { name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

export const estimatesService = {
  getAll: (filters?: { clientId?: string; status?: EstimateStatus; branchId?: string }) =>
    api.get<EstimateRecord[]>('/estimates', filters as any),

  create: (data: EstimatePayload) => api.post<EstimateRecord>('/estimates', data),

  update: (id: string, data: Partial<EstimatePayload>) =>
    api.put<EstimateRecord>(`/estimates/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/estimates/${id}`),

  updateStatus: (id: string, status: EstimateStatus) =>
    api.put<EstimateRecord>(`/estimates/${id}/status`, { status }),

  /** Carga el estimado en shape listo para precargar el cart en el POS. */
  getForConversion: (id: string) =>
    api.get<EstimateRecord>(`/estimates/${id}/for-conversion`),
};
