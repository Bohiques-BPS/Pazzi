import { api } from './api';

export type LayawayStatus = 'Activo' | 'Completado' | 'Cancelado';

export interface LayawayItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface LayawayPayload {
  clientId: string;
  branchId: string;
  totalAmount: number;
  notes?: string;
  items: LayawayItemPayload[];
  initialPayment?: {
    amount: number;
    paymentMethodUsed: string;
  };
}

export interface LayawayPayment {
  id: string;
  layawayId: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethodUsed: string;
  notes?: string | null;
}

export interface LayawayRecord {
  id: string;
  date: string;
  clientId: string;
  branchId: string;
  employeeId: string;
  totalAmount: number;
  status: LayawayStatus;
  notes?: string | null;
  client?: { id: string; name: string; lastName?: string; email?: string; phone?: string };
  branch?: { id: string; name: string };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { id: string; name: string; imageUrl?: string };
  }>;
  payments: LayawayPayment[];
  createdAt: string;
  updatedAt: string;
}

export const layawaysService = {
  getAll: (filters?: { clientId?: string; status?: LayawayStatus; branchId?: string }) =>
    api.get<LayawayRecord[]>('/layaways', filters as any),

  getById: (id: string) => api.get<LayawayRecord>(`/layaways/${id}`),

  create: (data: LayawayPayload) => api.post<LayawayRecord>('/layaways', data),

  addPayment: (
    id: string,
    data: { amountPaid: number; paymentMethodUsed: string; notes?: string }
  ) =>
    api.post<{
      payment: LayawayPayment;
      layaway: LayawayRecord;
      totalPaid: number;
      status: LayawayStatus;
    }>(`/layaways/${id}/payment`, data),

  cancel: (id: string, notes?: string) =>
    api.post<LayawayRecord>(`/layaways/${id}/cancel`, { notes }),
};
