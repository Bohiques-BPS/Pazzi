import { api } from './api';

export interface LookupItem {
  id: string;
  name: string;
  createdAt: string;
}

export const employeePositionsService = {
  getAll: () => api.get<LookupItem[]>('/employee-positions'),
  create: (name: string) => api.post<LookupItem>('/employee-positions', { name }),
  delete: (id: string) => api.delete<{ message: string }>(`/employee-positions/${id}`),
};

export const employeeDepartmentsService = {
  getAll: () => api.get<LookupItem[]>('/employee-departments'),
  create: (name: string) => api.post<LookupItem>('/employee-departments', { name }),
  delete: (id: string) => api.delete<{ message: string }>(`/employee-departments/${id}`),
};
