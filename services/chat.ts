import { api } from './api';

export interface ChatMessageRecord {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface ChatOverviewRow {
  projectId: string;
  lastMessageAt: string | null;
  count: number;
}

export const chatService = {
  getMessages: (projectId: string) =>
    api.get<ChatMessageRecord[]>(`/chat/${encodeURIComponent(projectId)}`),

  sendMessage: (data: { projectId: string; text: string; senderName: string }) =>
    api.post<ChatMessageRecord>('/chat', data),

  /** Último mensaje + conteo por proyecto (para el indicador de no leídos). */
  getOverview: () => api.get<ChatOverviewRow[]>('/chat/overview'),
};
