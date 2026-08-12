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

export const timeclockService = {
    punch: (identifier: string, pin: string) =>
        api.post<PunchResult>('/timeclock/punch', { identifier, pin }),
    list: (filters?: { employeeId?: string; startDate?: string; endDate?: string }) =>
        api.get<TimeClockPunch[]>('/timeclock', filters as any),
};
