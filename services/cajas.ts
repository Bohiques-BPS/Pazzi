import { api } from './api';

export const cajasService = {
  getAll: (branchId?: string) =>
    api.get<any[]>('/cajas', branchId ? { branchId } : undefined),
  create: (data: any) => api.post<any>('/cajas', data),
  update: (id: string, data: any) => api.put<any>(`/cajas/${id}`, data),
};
