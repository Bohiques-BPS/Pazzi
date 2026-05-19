import { api } from './api';

export const branchesService = {
  getAll: () => api.get<any[]>('/branches'),
  getById: (id: string) => api.get<any>(`/branches/${id}`),
  create: (data: any) => api.post<any>('/branches', data),
  update: (id: string, data: any) => api.put<any>(`/branches/${id}`, data),
  delete: (id: string) => api.delete<any>(`/branches/${id}`),
};
