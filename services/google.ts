import { api } from './api';

export interface GoogleStatus {
    connected: boolean;
    email: string | null;
    configured: boolean; // el servidor tiene credenciales OAuth
}

export const googleService = {
    status: () => api.get<GoogleStatus>('/google/status'),
    connectUrl: () => api.get<{ url: string }>('/google/connect'),
    disconnect: () => api.post<{ ok: boolean }>('/google/disconnect', {}),
};
