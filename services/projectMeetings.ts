import { api } from './api';

export interface ProjectMeeting {
    id: string;
    projectId: string;
    title: string;
    date: string;          // ISO
    startTime: string;     // HH:mm
    durationHours: number;
    employeeIds: string[];
    inviteClient: boolean;
    meetLink?: string | null;
    notes?: string | null;
    createdAt: string;
}

export interface ProjectMeetingInput {
    projectId: string;
    title: string;
    date: string;
    startTime: string;
    durationHours: number;
    employeeIds: string[];
    inviteClient: boolean;
    meetLink?: string | null;
    notes?: string | null;
}

export const projectMeetingsService = {
    list: (projectId: string) => api.get<ProjectMeeting[]>('/project-meetings', { projectId }),
    create: (data: ProjectMeetingInput) => api.post<ProjectMeeting>('/project-meetings', data),
    update: (id: string, data: Partial<ProjectMeetingInput>) => api.put<ProjectMeeting>(`/project-meetings/${id}`, data),
    delete: (id: string) => api.delete<{ message: string }>(`/project-meetings/${id}`),
};

/**
 * Construye un link "Añadir a Google Calendar" (sin OAuth): abre el calendario del usuario con el
 * evento pre-llenado. Al guardarlo, Google puede añadir un Google Meet automáticamente.
 */
export function googleCalendarLink(m: {
    title: string; date: string; startTime: string; durationHours: number; details?: string; guests?: string[];
}): string {
    // Fecha/hora local → formato UTC compacto YYYYMMDDTHHMMSSZ que espera Google Calendar.
    const [h, min] = (m.startTime || '00:00').split(':').map(Number);
    const start = new Date(m.date);
    start.setHours(h || 0, min || 0, 0, 0);
    const end = new Date(start.getTime() + (m.durationHours || 1) * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: m.title,
        dates: `${fmt(start)}/${fmt(end)}`,
        details: m.details || '',
    });
    (m.guests || []).filter(Boolean).forEach(g => params.append('add', g));
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
