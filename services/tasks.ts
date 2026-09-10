import { api } from './api';

// OJO: deben coincidir EXACTO con el enum TaskStatus de types.ts (así los filtra el tablero).
export type TaskStatus = 'Tareas por realizar' | 'En progreso' | 'Para aprobar' | 'Hecho';

export interface TaskPayload {
  title: string;
  description?: string;
  projectId?: string;
  status?: TaskStatus;
  section?: string | null;
  assignedEmployeeIds?: string[];
  order?: number;
  archived?: boolean;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
  /** Recordatorio programado (ISO) o null para desactivarlo. */
  remindAt?: string | null;
  /** Subtarea: id de la tarea padre. */
  parentTaskId?: string | null;
}

export interface TaskCommentRecord {
  id: string;
  taskId: string;
  senderId: string;
  text: string;
  timestamp: string;
  senderName?: string;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  text: string;
  checked: boolean;
  order: number;
  assignedUserId?: string | null;
}

/** Sugerencia de la IA sobre cómo resolver una tarea. */
export interface TaskSolution {
  approach: string;
  steps: string[];
  tips?: string[];
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

  /** Tareas asignadas al usuario conectado (todos los proyectos), ordenadas por vencimiento. */
  getMine: (opts?: { includeDone?: boolean }) =>
    api.get<any[]>('/tasks/mine', opts?.includeDone ? { includeDone: '1' } : undefined),

  create: (data: TaskPayload) => api.post<TaskRecord>('/tasks', data),

  /** Crea varias tareas en una sola llamada (ej. las sugeridas por la IA). */
  createBulk: (data: { projectId: string; tasks: TaskPayload[] }) =>
    api.post<{ created: number; tasks: TaskRecord[] }>('/tasks/bulk', data),

  update: (id: string, data: Partial<TaskPayload>) =>
    api.put<TaskRecord>(`/tasks/${id}`, data),

  addComment: (id: string, text: string) =>
    api.post<TaskCommentRecord>(`/tasks/${id}/comments`, { text }),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/tasks/${id}`),

  /** Sugerencia de la IA sobre cómo resolver la tarea (enfoque + pasos + consejos). */
  suggestSolution: (id: string) =>
    api.post<TaskSolution>(`/tasks/${id}/ai-suggest`, {}),

  /** Notifica a los encargados del proyecto que la tarea necesita aprobación. */
  requestApproval: (id: string) =>
    api.post<{ notified: number }>(`/tasks/${id}/request-approval`, {}),

  addChecklistItem: (taskId: string, text: string, assignedUserId?: string | null) =>
    api.post<ChecklistItem>(`/tasks/${taskId}/checklist`, assignedUserId ? { text, assignedUserId } : { text }),

  updateChecklistItem: (taskId: string, itemId: string, data: Partial<Pick<ChecklistItem, 'text' | 'checked' | 'assignedUserId'>>) =>
    api.put<ChecklistItem>(`/tasks/${taskId}/checklist/${itemId}`, data),

  deleteChecklistItem: (taskId: string, itemId: string) =>
    api.delete<{ message: string }>(`/tasks/${taskId}/checklist/${itemId}`),
};
