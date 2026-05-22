import { api } from './api';

export interface ChatMessageRecord {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export const chatService = {
  getMessages: (projectId: string) =>
    api.get<ChatMessageRecord[]>(`/chat/${encodeURIComponent(projectId)}`),

  sendMessage: (data: { projectId: string; text: string; senderName: string }) =>
    api.post<ChatMessageRecord>('/chat', data),
};
