import { api } from './api';

export type CajaSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'PAYOUT' | 'CASH_DROP' | 'CASH_IN' | 'REFUND';

export interface CajaPayload {
  name: string;
  branchId: string;
  isActive?: boolean;
  applyIVA?: boolean;
  isExternal?: boolean;
}

export interface CajaWithSession {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
  applyIVA: boolean;
  isExternal: boolean;
  branch?: { id: string; name: string };
  currentSession: CajaSession | null;
  createdAt: string;
  updatedAt: string;
}

export interface CajaSession {
  id: string;
  cajaId: string;
  openedByUserId: string;
  closedByUserId?: string | null;
  openingFloat: number;
  expectedCash?: number | null;
  countedCash?: number | null;
  difference?: number | null;
  status: CajaSessionStatus;
  openingNotes?: string | null;
  closingNotes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openedByUser?: { id: string; name: string; lastName: string };
  closedByUser?: { id: string; name: string; lastName: string };
  movements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  cajaSessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  receiptCount?: number | null;
  invoiceNumber?: string | null;
  authorizedByUserId?: string | null;
  createdByUserId: string;
  createdAt: string;
  authorizedByUser?: { id: string; name: string; lastName: string };
  createdByUser?: { id: string; name: string; lastName: string };
}

export interface SessionTotals {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  cashRefunds: number;
  payouts: number;
  cashIn: number;
  openingFloat: number;
  expectedCash: number;
}

export interface CashMovementPayload {
  type: CashMovementType;
  amount: number;
  reason: string;
  receiptCount?: number;
  invoiceNumber?: string;
  authorizedByUserId?: string;
}

export const cajasService = {
  getAll: (branchId?: string) =>
    api.get<CajaWithSession[]>('/cajas', branchId ? { branchId } : undefined),

  getById: (id: string) => api.get<CajaWithSession>(`/cajas/${id}`),

  create: (data: CajaPayload) => api.post<CajaWithSession>('/cajas', data),

  update: (id: string, data: Partial<CajaPayload>) =>
    api.put<CajaWithSession>(`/cajas/${id}`, data),

  openSession: (cajaId: string, data: { openingFloat: number; openingNotes?: string }) =>
    api.post<CajaSession>(`/cajas/${cajaId}/open`, data),

  closeSession: (
    cajaId: string,
    data: { countedCash: number; closingNotes?: string; forceWithDifference?: boolean }
  ) => api.post<{ session: CajaSession; totals: SessionTotals }>(`/cajas/${cajaId}/close`, data),

  getCurrentSession: (cajaId: string) =>
    api.get<{ session: CajaSession | null; totals: SessionTotals | null }>(
      `/cajas/${cajaId}/session/current`
    ),

  getSessions: (cajaId: string, params?: { limit?: number; skip?: number }) =>
    api.get<{ items: CajaSession[]; total: number }>(`/cajas/${cajaId}/sessions`, params),

  recordCashMovement: (cajaId: string, data: CashMovementPayload) =>
    api.post<CashMovement>(`/cajas/${cajaId}/movements`, data),
};
