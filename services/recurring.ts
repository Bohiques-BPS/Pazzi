import { api } from './api';

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
    mode: RecurringMode;
    cardLast4?: string | null;
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
    status: 'active' | 'paused' | 'cancelled' | 'completed';
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
    // Modo invoice_link:
    email?: string;
    sendEmail?: boolean;
    linkMethods?: LinkMethod[];
    graceDays?: number;
}

/** Campos editables de un plan recurrente (todos opcionales). */
export interface UpdateRecurringInput {
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
    create: (data: CreateRecurringInput) => api.post<{ recurring: RecurringPayment }>('/payments/recurring', data),
    update: (id: string, data: UpdateRecurringInput) => api.put<{ recurring: RecurringPayment }>(`/payments/recurring/${id}`, data),
    chargeNow: (id: string) => api.post<{ status: string; message: string; reference?: string }>(`/payments/recurring/${id}/charge`),
    setStatus: (id: string, action: 'pause' | 'resume' | 'cancel') => api.post<RecurringPayment>(`/payments/recurring/${id}/${action}`),
    remove: (id: string) => api.delete<{ deleted: boolean; soft?: boolean; id: string }>(`/payments/recurring/${id}`),
    restore: (id: string) => api.post<{ restored: boolean; id: string }>(`/payments/recurring/${id}/restore`),
    list: (deleted?: boolean) => api.get<RecurringPayment[]>(`/payments/recurring${deleted ? '?deleted=1' : ''}`),
};
