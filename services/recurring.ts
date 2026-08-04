import { api } from './api';

export interface RecurringCharge {
    id: string;
    date: string;
    amount: number;
    status: 'approved' | 'declined' | 'error';
    reference?: string | null;
    message?: string | null;
}

export interface RecurringPayment {
    id: string;
    clientId: string;
    clientName: string;
    cardLast4?: string | null;
    amount: number;
    interval: 'weekly' | 'biweekly' | 'monthly';
    description?: string | null;
    status: 'active' | 'paused' | 'cancelled';
    nextChargeDate: string;
    lastChargeAt?: string | null;
    lastResult?: string | null;
    failureCount: number;
    charges: RecurringCharge[];
}

export interface CreateRecurringInput {
    clientId: string;
    card: string;
    expMonth: string;
    expYear: string;
    cvv: string;
    zipCode?: string;
    amount: number;
    interval: 'weekly' | 'biweekly' | 'monthly';
    description?: string;
}

export const recurringService = {
    list: () => api.get<RecurringPayment[]>('/payments/recurring'),
    create: (data: CreateRecurringInput) => api.post<{ recurring: RecurringPayment }>('/payments/recurring', data),
    chargeNow: (id: string) => api.post<{ status: string; message: string; reference?: string }>(`/payments/recurring/${id}/charge`),
    setStatus: (id: string, action: 'pause' | 'resume' | 'cancel') => api.post<RecurringPayment>(`/payments/recurring/${id}/${action}`),
};
