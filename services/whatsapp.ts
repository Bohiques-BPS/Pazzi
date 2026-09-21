import { api } from './api';

export interface WhatsappConfig {
  enabled: boolean;
  phoneNumberId: string;
  verifyToken: string;
  wabaId: string;
  displayNumber: string;
  graphVersion: string;
  hasAccessToken: boolean;
  accessTokenMasked: string;
  webhookUrl?: string;
}

export interface WhatsappConfigInput {
  enabled?: boolean;
  phoneNumberId?: string;
  /** Solo se manda si el gerente escribió uno nuevo; vacío = conservar el actual. */
  accessToken?: string;
  verifyToken?: string;
  wabaId?: string;
  displayNumber?: string;
  graphVersion?: string;
}

export const whatsappService = {
  /** Configuración de la tienda (token enmascarado). Requiere permiso de gerente. */
  getConfig: () => api.get<WhatsappConfig>('/whatsapp/config'),
  /** Crea/actualiza la configuración. Requiere permiso de gerente. */
  updateConfig: (data: WhatsappConfigInput) => api.put<WhatsappConfig>('/whatsapp/config', data),
  /** ¿La tienda tiene WhatsApp activo? (para mostrar el toggle en el chat). */
  getEnabled: () => api.get<{ enabled: boolean }>('/whatsapp/enabled'),
};
