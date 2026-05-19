import { api } from './api';

export const clientsService = {
  getAll: (filters?: { search?: string; clientType?: string; isActive?: boolean }) =>
    api.get<any[]>('/clients', filters as any),

  getById: (id: string) =>
    api.get<any>(`/clients/${id}`),

  getSummary: (id: string) =>
    api.get<any>(`/clients/${id}/summary`),

  create: (data: any) =>
    api.post<any>('/clients', data),

  update: (id: string, data: any) =>
    api.put<any>(`/clients/${id}`, data),

  delete: (id: string) =>
    api.delete<any>(`/clients/${id}`),
};
