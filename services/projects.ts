import { api } from './api';
import type { Project } from '../types';

/** Normaliza la respuesta del backend (relaciones Prisma) al shape que espera el FE */
export function normalizeProjectFromApi(p: any): Project {
    return {
        ...p,
        assignedEmployeeIds: Array.isArray(p.employees)
            ? p.employees.map((e: any) => e.userId)
            : (Array.isArray(p.assignedEmployeeIds) ? p.assignedEmployeeIds : []),
        assignedProducts: Array.isArray(p.resources)
            ? p.resources.map((r: any) => ({ productId: r.productId, quantity: r.quantity }))
            : (Array.isArray(p.assignedProducts) ? p.assignedProducts : []),
        customProducts: Array.isArray(p.customResources)
            ? p.customResources
            : (Array.isArray(p.customProducts) ? p.customProducts : []),
        workDays: Array.isArray(p.workDays)
            ? p.workDays.map((w: any) => typeof w === 'string' ? w : new Date(w.date).toISOString().split('T')[0])
            : [],
        workDayTimeRanges: Array.isArray(p.workDayRanges)
            ? p.workDayRanges.map((r: any) => ({
                date: new Date(r.date).toISOString().split('T')[0],
                startTime: r.startTime,
                endTime: r.endTime,
            }))
            : (Array.isArray(p.workDayTimeRanges) ? p.workDayTimeRanges : []),
        visitDate: p.visitDate
            ? (typeof p.visitDate === 'string' ? p.visitDate.split('T')[0] : new Date(p.visitDate).toISOString().split('T')[0])
            : '',
        workStartDate: p.workStartDate
            ? (typeof p.workStartDate === 'string' ? p.workStartDate.split('T')[0] : new Date(p.workStartDate).toISOString().split('T')[0])
            : '',
        workEndDate: p.workEndDate
            ? (typeof p.workEndDate === 'string' ? p.workEndDate.split('T')[0] : new Date(p.workEndDate).toISOString().split('T')[0])
            : '',
    };
}

export interface ProjectActivityItem {
    id: string;
    /** PROJECT_CREATED | TASK_CREATED | TASK_MOVED | TASK_UPDATED | TASK_ASSIGNED | TASK_UNASSIGNED | TASK_DELETED | TASK_COMMENT | EMPLOYEE_ASSIGNED | EMPLOYEE_UNASSIGNED | VISIT_CREATED | MEETING_CREATED | INVOICE_GENERATED | CHAT_MESSAGE */
    type: string;
    at: string;
    actorName?: string | null;
    title: string;
    description?: string;
    meta?: any;
}

export const projectsService = {
  getAll: (filters?: { status?: string; clientId?: string; employeeId?: string }) =>
    api.get<any[]>('/projects', filters as any),
  getById: (id: string) => api.get<any>(`/projects/${id}`),
  create: (data: any) => api.post<any>('/projects', data),
  update: (id: string, data: any) => api.put<any>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<any>(`/projects/${id}`),
  generateInvoice: (id: string, data?: any) =>
    api.post<any>(`/projects/${id}/invoice`, data),
  /** Histórico del proyecto (timeline combinado: derivado + bitácora). */
  getActivity: (id: string) =>
    api.get<ProjectActivityItem[]>(`/projects/${id}/activity`),
  /** Analiza un documento/transcripción y devuelve posibles tareas (no crea nada). */
  extractTasks: (id: string, transcript: string) =>
    api.post<{ suggestions: { title: string; description?: string; assigneeHint?: string; dueDateHint?: string; priority?: 'low' | 'medium' | 'high' | 'urgent' }[] }>(`/projects/${id}/extract-tasks`, { transcript }),
};
