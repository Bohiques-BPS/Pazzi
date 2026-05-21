import { api } from './api';

export type InventoryLogType =
  | 'SALE_POS'
  | 'RETURN'
  | 'SUPPLIER_RECEPTION'
  | 'ADJUSTMENT_MANUAL'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'INITIAL_STOCK';

export interface InventoryLog {
  id: string;
  productId: string;
  branchId: string;
  date: string;
  type: InventoryLogType;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  referenceId?: string | null;
  employeeId: string;
  notes?: string | null;
  product?: { id: string; name: string };
  branch?: { id: string; name: string };
  employee?: { id: string; name: string; lastName: string };
}

export interface InventoryLogFilters {
  productId?: string;
  branchId?: string;
  type?: InventoryLogType;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

export interface CurrentStockItem {
  id: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  category?: { id: string; name: string } | null;
  stockByBranch: Array<{
    branchId: string;
    quantity: number;
    branch?: { id: string; name: string };
  }>;
  totalStock: number;
  inventoryValue: number;
  isLowStock: boolean;
}

export interface CurrentStockSummary {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  lowStockCount: number;
}

export interface AdjustStockPayload {
  branchId: string;
  /** Cantidad a sumar (positiva) o restar (negativa). NO es el stock total nuevo. */
  quantity: number;
  type?: InventoryLogType;
  notes?: string;
}

export interface TransferStockPayload {
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
}

export const inventoryService = {
  /** Ajustar stock (sumar/restar) en una sucursal. Crea InventoryLog. */
  adjustStock: (productId: string, data: AdjustStockPayload) =>
    api.post<{
      stockBefore: number;
      stockAfter: number;
      quantityChange: number;
      log: InventoryLog;
    }>(`/products/${productId}/adjust-stock`, data),

  /** Transferir stock entre sucursales. Crea TRANSFER_OUT + TRANSFER_IN. */
  transferStock: (productId: string, data: TransferStockPayload) =>
    api.post<{
      message: string;
      from: { branchId: string; branchName: string; stockAfter: number };
      to: { branchId: string; branchName: string; stockAfter: number };
    }>(`/products/${productId}/transfer-stock`, data),

  /** Listar movimientos de inventario con filtros y paginación. */
  getLogs: (filters?: InventoryLogFilters) =>
    api.get<{ items: InventoryLog[]; total: number }>('/inventory/logs', filters as any),

  /** Snapshot consolidado de stock actual. */
  getCurrentStock: (params?: { branchId?: string; lowStockThreshold?: number }) =>
    api.get<{ items: CurrentStockItem[]; summary: CurrentStockSummary }>(
      '/inventory/stock',
      params as any
    ),
};
