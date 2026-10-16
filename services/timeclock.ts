import { api } from './api';

export type PunchType = 'IN' | 'LUNCH_OUT' | 'LUNCH_IN' | 'OUT';

export interface PunchResult {
    id: string;
    type: PunchType;
    employeeName: string;
    punchedAt: string;
    nextActions?: PunchType[];
    complete?: boolean;
}

export interface TimeClockPunch {
    id: string;
    employeeId: string;
    employeeName: string;
    type: PunchType;
    punchedAt: string;
}

/** Estado de la jornada de hoy del usuario conectado (para el modal de ponche). */
export interface TodayState {
    employeeName: string;
    businessDay: string;
    punches: { type: PunchType; punchedAt: string }[];
    nextActions: PunchType[];
    complete: boolean;
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
    /** Ponche del usuario conectado (sin PIN). `type` = fase a registrar (de las permitidas hoy). */
    punchSelf: (type?: PunchType) => api.post<PunchResult>('/timeclock/punch/self', type ? { type } : {}),
    /** Estado del día del usuario conectado: fases ya ponchadas + próxima acción permitida. */
    selfToday: () => api.get<TodayState>('/timeclock/self/today'),
    punch: (identifier: string, pin: string, type?: PunchType) =>
        api.post<PunchResult>('/timeclock/punch', { identifier, pin, ...(type ? { type } : {}) }),
    /** Identifica al cajero/operador por PIN (sin ponchar) para atribuir las ventas del turno. */
    identify: (pin: string, identifier?: string) =>
        api.post<IdentifyResult>('/timeclock/identify', { pin, ...(identifier ? { identifier } : {}) }),
    list: (filters?: { employeeId?: string; startDate?: string; endDate?: string }) =>
        api.get<TimeClockPunch[]>('/timeclock', filters as any),
};

/** Etiqueta legible de cada fase del ponche. */
export const PUNCH_LABELS: Record<PunchType, string> = {
    IN: 'Entrada',
    LUNCH_OUT: 'Salida a almuerzo',
    LUNCH_IN: 'Regreso de almuerzo',
    OUT: 'Salida',
};
