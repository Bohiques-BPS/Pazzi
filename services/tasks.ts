import { api } from './api';

export type TaskStatus = 'Tareas por Realizar' | 'En Progreso' | 'Para Aprobar' | 'Hecho';

export interface TaskPayload {
  title: string;
  description?: string;
  projectId?: string;
  status?: TaskStatus;
  assignedEmployeeIds?: string[];
  order?: number;
  archived?: boolean;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
}

export interface TaskCommentRecord {
  id: string;
  taskId: string;
  senderId: string;
  text: string;
  timestamp: string;
  senderName?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string | null;
  projectId?: string | null;
  status: TaskStatus;
  assignedEmployeeIds: string[];
  order?: number;
  archived: boolean;
  comments?: TaskCommentRecord[];
  createdAt: string;
  updatedAt: string;
}

export const tasksService = {
  getAll: (filters?: { projectId?: string; status?: TaskStatus }) =>
    api.get<TaskRecord[]>('/tasks', filters as any),

  create: (data: TaskPayload) => api.post<TaskRecord>('/tasks', data),

  update: (id: string, data: Partial<TaskPayload>) =>
    api.put<TaskRecord>(`/tasks/${id}`, data),

  addComment: (id: string, text: string) =>
    api.post<TaskCommentRecord>(`/tasks/${id}/comments`, { text }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/tasks/${id}`),
};
