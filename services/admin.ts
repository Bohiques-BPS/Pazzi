import { api } from './api';

export interface AdminUser {
    id: string;
    name: string;
    lastName: string;
    email: string;
    status: 'ACTIVE' | 'DISABLED' | 'INVITED';
    createdAt: string;
    lastLoginAt?: string | null;
    twoFactorEnabled?: boolean;
}

export const adminService = {
    listManagers: () => api.get<AdminUser[]>('/admin/managers'),
    updateManager: (id: string, data: Partial<{ name: string; lastName: string; email: string; status: string; password: string }>) =>
        api.put<AdminUser>(`/admin/managers/${id}`, data),
    resetTwoFactor: (id: string) => api.post<{ reset: boolean }>(`/admin/managers/${id}/reset-2fa`, {}),
    deleteManager: (id: string) => api.delete<{ message: string }>(`/admin/managers/${id}`),
};
