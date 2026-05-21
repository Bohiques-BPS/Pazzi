import { api } from './api';
import type { User, UserRole } from '../types';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface InvitationInfo {
  email: string;
  name: string;
  lastName: string;
  expiresAt: string;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string; lastName: string; role?: UserRole }) =>
    api.post<AuthResponse>('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }, { skipAuthRefresh: true }),

  logout: () => api.post<{ message: string }>('/auth/logout'),

  me: () => api.get<User>('/auth/verify'),

  updatePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/update-password', { currentPassword, newPassword }),

  verifyPin: (pin: string) => api.post<{ valid: boolean }>('/auth/verify-pin', { pin }),

  verifySupervisorPin: (pin: string) =>
    api.post<{ valid: true; manager: { id: string; name: string; lastName: string; email: string } }>(
      '/auth/verify-supervisor-pin',
      { pin }
    ),

  getInvitation: (token: string) =>
    api.get<InvitationInfo>(`/auth/invitation/${encodeURIComponent(token)}`),

  activate: (token: string, password: string) =>
    api.post<AuthResponse>('/auth/activate', { token, password }),

  resendInvitation: (employeeId: string) =>
    api.post<{ message: string; expiresAt: string }>('/auth/resend-invitation', { employeeId }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<AuthResponse>('/auth/reset-password', { token, password }),
};
