import { api } from './api';
import type { BusinessTerms } from './invoices';

export type RecurringMode = 'auto_charge' | 'invoice_link';
export type LinkMethod = 'agilpay' | 'ath';

/** Línea del plan recurrente (tipo factura). taxRate = fracción (0.115); 0 = exento; omitido = default del negocio. */
export interface RecurringItem {
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number | null;
}
export type PayState = 'approved' | 'declined' | 'error' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface RecurringCharge {
    id: string;
    date: string;
    amount: number;
    status: string;
    reference?: string | null;
    message?: string | null;
    // Enriquecido por el backend (modo invoice_link):
    payState?: PayState;
    invoiceId?: string | null;
    invoiceToken?: string | null;
    invoiceNumber?: number | null;
    invoicePaidAt?: string | null;
    invoiceTotal?: number | null;
    invoiceAmountPaid?: number | null;
    dueDate?: string | null;
}

export interface RecurringPayment {
    id: string;
    clientId: string;
    clientName: string;
    /** Proyecto vinculado (opcional): las facturas del plan quedan en la Facturación del proyecto. */
    projectId?: string | null;
    projectName?: string | null;
    mode: RecurringMode;
    cardLast4?: string | null;
    enrollToken?: string | null;
    clientEmail?: string | null;
    linkMethods?: string | null;   // "agilpay,ath"
    graceDays?: number;
    sendEmail?: boolean;           // enviar la factura por correo (modo invoice_link)
    amount: number;
    items?: RecurringItem[] | null;
    taxRate?: number | null;
    interval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    intervalCount?: number;
    monthlyDay?: number | null;
    retryEnabled?: boolean;
    maxRetries?: number;
    startDate?: string | null;
    endDate?: string | null;
    maxOccurrences?: number | null;
    occurrencesDone?: number;
    description?: string | null;
    status: 'active' | 'paused' | 'cancelled' | 'completed' | 'pending_card';
    deletedAt?: string | null;
    nextChargeDate: string;
    lastChargeAt?: string | null;
    lastResult?: string | null;
    failureCount: number;
    charges: RecurringCharge[];
    currentState?: PayState | null;
}

export interface CreateRecurringInput {
    clientId: string;
    projectId?: string | null;      // proyecto vinculado (opcional)
    mode: RecurringMode;
    amount?: number;                // opcional: si se envían `items`, el total se calcula del detalle
    items?: RecurringItem[];        // líneas tipo factura (producto/cantidad/precio/IVU)
    taxRate?: number | null;        // IVU por defecto para líneas sin tasa propia (fracción)
    interval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    intervalCount?: number;         // "Cada N" periodos
    monthlyDay?: number | null;     // día fijo del mes (mensual/trimestral/anual)
    retryEnabled?: boolean;         // reintentar cobros fallidos
    maxRetries?: number;            // fallos antes de pausar
    startDate?: string | null;      // fecha del 1er cobro
    endDate?: string | null;        // "Hasta"
    maxOccurrences?: number | null; // "Ocurrencias"
    description?: string;
    // Modo auto_charge:
    card?: string;
    expMonth?: string;
    expYear?: string;
    cvv?: string;
    zipCode?: string;
    enrollByClient?: boolean;   // el cliente ingresa su tarjeta por un link enviado por correo
    // Modo invoice_link:
    email?: string;
    sendEmail?: boolean;
    linkMethods?: LinkMethod[];
    graceDays?: number;
}

/** Campos editables de un plan recurrente (todos opcionales). */
export interface UpdateRecurringInput {
    projectId?: string | null;      // vincular/desvincular proyecto (null lo quita)
    amount?: number;
    items?: RecurringItem[] | null;
    taxRate?: number | null;
    interval?: CreateRecurringInput['interval'];
    intervalCount?: number;
    monthlyDay?: number | null;
    retryEnabled?: boolean;
    maxRetries?: number;
    startDate?: string | null;
    endDate?: string | null;
    maxOccurrences?: number | null;
    description?: string | null;
    email?: string | null;
    sendEmail?: boolean;
    linkMethods?: LinkMethod[];
    graceDays?: number;
}

export const recurringService = {
    create: (data: CreateRecurringInput) => api.post<{ recurring: RecurringPayment; warning?: string }>('/payments/recurring', data),
    update: (id: string, data: UpdateRecurringInput) => api.put<{ recurring: RecurringPayment; warning?: string }>(`/payments/recurring/${id}`, data),
    /** force=true: el usuario confirmó cobrar aunque hubo un cobro hace pocos minutos (409 RECENT_CHARGE). */
    chargeNow: (id: string, force = false) => api.post<{ status: string; message: string; reference?: string }>(`/payments/recurring/${id}/charge`, { force }),
    setStatus: (id: string, action: 'pause' | 'resume' | 'cancel') => api.post<RecurringPayment>(`/payments/recurring/${id}/${action}`),
    remove: (id: string) => api.delete<{ deleted: boolean; soft?: boolean; id: string }>(`/payments/recurring/${id}`),
    restore: (id: string) => api.post<{ restored: boolean; id: string }>(`/payments/recurring/${id}/restore`),
    list: (deleted?: boolean) => api.get<RecurringPayment[]>(`/payments/recurring${deleted ? '?deleted=1' : ''}`),
    /** Planes vinculados a un proyecto (pestaña Facturación del proyecto). */
    listByProject: (projectId: string) => api.get<RecurringPayment[]>('/payments/recurring', { projectId }),
    /** Plantillas editables: "Autoriza tu pago recurrente" y el aviso previo al débito (variables {{negocio}}, {{cliente}}, …). */
    getEmailTemplate: (key: RecurringEmailTemplateKey = 'recurringEnroll') => api.get<EnrollEmailTemplate>('/payments/recurring/email-template', { key }),
    /** Vacío (subject y body) = volver al texto por defecto. Solo gerente. */
    saveEmailTemplate: (data: { key: RecurringEmailTemplateKey; subject: string; body: string }) => api.put<EnrollEmailTemplate>('/payments/recurring/email-template', data),
};

export type RecurringEmailTemplateKey = 'recurringEnroll' | 'recurringPreCharge';

export interface EnrollEmailTemplate {
    key: RecurringEmailTemplateKey;
    subject: string;
    body: string;
    isDefault: boolean;
    defaults: { subject: string; body: string };
    variables: string[];
    /** La plantilla lleva un enlace obligatorio (autorización). */
    withLink: boolean;
    /** Días de anticipación del aviso previo al débito. */
    noticeDays: number;
}

// ── Enrolamiento público (sin auth) ──
export interface PublicEnroll {
    status: string;
    enrolled: boolean;
    clientName?: string | null;
    amount: number;
    items?: RecurringItem[] | null;
    interval: RecurringPayment['interval'];
    intervalCount?: number;
    description?: string | null;
    nextChargeDate?: string | null;
    business: { businessName: string; rnc: string; address: string; phone: string; email: string; logoUrl: string } & BusinessTerms;
    agilpayEnabled: boolean;
}
export const recurringPublic = {
    get: (token: string) => api.get<PublicEnroll>(`/public/recurring/${token}`),
    enroll: (token: string, body: { card: string; expMonth: string; expYear: string; cvv: string; zipCode?: string; acceptedTerms: boolean }) =>
        api.post<{ success: boolean; reference?: string | null }>(`/public/recurring/${token}/enroll`, body),
};
