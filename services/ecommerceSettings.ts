import { api } from './api';
import type { ECommerceSettings } from '../types';

/** Settings de la tienda online del dueño (persisten en el backend). */
export const ecommerceSettingsService = {
  getMine: () => api.get<ECommerceSettings>('/ecommerce/settings'),
  updateMine: (data: Partial<ECommerceSettings>) =>
    api.put<ECommerceSettings>('/ecommerce/settings', data),
  /** Settings públicos de una tienda (para el storefront). */
  getPublic: (storeOwnerId: string) =>
    api.get<ECommerceSettings>(`/public/store/${storeOwnerId}`),
};
