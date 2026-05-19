import { api } from './api';

export const projectsService = {
  getAll: (filters?: { status?: string; clientId?: string; employeeId?: string }) =>
    api.get<any[]>('/projects', filters as any),
  getById: (id: string) => api.get<any>(`/projects/${id}`),
  create: (data: any) => api.post<any>('/projects', data),
  update: (id: string, data: any) => api.put<any>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<any>(`/projects/${id}`),
  generateInvoice: (id: string, data?: any) =>
    api.post<any>(`/projects/${id}/invoice`, data),
};
