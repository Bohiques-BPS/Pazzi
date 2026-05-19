import { api } from './api';

export const layawaysService = {
  getAll: (filters?: { clientId?: string; status?: string; branchId?: string }) =>
    api.get<any[]>('/layaways', filters as any),
  create: (data: any) => api.post<any>('/layaways', data),
  addPayment: (id: string, data: { amountPaid: number; paymentMethodUsed: string; notes?: string }) =>
    api.post<any>(`/layaways/${id}/payment`, data),
};
