import { api, ApiError } from './api';

/** Estados de la orden (mismos strings que el backend). 'Recibido Parcial' es legado (solo lectura). */
export type SupplierOrderStatus =
  | 'Borrador'
  | 'Pedido'
  | 'Enviado'
  | 'Recibido Parcialmente'
  | 'Recibido Completo'
  | 'Cancelado'
  | 'Recibido Parcial';

export type SupplierPaymentStatus = 'No Pagado' | 'Pago Parcial' | 'Pagado Completo';

/** Estados que se pueden poner a mano. Los "Recibido*" SOLO los pone POST /:id/receive (mueve stock). */
export const SUPPLIER_ORDER_MANUAL_STATUSES = ['Borrador', 'Pedido', 'Enviado', 'Cancelado'] as const;
/** Al crear una orden: el backend no acepta nacer "Cancelado". */
export const SUPPLIER_ORDER_CREATE_STATUSES = ['Borrador', 'Pedido', 'Enviado'] as const;
/** Opciones del filtro por estado en los listados. */
export const SUPPLIER_ORDER_FILTER_STATUSES = [
  'Borrador', 'Pedido', 'Enviado', 'Recibido Parcialmente', 'Recibido Completo', 'Cancelado',
] as const;

/** true si la mercancía (toda o parte) ya entró al inventario. Acepta el legado 'Recibido Parcial'. */
export const isSupplierOrderReceived = (status?: string | null): boolean =>
  status === 'Recibido Parcialmente' || status === 'Recibido Completo' || status === 'Recibido Parcial';

/** Normaliza el estado para mostrarlo (el legado 'Recibido Parcial' se muestra como 'Recibido Parcialmente'). */
export const displaySupplierOrderStatus = (status?: string | null): string =>
  status === 'Recibido Parcial' ? 'Recibido Parcialmente' : (status || '—');

/** Normaliza el estado de pago (legado local 'Pagado Parcialmente' → 'Pago Parcial'). */
export const displaySupplierPaymentStatus = (status?: string | null): string =>
  status === 'Pagado Parcialmente' ? 'Pago Parcial' : (status || 'No Pagado');

/** Pendiente por recibir de una línea. */
export const supplierItemPending = (item: { quantityOrdered: number; quantityReceived?: number | null }): number =>
  Math.max(0, (item.quantityOrdered || 0) - (item.quantityReceived || 0));

/** Totales de recepción de una orden (para barras de progreso / habilitar "Recibir"). */
export const supplierOrderReceiveProgress = (order: { items?: Array<{ quantityOrdered: number; quantityReceived?: number | null }> }) => {
  const items = order.items || [];
  const ordered = items.reduce((s, i) => s + (i.quantityOrdered || 0), 0);
  const received = items.reduce((s, i) => s + Math.min(i.quantityOrdered || 0, i.quantityReceived || 0), 0);
  return { ordered, received, pending: Math.max(0, ordered - received), pct: ordered > 0 ? Math.round((received / ordered) * 100) : 0 };
};

/** Fecha de día: el backend la envía como ISO completo; se toma "YYYY-MM-DD" a mediodía para que la
 *  zona horaria no la corra un día. Devuelve null si no es válida. */
export const parseSupplierOrderDay = (v?: string | null): Date | null => {
  if (!v) return null;
  const d = new Date(String(v).slice(0, 10) + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
};

/** "YYYY-MM-DD" para <input type="date"> a partir de un ISO completo. */
export const toDateInputValue = (v?: string | null): string => (v ? String(v).slice(0, 10) : '');

/**
 * Mensaje para un error del API. Devuelve null si el toast global (useApiErrorToasts) ya lo mostró
 * (403/404/409/410/429/5xx), para no duplicar toasts.
 */
export const apiErrorMessage = (err: unknown, fallback: string): string | null => {
  if (err instanceof ApiError) {
    const s = err.status;
    if (s === 403 || s === 404 || s === 409 || s === 410 || s === 429 || s >= 500) return null;
    return err.message || fallback;
  }
  return fallback;
};

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

export interface SupplierPaymentNoteRecord {
  id: string;
  note: string;
  createdAt: string;
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
    quantityReceived: number;
    unitCost: number;
    product?: { id: string; name: string };
  }>;
  paymentNotes?: SupplierPaymentNoteRecord[];
}

/** Estado de una línea de la orden según el documento del proveedor (relativo a lo pendiente). */
export type SupplierScanStatus = 'complete' | 'partial' | 'missing' | 'over';

/** Conciliación documento del proveedor ↔ orden (POST /:id/receive/scan). No mueve inventario. */
export interface SupplierOrderScanResult {
  document: { number: string | null; date: string | null; supplierName: string | null; total: number | null };
  items: Array<{
    itemId: string;
    productName: string;
    ordered: number;
    alreadyReceived: number;
    pending: number;
    inDocument: number;
    /** min(inDocument, pending), entero. */
    suggestedReceive: number;
    status: SupplierScanStatus;
    /** 'code' = código exacto; 'ai' = asociado por descripción (verificar); null = no está en el documento. */
    matchedBy: 'code' | 'ai' | null;
    orderUnitCost: number;
    documentUnitCost: number | null;
    costChanged: boolean;
  }>;
  /** Renglones del documento que no corresponden a la orden. */
  extras: Array<{ code: string | null; description: string | null; quantity: number | null; unitCost: number | null }>;
  warnings: string[];
}

export const supplierOrdersService = {
  getAll: (filters?: { supplierId?: string; limit?: number }) =>
    api.get<SupplierOrderRecord[]>('/supplier-orders', { limit: 300, ...(filters || {}) } as any),

  create: (data: SupplierOrderPayload) =>
    api.post<SupplierOrderRecord>('/supplier-orders', data),

  update: (id: string, data: Partial<SupplierOrderPayload>) =>
    api.put<SupplierOrderRecord>(`/supplier-orders/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/supplier-orders/${id}`),

  /** Solo estados manuales (Borrador/Pedido/Enviado/Cancelado). 400 USE_RECEIVE / ALREADY_RECEIVED. */
  updateStatus: (id: string, status: SupplierOrderStatus) =>
    api.put<SupplierOrderRecord>(`/supplier-orders/${id}/status`, { status }),

  /**
   * Recibe mercancía (total o parcial): suma stock en la sucursal destino y crea logs SUPPLIER_RECEPTION.
   * Sin `items` recibe todo lo pendiente. 409 RECEIVE_CONFLICT si otra persona recibió a la vez.
   */
  receive: (id: string, data: { branchId: string; notes?: string; items?: Array<{ itemId: string; quantity: number }> }) =>
    api.post<{ order: SupplierOrderRecord; message: string }>(
      `/supplier-orders/${id}/receive`,
      data
    ),

  /**
   * Lee el documento del proveedor (PDF o foto, máx. 10 MB) y lo compara con la orden.
   * Solo sugiere cantidades. 503 AI_NOT_CONFIGURED / 502 SCAN_FAILED / 413 FILE_TOO_LARGE.
   */
  scanReceiptDocument: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload<SupplierOrderScanResult>(`/supplier-orders/${id}/receive/scan`, fd);
  },

  /** Registra un pago al proveedor (atómico). 400 PAYMENT_OVERFLOW si excede el saldo. */
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
