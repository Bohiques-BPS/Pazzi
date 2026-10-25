import { api } from './api';

export interface SalesReport {
  totalRevenue: number;
  totalTax?: number;
  totalTaxState?: number;
  totalTaxMunicipal?: number;
  totalTaxReduced?: number;
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
  dailyClose: (cajaId: string, startDate?: string, endDate?: string) =>
    api.get<{
      cajaName: string;
      date: string;
      totals: {
        totalSales: number; cashSales: number; cardSales: number; otherSales: number;
        cashRefunds: number; payouts: number; cashIn: number; openingFloat: number;
        expectedCash: number; salesCount: number; returnsCount: number;
      };
      byMethod: { method: string; count: number; amount: number }[];
      currentSession: { expectedCash: number; openingFloat: number } | null;
    }>('/cajas/reports/daily', { cajaId, startDate, endDate } as any),
};

// ── Ventas y ganancia (Reportes › General / Facturas) ──
export type AnalyticsScope = 'general' | 'pos' | 'invoices';
export type AnalyticsGroupBy = 'day' | 'month' | 'client' | 'project' | 'product' | 'category' | 'department' | 'caja' | 'branch' | 'seller' | 'paymentMethod' | 'status' | 'type';
export interface AnalyticsFilters {
  scope: AnalyticsScope; groupBy: AnalyticsGroupBy; startDate?: string; endDate?: string;
  branchId?: string; cajaId?: string; clientId?: string; projectId?: string;
  categoryId?: string; departmentId?: string; productId?: string; sellerId?: string;
}
export interface AnalyticsRow {
  key: string; label: string; count: number; qty: number;
  net: number; tax: number; total: number; cost: number; profit: number; margin: number | null;
  pending: number; paid: number;
}
export interface AnalyticsReport {
  scope: AnalyticsScope; groupBy: AnalyticsGroupBy; seriesUnit: 'day' | 'month';
  summary: AnalyticsRow & { salesCount: number; invoicesCount: number; returnsCount: number; returns: number; avgTicket: number };
  rows: AnalyticsRow[];
  series: { key: string; total: number; net: number; profit: number }[];
  truncated: boolean;
  notes: { invoicesExcluded: boolean };
}
export const analyticsService = {
  get: (f: AnalyticsFilters) => api.get<AnalyticsReport>('/cajas/reports/analytics', f as any),
};
