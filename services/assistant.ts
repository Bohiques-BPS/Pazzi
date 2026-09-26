import { api } from './api';

export interface PmProposedAction {
  type: 'create_task' | 'move_task' | 'delete_task';
  label: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  title?: string;
  description?: string;
  status?: string;
  from?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
}

export interface PmExecResult { ok: boolean; label: string; error?: string }

export const assistantService = {
  /** Interpreta la orden (voz/texto) y devuelve las acciones propuestas (no ejecuta). */
  interpret: (message: string, projectId?: string) =>
    api.post<{ reply: string; actions: PmProposedAction[] }>('/assistant/pm/interpret', { message, projectId }),
  /** Ejecuta las acciones ya confirmadas por el usuario. */
  execute: (actions: PmProposedAction[]) =>
    api.post<{ results: PmExecResult[]; done: number; failed: number }>('/assistant/pm/execute', { actions }),
};
