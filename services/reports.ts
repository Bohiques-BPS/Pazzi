import { api } from './api';

export interface SalesReport {
  totalRevenue: number;
  totalTax?: number;
  totalSubtotal?: number;
  totalDiscount?: number;
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
  getSalesReport: (filters?: { branchId?: string; cajaId?: string; employeeId?: string; startDate?: string; endDate?: string }) =>
    api.get<SalesReport>('/sales/report', filters as any),
};

/** Filtros compartidos por todos los reportes de caja. */
export interface CajaReportFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  cajaId?: string;
  employeeId?: string;
}

/** Reportes del módulo de caja (cortes Z, descuadres, movimientos, ventas por dimensión, etc.). */
export const cajaReportsService = {
  sessions: (f?: CajaReportFilters & { onlyWithDifference?: boolean }) =>
    api.get<{ rows: any[]; count: number; totalOver: number; totalShort: number }>('/cajas/reports/sessions', f as any),
  discrepancies: (f?: CajaReportFilters) =>
    api.get<{ rows: any[]; count: number; byUser: any[] }>('/cajas/reports/discrepancies', f as any),
  cashMovements: (f?: CajaReportFilters & { type?: string }) =>
    api.get<{ rows: any[]; count: number; byType: Record<string, number> }>('/cajas/reports/cash-movements', f as any),
  sessionDetail: (sessionId: string) =>
    api.get<{ session: any; totals: any; byMethod: any[] }>(`/cajas/reports/session/${sessionId}`),
  salesByHour: (f?: CajaReportFilters) =>
    api.get<{ rows: any[] }>('/cajas/reports/sales-by-hour', f as any),
  salesByDay: (f?: CajaReportFilters) =>
    api.get<{ rows: any[] }>('/cajas/reports/sales-by-day', f as any),
  byCategory: (f?: CajaReportFilters) =>
    api.get<{ rows: any[] }>('/cajas/reports/by-category', f as any),
  byBranch: (f?: CajaReportFilters) =>
    api.get<{ rows: any[] }>('/cajas/reports/by-branch', f as any),
  returns: (f?: CajaReportFilters) =>
    api.get<{ rows: any[]; count: number; total: number }>('/cajas/reports/returns', f as any),
  voids: (f?: CajaReportFilters) =>
    api.get<{ rows: any[]; count: number; total: number }>('/cajas/reports/voids', f as any),
  tax: (f?: CajaReportFilters) =>
    api.get<{ totalTax: number; totalSubtotal: number; totalDiscount: number; totalWithTax: number; count: number; byDay: any[] }>('/cajas/reports/tax', f as any),
  xReport: (cajaId: string) =>
    api.get<{ session: any; totals: any; cajaName: string }>(`/cajas/reports/x/${cajaId}`),
};
