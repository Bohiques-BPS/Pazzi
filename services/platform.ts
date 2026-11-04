import { api } from './api';

export type BillingInterval = 'month' | 'year';
export type UpgradePolicy = 'charge_now' | 'next_invoice' | 'no_charge';
export type DowngradePolicy = 'credit_now' | 'period_end' | 'no_credit';

export interface PlatformSettings {
    id: string;
    prorationEnabled: boolean;
    upgradePolicy: UpgradePolicy;
    downgradePolicy: DowngradePolicy;
    prorationBasis: 'actual_days' | 'thirty_days';
    minProrationAmount: number;
    trialDays: number;
    graceDays: number;
    taxRate: number;
    agilpayEnabled: boolean;
    agilpayMerchantKey?: string | null;
    agilpayClientId?: string | null;
    agilpayEnvironment: 'sandbox' | 'production';
    agilpayHasSecret: boolean;
    secretsEncrypted: boolean;
}

export type PlatformSettingsUpdate = Partial<Omit<PlatformSettings, 'id' | 'agilpayHasSecret' | 'secretsEncrypted'>> & { agilpayClientSecret?: string };

export interface Plan {
    id: string;
    name: string;
    description?: string | null;
    monthlyPrice: number;
    annualPrice: number;
    modules?: string[] | null;
    limits?: Record<string, number> | null;
    isPublic: boolean;
    isActive: boolean;
    order: number;
    _count?: { subscriptions: number };
}

export interface Subscription {
    id: string;
    businessId: string;
    planId: string;
    interval: BillingInterval;
    price: number;
    status: 'trialing' | 'active' | 'past_due' | 'cancelled';
    trialEnd?: string | null;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    creditBalance: number;
    pendingAdjustment: number;
    scheduledPlanId?: string | null;
    scheduledInterval?: BillingInterval | null;
    scheduledPrice?: number | null;
    cancelAtPeriodEnd: boolean;
    customModules?: string[] | null;
    customLimits?: Record<string, number> | null;
    notes?: string | null;
    plan?: { id: string; name: string };
}

export interface PlatformBusiness {
    id: string;
    name: string;
    owner: { id: string; name: string; lastName: string; email: string; status: string; lastLoginAt?: string | null; lastSeenAt?: string | null };
    status: 'active' | 'suspended' | 'archived';
    statusReason?: string | null;
    employees: number;
    subscription: Subscription | null;
    amountDue: number;
}

export interface PlanChangeBody {
    planId: string;
    interval: BillingInterval;
    customPrice?: number | null;
    upgradePolicy?: UpgradePolicy;
    downgradePolicy?: DowngradePolicy;
    overrideNet?: number | null;
    note?: string | null;
}

export interface PlanChangePreview {
    newPrice: number;
    taxRate: number;
    creditBalance: number;
    overLimits?: { label: string; used: number; limit: number }[];
    invoice: { subtotal: number; creditApplied: number; tax: number; total: number } | null;
    result: {
        remainingDays: number;
        totalDays: number;
        unusedCredit: number;
        newCharge: number;
        net: number;
        effective: 'now' | 'period_end';
        adjustment: 'charge_now' | 'next_invoice' | 'credit' | 'none';
        amount: number;
        resetsPeriod: boolean;
    };
}

export interface PlatformInvoice {
    id: string;
    number: number;
    businessId: string;
    businessName: string;
    type: 'renewal' | 'proration';
    status: 'pending' | 'paid' | 'void';
    subtotal: number;
    creditApplied: number;
    tax: number;
    total: number;
    description?: string | null;
    dueDate: string;
    paidAt?: string | null;
    paidMethod?: string | null;
    paidReference?: string | null;
    voidReason?: string | null;
    createdAt: string;
}

export interface PlatformAuditEntry {
    id: string;
    actorEmail: string;
    action: string;
    businessId?: string | null;
    targetType?: string | null;
    note?: string | null;
    createdAt: string;
}

const base = '/admin/platform';

export const platformService = {
    getSettings: () => api.get<PlatformSettings>(`${base}/settings`),
    updateSettings: (data: PlatformSettingsUpdate) => api.put<PlatformSettings>(`${base}/settings`, data),
    verifyAgilpay: (data: { merchantKey?: string; clientId?: string; clientSecret?: string; environment?: string }) =>
        api.post<{ valid: boolean; message?: string }>(`${base}/settings/agilpay/verify`, data),

    listPlans: () => api.get<Plan[]>(`${base}/plans`),
    createPlan: (data: Partial<Plan>) => api.post<Plan>(`${base}/plans`, data),
    updatePlan: (id: string, data: Partial<Plan>) => api.put<Plan>(`${base}/plans/${id}`, data),

    listBusinesses: () => api.get<PlatformBusiness[]>(`${base}/businesses`),
    setBusinessStatus: (id: string, status: PlatformBusiness['status'], reason?: string) =>
        api.put(`${base}/businesses/${id}/status`, { status, reason }),

    createSubscription: (businessId: string, data: { planId: string; interval: BillingInterval; customPrice?: number | null; trialDays?: number | null }) =>
        api.post<Subscription>(`${base}/businesses/${businessId}/subscription`, data),
    editSubscription: (businessId: string, data: { price?: number; currentPeriodEnd?: string; creditAdjustment?: number; clearScheduled?: boolean; cancelAtPeriodEnd?: boolean; customModules?: string[] | null; customLimits?: Record<string, number> | null; reason?: string }) =>
        api.put<Subscription>(`${base}/businesses/${businessId}/subscription`, data),
    previewChange: (businessId: string, data: PlanChangeBody) =>
        api.post<PlanChangePreview>(`${base}/businesses/${businessId}/subscription/preview`, data),
    changePlan: (businessId: string, data: PlanChangeBody) =>
        api.post(`${base}/businesses/${businessId}/subscription/change`, data),

    listInvoices: (status?: string) => api.get<PlatformInvoice[]>(`${base}/invoices`, status ? { status } as any : undefined),
    payInvoice: (id: string, data: { method: string; reference?: string }) => api.post(`${base}/invoices/${id}/pay`, data),
    voidInvoice: (id: string, reason: string) => api.post(`${base}/invoices/${id}/void`, { reason }),

    listAudit: () => api.get<PlatformAuditEntry[]>(`${base}/audit`),
};
