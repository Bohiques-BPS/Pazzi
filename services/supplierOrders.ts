import { api } from './api';

export type SupplierOrderStatus =
  | 'Borrador'
  | 'Pendiente'
  | 'Enviado'
  | 'Recibido Parcial'
  | 'Recibido Completo'
  | 'Cancelado';

export type SupplierPaymentStatus = 'No Pagado' | 'Pago Parcial' | 'Pagado Completo';

export interface SupplierOrderItemPayload {
  productId: string;
  quantityOrdered: number;
  unitCost: number;
}

export interface SupplierOrderPayload {
  supplierId: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  status?: SupplierOrderStatus;
  items: SupplierOrderItemPayload[];
}

export interface SupplierOrderRecord {
  id: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: SupplierOrderStatus;
  totalCost: number;
  amountPaid: number;
  paymentStatus: SupplierPaymentStatus;
  storeOwnerId: string;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string; email: string };
  items: Array<{
    id: string;
    productId: string;
    quantityOrdered: number;
    unitCost: number;
    product?: { id: string; name: string };
  }>;
  paymentNotes?: Array<{ id: string; note: string; createdAt: string }>;
}

export const supplierOrdersService = {
  getAll: (filters?: { supplierId?: string }) =>
    api.get<SupplierOrderRecord[]>('/supplier-orders', filters as any),

  create: (data: SupplierOrderPayload) =>
    api.post<SupplierOrderRecord>('/supplier-orders', data),

  update: (id: string, data: Partial<SupplierOrderPayload>) =>
    api.put<SupplierOrderRecord>(`/supplier-orders/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/supplier-orders/${id}`),

  updateStatus: (id: string, status: SupplierOrderStatus) =>
    api.put<SupplierOrderRecord>(`/supplier-orders/${id}/status`, { status }),

  /** Recibe la orden completa: incrementa stock en la sucursal destino y crea logs SUPPLIER_RECEPTION. */
  receive: (id: string, data: { branchId: string; notes?: string }) =>
    api.post<{ order: SupplierOrderRecord; message: string }>(
      `/supplier-orders/${id}/receive`,
      data
    ),

  /** Registra un pago al proveedor. Crea SupplierPaymentNote y recomputa paymentStatus. */
  recordPayment: (id: string, data: { amount: number; note?: string }) =>
    api.post<{
      order: SupplierOrderRecord;
      payment: {
        amount: number;
        note: string;
        newAmountPaid: number;
        paymentStatus: SupplierPaymentStatus;
      };
    }>(`/supplier-orders/${id}/payments`, data),
};
