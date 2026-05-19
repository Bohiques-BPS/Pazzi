import { api } from './api';

export interface SaleFilters {
  branchId?: string;
  cajaId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  isReturn?: boolean;
}

export const salesService = {
  getAll: (filters?: SaleFilters) =>
    api.get<any[]>('/sales', filters as any),

  getById: (id: string) =>
    api.get<any>(`/sales/${id}`),

  create: (data: any) =>
    api.post<any>('/sales', data),

  addPayment: (saleId: string, data: { amountPaid: number; paymentMethodUsed: string; notes?: string }) =>
    api.post<any>(`/sales/${saleId}/payment`, data),

  voidSale: (saleId: string) =>
    api.post<any>(`/sales/${saleId}/void`),

  getReport: (filters?: { branchId?: string; startDate?: string; endDate?: string }) =>
    api.get<any>('/sales/report', filters as any),
};
