import { api } from './api';

export type VisitStatus = 'Programado' | 'En Curso' | 'Completado' | 'Cancelado';

export interface VisitPayload {
  title: string;
  projectId?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  status?: VisitStatus;
  notes?: string;
  assignedEmployeeIds?: string[];
}

export interface VisitRecord {
  id: string;
  title: string;
  projectId?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  status: VisitStatus;
  notes?: string | null;
  project?: { id: string; name: string } | null;
  employees: Array<{
    userId: string;
    user?: { id: string; name: string; lastName: string };
  }>;
}

export const visitsService = {
  getAll: (filters?: { projectId?: string; status?: VisitStatus; startDate?: string; endDate?: string }) =>
    api.get<VisitRecord[]>('/visits', filters as any),

  create: (data: VisitPayload) => api.post<VisitRecord>('/visits', data),

  update: (id: string, data: Partial<VisitPayload>) =>
    api.put<VisitRecord>(`/visits/${id}`, data),
};
