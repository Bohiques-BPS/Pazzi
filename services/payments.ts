import { api } from './api';

export interface AgilPayChargeInput {
    amount: number;
    card: string;
    expMonth: string;
    expYear: string;
    cvv: string;
    zipCode?: string;
    customerName?: string;
    customerEmail?: string;
    invoice: string;
    tax?: number;
}

export interface AgilPayChargeResult {
    success: boolean;
    reference: string;
    transactionId?: string;
    status?: string;
}

export const paymentsService = {
    chargeAgilPay: (data: AgilPayChargeInput) =>
        api.post<AgilPayChargeResult>('/payments/agilpay/charge', data),
};
