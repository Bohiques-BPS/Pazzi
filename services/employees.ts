import { api } from './api';
import type { EmployeePermissions, UserStatus } from '../types';

export interface EmployeePayload {
  name: string;
  lastName: string;
  email: string;
  role: string;
  hireDate?: string | null;
  address?: string | null;
  phone?: string | null;
  department?: string | null;
  salary?: number | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  socialSecurityNumber?: string | null;
  profilePictureUrl?: string | null;
  pin?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  /** Si true, crea un User vinculado y dispara invitación por email. */
  enableLogin?: boolean;
  /** Permisos a otorgar al User vinculado (ignored si enableLogin=false). */
  permissions?: EmployeePermissions;
}

export interface EmployeeRecord extends EmployeePayload {
  id: string;
  userId?: string | null;
  user?: {
    id: string;
    email: string;
    status: UserStatus;
    lastLoginAt?: string | null;
    permissions?: { permissions: EmployeePermissions };
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const employeesService = {
  getAll: () => api.get<EmployeeRecord[]>('/employees'),
  getById: (id: string) => api.get<EmployeeRecord>(`/employees/${id}`),
  create: (data: EmployeePayload) => api.post<EmployeeRecord>('/employees', data),
  update: (id: string, data: Partial<EmployeePayload>) => api.put<EmployeeRecord>(`/employees/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/employees/${id}`),
};
