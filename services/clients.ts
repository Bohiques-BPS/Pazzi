import { api } from './api';

export interface ClientRecord {
  id: string;
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  clientType?: string;
  companyName?: string;
  taxId?: string;
  creditLimit?: number;
  paymentTerms?: string;
  priceLevel?: string;
  isLoss?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientSaleRecent {
  id: string;
  date: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  isReturn: boolean;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { id: string; name: string };
  }>;
  caja?: { id: string; name: string };
  branch?: { id: string; name: string };
  payments: Array<{
    id: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethodUsed: string;
  }>;
}

export interface ClientEstimateRecent {
  id: string;
  date: string;
  totalAmount: number;
  status: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { id: string; name: string };
  }>;
}

export interface ClientLayawayRecent {
  id: string;
  date: string;
  totalAmount: number;
  status: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { id: string; name: string };
  }>;
  payments: Array<{ id: string; amountPaid: number; paymentDate: string }>;
}

export interface ClientProjectRecent {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface ClientReceivable {
  saleId: string;
  saleDate: string;
  totalAmount: number;
  paid: number;
  balance: number;
  dueDate: string | null;
  daysOverdue: number;
  paymentStatus: string;
}

export interface ClientTopProduct {
  productId: string;
  name: string;
  unitPrice: number;
  totalQuantity: number;
}

export interface ClientSummary {
  client: ClientRecord;
  summary: {
    totalRevenue: number;
    totalSalesCount: number;
    totalProjects: number;
    totalEstimates: number;
    totalLayaways: number;
    totalPaid: number;
    totalBalance: number;
    accountsReceivableCount: number;
    accountsReceivableTotal: number;
    periodDays: number;
  };
  recentSales: ClientSaleRecent[];
  recentEstimates: ClientEstimateRecent[];
  recentLayaways: ClientLayawayRecent[];
  projects: ClientProjectRecent[];
  accountsReceivable: ClientReceivable[];
  topProducts: ClientTopProduct[];
}

export const clientsService = {
  getAll: (filters?: { search?: string; clientType?: string; isActive?: boolean }) =>
    api.get<ClientRecord[]>('/clients', filters as any),

  getById: (id: string) => api.get<ClientRecord>(`/clients/${id}`),

  getSummary: (id: string, params?: { period?: number }) =>
    api.get<ClientSummary>(`/clients/${id}/summary`, params as any),

  create: (data: Partial<ClientRecord>) => api.post<ClientRecord>('/clients', data),

  update: (id: string, data: Partial<ClientRecord>) =>
    api.put<ClientRecord>(`/clients/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/clients/${id}`),
};
