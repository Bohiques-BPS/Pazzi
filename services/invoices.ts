import { api } from './api';
import type { AgilPayCardData } from '../components/pos/AgilPayCardForm';

export interface InvoiceItemInput {
    name: string;
    quantity: number;
    unitPrice: number;
}

export interface Invoice {
    id: string;
    number?: number | null;
    clientId?: string | null;
    clientName?: string | null;
    publicToken: string;
    items: InvoiceItemInput[];
    subtotal: number;
    tax: number;
    total: number;
    description?: string | null;
    status: 'pending' | 'paid' | 'cancelled';
    paidMethod?: string | null;
    paidReference?: string | null;
    paidAt?: string | null;
    createdAt: string;
}

export interface CreateInvoiceInput {
    clientId?: string | null;
    items: InvoiceItemInput[];
    taxRate?: number;
    description?: string;
}

export interface PublicInvoiceBusiness {
    businessName: string;
    rnc: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
}

export interface PublicInvoice {
    id: string;
    number?: number | null;
    items: InvoiceItemInput[];
    subtotal: number;
    tax: number;
    total: number;
    description?: string | null;
    status: 'pending' | 'paid' | 'cancelled';
    paidMethod?: string | null;
    paidReference?: string | null;
    paidAt?: string | null;
    createdAt: string;
    business: PublicInvoiceBusiness;
    agilpayEnabled: boolean;
}

export const invoicesService = {
    // ── Auth (POS) ──
    list: () => api.get<Invoice[]>('/invoices'),
    create: (data: CreateInvoiceInput) => api.post<Invoice>('/invoices', data),
    markPaid: (id: string, body: { reference?: string; method?: string }) =>
        api.post<Invoice>(`/invoices/${id}/mark-paid`, body),

    // ── Público (sin auth, por publicToken) ──
    getPublic: (token: string) => api.get<PublicInvoice>(`/public/invoices/${token}`),
    payPublicAgilPay: (token: string, card: AgilPayCardData) =>
        api.post<{ success: boolean; reference: string }>(`/public/invoices/${token}/pay-agilpay`, card),
};
