import { api } from './api';

/** Control de Entregas (ventas del POS marcadas "para entrega"). */

export type DeliveryStatus = 'pending' | 'in_route' | 'partial' | 'delivered' | 'cancelled';
export type DeliveryBucket = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'unscheduled' | 'done' | 'cancelled';

export interface DeliveryItem {
  id: string; productId?: string | null; name: string;
  quantity: number; delivered: number; pending: number; order: number;
}
export interface DeliveryEvent {
  id: string; type: string; userId?: string | null; userName?: string | null;
  receivedBy?: string | null; quantities?: { itemId: string; name: string; quantity: number }[] | null;
  note?: string | null; createdAt: string;
}
export interface Delivery {
  id: string; number: number | null; saleId: string | null; saleNumber: number | null;
  clientId: string | null; clientName: string; clientEmail: string | null;
  contactName: string | null; contactPhone: string | null;
  street: string | null; city: string | null; state: string | null; zip: string | null;
  /** "YYYY-MM-DD" o null (sin programar). */
  scheduledDate: string | null; timeWindow: string | null;
  status: DeliveryStatus; bucket: DeliveryBucket; overdue: boolean;
  assignedUserId: string | null; assignedName: string | null;
  notes: string | null; publicToken: string;
  deliveredAt: string | null; deliveredByUserId: string | null; deliveredByName: string | null;
  pendingUnits: number;
  createdAt: string;
  items: DeliveryItem[];
  events?: DeliveryEvent[];
}

/** Datos para crear/editar (los mismos que pide la caja al marcar la venta "para entrega"). */
export interface DeliveryInput {
  scheduledDate?: string | null; timeWindow?: string | null;
  contactName?: string | null; contactPhone?: string | null;
  street?: string | null; city?: string | null; state?: string | null; zip?: string | null;
  notes?: string | null; assignedUserId?: string | null;
}

export interface DeliveryList { rows: Delivery[]; counts: Record<string, number> }

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pendiente', in_route: 'En ruta', partial: 'Entrega parcial', delivered: 'Entregada', cancelled: 'Cancelada',
};
/** Colores del estado: rojo pendiente, amarillo en ruta, verde entregada, naranja parcial. */
export const DELIVERY_STATUS_CLS: Record<DeliveryStatus, string> = {
  pending: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  in_route: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  partial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
};

export const deliveryAddress = (d: Pick<Delivery, 'street' | 'city' | 'state' | 'zip'>) =>
  [d.street, d.city, d.state, d.zip].filter(Boolean).join(', ');

export const deliveriesService = {
  list: (params: { bucket?: string; q?: string; assignedUserId?: string; mine?: boolean; clientId?: string; saleId?: string }) =>
    api.get<DeliveryList>('/deliveries', { ...params, mine: params.mine ? '1' : undefined } as any),
  get: (id: string) => api.get<Delivery>(`/deliveries/${id}`),
  staff: () => api.get<{ id: string; name: string }[]>('/deliveries/staff'),
  createFromSale: (saleId: string, data: DeliveryInput) => api.post<Delivery>(`/deliveries/from-sale/${saleId}`, data),
  update: (id: string, data: DeliveryInput) => api.put<Delivery>(`/deliveries/${id}`, data),
  setStatus: (id: string, status: 'in_route' | 'pending' | 'cancelled', note?: string) =>
    api.post<Delivery>(`/deliveries/${id}/status`, { status, note }),
  confirm: (id: string, data: { items: { id: string; quantity: number }[]; receivedBy?: string; note?: string; rescheduleDate?: string | null }) =>
    api.post<Delivery>(`/deliveries/${id}/confirm`, data),
  getPublic: (token: string) => api.get<any>(`/public/deliveries/${token}`),
};
