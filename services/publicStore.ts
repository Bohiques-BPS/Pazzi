import { api } from './api';

export interface PublicProduct {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  ivuRate?: number | null;
  category?: { id: string; name: string } | null;
  totalStock: number;
}

export interface PublicProductDetail extends PublicProduct {
  variations?: Array<{ id: string; name: string; sku?: string | null; unitPrice: number }>;
  stockByBranch: Array<{ branchId: string; quantity: number }>;
  isActive: boolean;
  displayOnScreen: boolean;
}

export interface PublicStoreSettings {
  id: string;
  storeOwnerId: string;
  storeName: string;
  logoUrl?: string | null;
  template: string;
  primaryColor: string;
}

export interface PublicOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PublicOrderPayload {
  storeOwnerId: string;
  clientName: string;
  clientEmail: string;
  shippingAddress: string;
  city?: string;
  postalCode?: string;
  paymentMethod?: string;
  clientId?: string;
  items: PublicOrderItemPayload[];
}

export interface PublicOrderRecord {
  id: string;
  date: string;
  clientName: string;
  clientEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: { id: string; name: string; imageUrl?: string };
  }>;
}

export const publicStoreService = {
  getProducts: (filters?: { storeOwnerId?: string; categoryId?: string; search?: string; limit?: number }) =>
    api.get<PublicProduct[]>('/public/products', filters as any),

  getProduct: (id: string) => api.get<PublicProductDetail>(`/public/products/${id}`),

  getStoreSettings: (storeOwnerId: string) =>
    api.get<PublicStoreSettings>(`/public/store/${storeOwnerId}`),

  createOrder: (data: PublicOrderPayload) =>
    api.post<{ order: PublicOrderRecord; message: string }>('/public/orders', data),

  getOrder: (id: string, email: string) =>
    api.get<PublicOrderRecord>(`/public/orders/${id}`, { email }),
};
