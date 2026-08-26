import { api } from './api';
import type { AgilPayCardData } from '../components/pos/AgilPayCardForm';

export interface InvoiceItemInput {
    name: string;
    quantity: number;
    unitPrice: number;
    /** Tasa de IVU por línea (fracción). 0 = producto exento. Omitido = tasa por defecto del negocio. */
    taxRate?: number | null;
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
    deletedAt?: string | null;
    allowPartial?: boolean;
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
    allowPartial?: boolean;  // false = solo pago completo (sin abonos)
    type?: string | null;    // tipo de factura (etiqueta libre)
}

export interface UpdateInvoiceInput {
    clientId?: string | null;
    email?: string | null;
    items?: InvoiceItemInput[];
    taxRate?: number;
    description?: string | null;
    allowedMethods?: string | null;
    allowPartial?: boolean;
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
    taxBreakdownEnabled?: boolean;
    taxStateRate?: number | null;
    taxMunicipalRate?: number | null;
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
    allowPartial?: boolean;         // false = solo pago completo (sin abonos)
    athEnabled?: boolean;           // ATH Móvil con verificación automática disponible
    athPublicToken?: string | null; // token PÚBLICO para el botón (nunca el privado)
    athEnv?: string;                // 'production' | 'sandbox'
}

export const invoicesService = {
    // ── Auth (POS) ──
    list: (deleted?: boolean) => api.get<Invoice[]>(`/invoices${deleted ? '?deleted=1' : ''}`),
    create: (data: CreateInvoiceInput) => api.post<Invoice>('/invoices', data),
    update: (id: string, data: UpdateInvoiceInput) => api.put<Invoice>(`/invoices/${id}`, data),
    remove: (id: string) => api.delete<{ deleted: boolean; soft?: boolean; id: string }>(`/invoices/${id}`),
    restore: (id: string) => api.post<{ restored: boolean; id: string }>(`/invoices/${id}/restore`),
    markPaid: (id: string, body: { reference?: string; method?: string; amount?: number }) =>
        api.post<Invoice>(`/invoices/${id}/mark-paid`, body),
    send: (id: string, email?: string) =>
        api.post<{ sent: boolean; to: string }>(`/invoices/${id}/send`, email ? { email } : {}),

    // ── Público (sin auth, por publicToken) ──
    getPublic: (token: string) => api.get<PublicInvoice>(`/public/invoices/${token}`),
    payPublicAgilPay: (token: string, card: AgilPayCardData, amount?: number) =>
        api.post<{ success: boolean; reference: string; amountPaid: number; balance: number; fullyPaid: boolean }>(
            `/public/invoices/${token}/pay-agilpay`, { ...card, ...(amount != null ? { amount } : {}) }),
    /** ATH Móvil (flujo con teléfono) — paso 1: crea el pago y dispara el push. */
    athCreate: (token: string, phoneNumber: string, amount?: number) =>
        api.post<{ ok: boolean; ecommerceId: string; authToken?: string | null; baselinePaid?: number }>(
            `/public/invoices/${token}/ath/create`, { phoneNumber, ...(amount != null ? { amount } : {}) }),
    /** ATH Móvil — paso 2 (polling): consulta estado, autoriza y registra cuando completa. */
    athStatus: (token: string, ecommerceId: string, authToken?: string | null, baselinePaid?: number) =>
        api.post<{ status: 'pending' | 'completed' | 'cancelled'; athStatus?: string; reference?: string; amountPaid?: number; balance?: number; fullyPaid?: boolean }>(
            `/public/invoices/${token}/ath/status`, { ecommerceId, authToken, ...(baselinePaid != null ? { baselinePaid } : {}) }),
};
