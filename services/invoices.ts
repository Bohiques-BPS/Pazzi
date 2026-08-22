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
    clientEmail?: string | null;
    createdByUserId?: string | null;
    cashierName?: string | null;
    type?: string | null;
    publicToken: string;
    items: InvoiceItemInput[];
    subtotal: number;
    tax: number;
    total: number;
    amountPaid?: number;
    description?: string | null;
    status: 'pending' | 'partial' | 'paid' | 'cancelled';
    paidMethod?: string | null;
    paidReference?: string | null;
    paidAt?: string | null;
    createdAt: string;
}

export interface CreateInvoiceInput {
    clientId?: string | null;
    email?: string;      // correo del cliente para enviar la factura
    send?: boolean;      // enviar el correo al crear
    items: InvoiceItemInput[];
    taxRate?: number;
    description?: string;
    allowedMethods?: string; // "agilpay,ath" (null/omitido = ambos)
    type?: string | null;    // tipo de factura (etiqueta libre)
}

export interface UpdateInvoiceInput {
    clientId?: string | null;
    email?: string | null;
    items?: InvoiceItemInput[];
    taxRate?: number;
    description?: string | null;
    allowedMethods?: string | null;
    type?: string | null;
}

export interface PublicInvoiceBusiness {
    businessName: string;
    rnc: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string;
}

export interface InvoicePaymentRow {
    amount: number;
    method?: string | null;
    reference?: string | null;
    paidAt?: string | null;
}

export interface PublicInvoice {
    id: string;
    number?: number | null;
    items: InvoiceItemInput[];
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    balance: number;
    payments: InvoicePaymentRow[];
    description?: string | null;
    status: 'pending' | 'partial' | 'paid' | 'cancelled';
    paidMethod?: string | null;
    paidReference?: string | null;
    paidAt?: string | null;
    createdAt: string;
    business: PublicInvoiceBusiness;
    agilpayEnabled: boolean;
    allowedMethods?: string | null; // "agilpay,ath" (null = ambos)
    athEnabled?: boolean;           // ATH Móvil con verificación automática disponible
    athPublicToken?: string | null; // token PÚBLICO para el botón (nunca el privado)
    athEnv?: string;                // 'production' | 'sandbox'
}

export const invoicesService = {
    // ── Auth (POS) ──
    list: () => api.get<Invoice[]>('/invoices'),
    create: (data: CreateInvoiceInput) => api.post<Invoice>('/invoices', data),
    update: (id: string, data: UpdateInvoiceInput) => api.put<Invoice>(`/invoices/${id}`, data),
    markPaid: (id: string, body: { reference?: string; method?: string; amount?: number }) =>
        api.post<Invoice>(`/invoices/${id}/mark-paid`, body),
    send: (id: string, email?: string) =>
        api.post<{ sent: boolean; to: string }>(`/invoices/${id}/send`, email ? { email } : {}),

    // ── Público (sin auth, por publicToken) ──
    getPublic: (token: string) => api.get<PublicInvoice>(`/public/invoices/${token}`),
    payPublicAgilPay: (token: string, card: AgilPayCardData, amount?: number) =>
        api.post<{ success: boolean; reference: string; amountPaid: number; balance: number; fullyPaid: boolean }>(
            `/public/invoices/${token}/pay-agilpay`, { ...card, ...(amount != null ? { amount } : {}) }),
    /** Registra automáticamente un pago por ATH Móvil (verificado server-side por su referencia). */
    payPublicAthMovil: (token: string, referenceNumber: string, amount?: number) =>
        api.post<{ success: boolean; reference?: string; amountPaid: number; balance: number; fullyPaid: boolean; alreadyRecorded?: boolean }>(
            `/public/invoices/${token}/pay-athmovil`, { referenceNumber, ...(amount != null ? { amount } : {}) }),
};
