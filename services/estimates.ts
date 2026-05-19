import { api } from './api';

export const estimatesService = {
  getAll: (filters?: { clientId?: string; status?: string; branchId?: string }) =>
    api.get<any[]>('/estimates', filters as any),
  create: (data: any) => api.post<any>('/estimates', data),
  updateStatus: (id: string, status: string) =>
    api.put<any>(`/estimates/${id}/status`, { status }),
};
