import { api } from './api';

export interface PunchResult {
    id: string;
    type: 'IN' | 'OUT';
    employeeName: string;
    punchedAt: string;
}

export interface TimeClockPunch {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'IN' | 'OUT';
    punchedAt: string;
}

export interface IdentifyResult {
    ok: boolean;
    employeeId: string;
    userId: string | null;
    name: string;
    lastName: string;
    employeeNumber?: number | null;
}

export const timeclockService = {
    /** Ponche automático del usuario conectado (sin PIN). */
    punchSelf: () => api.post<PunchResult>('/timeclock/punch/self', {}),
    punch: (identifier: string, pin: string) =>
        api.post<PunchResult>('/timeclock/punch', { identifier, pin }),
    /** Identifica al cajero/operador por PIN (sin ponchar) para atribuir las ventas del turno. */
    identify: (pin: string, identifier?: string) =>
        api.post<IdentifyResult>('/timeclock/identify', { pin, ...(identifier ? { identifier } : {}) }),
    list: (filters?: { employeeId?: string; startDate?: string; endDate?: string }) =>
        api.get<TimeClockPunch[]>('/timeclock', filters as any),
};
