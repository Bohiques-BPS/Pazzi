import { api } from './api';

export const posService = {
  createSale: (data: {
    totalAmount: number;
    paymentMethod: string;
    paymentStatus?: string;
    cajaId: string;
    branchId: string;
    clientId?: string;
    projectId?: string;
    dueDate?: string;
    receivableNotes?: string;
    isReturn?: boolean;
    originalSaleId?: string;
    isExternal?: boolean;
    relatedEstimateIds?: string[];
    items: { productId: string; quantity: number; unitPrice: number; discountType?: string; discountValue?: number }[];
  }) => api.post<any>('/sales', data),

  addPayment: (saleId: string, data: { amountPaid: number; paymentMethodUsed: string; notes?: string; attachment?: string }) =>
    api.post<any>(`/sales/${saleId}/payment`, data),

  voidSale: (saleId: string) => api.post<any>(`/sales/${saleId}/void`),

  createEstimate: (data: {
    clientId: string;
    branchId: string;
    status?: string;
    notes?: string;
    expiryDate?: string;
    items: { productId: string; quantity: number; unitPrice: number; discountType?: string; discountValue?: number }[];
  }) => api.post<any>('/estimates', data),

  updateEstimateStatus: (id: string, status: string) =>
    api.put<any>(`/estimates/${id}/status`, { status }),

  createLayaway: (data: {
    clientId: string;
    branchId: string;
    totalAmount: number;
    notes?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }) => api.post<any>('/layaways', data),

  addLayawayPayment: (id: string, data: { amountPaid: number; paymentMethodUsed: string; notes?: string }) =>
    api.post<any>(`/layaways/${id}/payment`, data),

  getSales: (filters?: { branchId?: string; cajaId?: string; clientId?: string; startDate?: string; endDate?: string; paymentStatus?: string; isReturn?: boolean }) =>
    api.get<any[]>('/sales', filters as any),

  getEstimates: (filters?: { clientId?: string; status?: string; branchId?: string }) =>
    api.get<any[]>('/estimates', filters as any),

  getLayaways: (filters?: { clientId?: string; status?: string; branchId?: string }) =>
    api.get<any[]>('/layaways', filters as any),

  getSalesReport: (filters?: { branchId?: string; startDate?: string; endDate?: string }) =>
    api.get<any>('/sales/report', filters as any),
};
