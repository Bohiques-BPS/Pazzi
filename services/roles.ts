import { api } from './api';

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
  _count?: { users: number };
}

export const rolesService = {
  getAll: () => api.get<Role[]>('/roles'),
  create: (data: { name: string; permissions: Record<string, boolean> }) => api.post<Role>('/roles', data),
  update: (id: string, data: { name?: string; permissions?: Record<string, boolean> }) =>
    api.put<Role>(`/roles/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/roles/${id}`),
};
