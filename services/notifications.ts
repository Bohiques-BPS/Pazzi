import { api } from './api';
import type { Notification } from '../types';

export interface NotificationsPage {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export const notificationsService = {
  /** Listado paginado (para la página "Ver todas"). */
  listPaged: (page = 1, pageSize = 20) =>
    api.get<NotificationsPage>('/notifications', { page, pageSize } as any),

  markRead: (id: string) => api.put<{ message: string }>(`/notifications/${id}/read`, {}),

  markAllRead: () => api.put<{ message: string }>('/notifications/read-all', {}),
};
