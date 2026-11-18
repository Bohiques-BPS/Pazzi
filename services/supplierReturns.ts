import { api } from './api';

/** Devoluciones a suplidor: hojas para pedir crédito por mercancía dañada (solo constancia). */

export type SupplierReturnStatus = 'pending' | 'sent' | 'credited' | 'partial' | 'rejected' | 'cancelled';
export type SupplierReturnReason = 'damaged' | 'defective' | 'expired' | 'wrong' | 'other';

export interface SupplierReturnItem {
  id?: string;
  productId?: string | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unitCost: number;
  reason: SupplierReturnReason;
  customerReturnRef?: string | null;
  notes?: string | null;
}

export interface SupplierReturn {
  id: string;
  number: number | null;
  supplierId: string | null;
  supplierName: string;
  status: SupplierReturnStatus;
  supplierInvoiceNumber: string | null;
  authorizationNumber: string | null;
  creditNoteNumber: string | null;
  totalCost: number;
  creditAmount: number | null;
  sentAt: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
  items: SupplierReturnItem[];
}

export interface SupplierReturnInput {
  supplierId?: string | null;
  supplierName?: string | null;
  supplierInvoiceNumber?: string | null;
  authorizationNumber?: string | null;
  notes?: string | null;
  items: SupplierReturnItem[];
}

export const SR_STATUS_LABEL: Record<SupplierReturnStatus, string> = {
  pending: 'Por enviar', sent: 'Enviada', credited: 'Crédito recibido', partial: 'Crédito parcial', rejected: 'Rechazada', cancelled: 'Anulada',
};
export const SR_STATUS_CLS: Record<SupplierReturnStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  credited: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
};
export const SR_REASON_LABEL: Record<SupplierReturnReason, string> = {
  damaged: 'Dañado', defective: 'Defectuoso', expired: 'Vencido', wrong: 'Error en el pedido', other: 'Otro',
};

export const supplierReturnsService = {
  list: (params?: { status?: string; supplierId?: string; q?: string }) => api.get<SupplierReturn[]>('/supplier-returns', params as any),
  get: (id: string) => api.get<SupplierReturn>(`/supplier-returns/${id}`),
  create: (data: SupplierReturnInput) => api.post<SupplierReturn>('/supplier-returns', data),
  update: (id: string, data: SupplierReturnInput) => api.put<SupplierReturn>(`/supplier-returns/${id}`, data),
  setStatus: (id: string, data: { status: SupplierReturnStatus; creditAmount?: number | null; creditNoteNumber?: string | null; authorizationNumber?: string | null; note?: string | null }) =>
    api.post<SupplierReturn>(`/supplier-returns/${id}/status`, data),
  remove: (id: string) => api.delete<{ ok: true }>(`/supplier-returns/${id}`),
};
