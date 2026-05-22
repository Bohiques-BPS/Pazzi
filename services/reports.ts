import { api } from './api';

export interface SalesReport {
  totalRevenue: number;
  totalTransactions: number;
  avgTicket: number;
  byPaymentMethod: Array<{
    paymentMethod: string;
    _sum: { totalAmount: number | null };
    _count: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    unitPrice: number;
    totalQuantity: number;
  }>;
  topClients: Array<{
    clientId: string | null;
    name: string;
    totalRevenue: number;
    salesCount: number;
  }>;
  salesByEmployee: Array<{
    employeeId: string;
    name: string;
    totalRevenue: number;
    salesCount: number;
  }>;
}

export const reportsService = {
  getSalesReport: (filters?: { branchId?: string; employeeId?: string; startDate?: string; endDate?: string }) =>
    api.get<SalesReport>('/sales/report', filters as any),
};
