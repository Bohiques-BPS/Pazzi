import { api } from './api';

export interface ChatMessageRecord {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'video' | 'file' | null;
  attachmentName?: string | null;
  /** Foto del remitente (o logo del negocio si es el gerente); null = iniciales. */
  senderAvatarUrl?: string | null;
  /** Presente solo en la respuesta de envío: resultado del reenvío opcional a WhatsApp. */
  whatsapp?: { requested: boolean; sent: boolean; reason?: string };
}

export interface ChatLastMessage {
  senderId: string;
  senderName: string;
  text: string; // texto plano corto
  attachmentType?: 'image' | 'video' | 'file' | null;
  timestamp: string;
}

export interface ChatOverviewRow {
  projectId: string;
  lastMessageAt: string | null;
  /** Mensajes de otros posteriores a lo último leído por el usuario (marca en el servidor). */
  unreadCount: number;
  lastMessage: ChatLastMessage | null;
}

export const chatService = {
  getMessages: (projectId: string) =>
    api.get<ChatMessageRecord[]>(`/chat/${encodeURIComponent(projectId)}`),

  sendMessage: (data: { projectId: string; text: string; senderName: string; attachmentUrl?: string | null; attachmentType?: 'image' | 'video' | 'file' | null; attachmentName?: string | null; sendWhatsapp?: boolean }) =>
    api.post<ChatMessageRecord>('/chat', data),

  /** Último mensaje + conteo por proyecto (para el indicador de no leídos). */
  getOverview: () => api.get<ChatOverviewRow[]>('/chat/overview'),

  /** Marca leídas las notificaciones (campanita) de chat de un proyecto para el usuario actual. */
  markRead: (projectId: string) => api.post<{ ok: boolean }>(`/chat/${encodeURIComponent(projectId)}/read`, {}),

  /** Migra (una vez) lo leído guardado en el navegador a la marca del servidor. */
  syncReads: (reads: Record<string, number>) => api.post<{ ok: boolean; created: number }>('/chat/reads/sync', { reads }),
};
