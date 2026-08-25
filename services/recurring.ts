import { api } from './api';

export type RecurringMode = 'auto_charge' | 'invoice_link';
export type LinkMethod = 'agilpay' | 'ath';
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
    amount: number;
    interval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
    intervalCount?: number;
    startDate?: string | null;
    endDate?: string | null;
    maxOccurrences?: number | null;
    occurrencesDone?: number;
    description?: string | null;
    status: 'active' | 'paused' | 'cancelled' | 'completed';
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
    amount: number;
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
    linkMethods?: LinkMethod[];
    graceDays?: number;
}

export const recurringService = {
    list: () => api.get<RecurringPayment[]>('/payments/recurring'),
    create: (data: CreateRecurringInput) => api.post<{ recurring: RecurringPayment }>('/payments/recurring', data),
    chargeNow: (id: string) => api.post<{ status: string; message: string; reference?: string }>(`/payments/recurring/${id}/charge`),
    setStatus: (id: string, action: 'pause' | 'resume' | 'cancel') => api.post<RecurringPayment>(`/payments/recurring/${id}/${action}`),
};
