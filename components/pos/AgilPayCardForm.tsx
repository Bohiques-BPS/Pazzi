import React, { useState } from 'react';
import { paymentsService } from '../../services/payments';
import { ApiError } from '../../services/api';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export interface AgilPayCardData {
    card: string;
    expMonth: string;
    expYear: string;
    cvv: string;
    zipCode?: string;
}

interface AgilPayCardFormProps {
    amount: number;            // saldo a cobrar
    tax?: number;
    customerName?: string;
    customerEmail?: string;
    onSuccess: (reference: string) => void;
    /** Si se pasa, reemplaza el cobro autenticado por uno propio (ej. pago público de factura). */
    chargeFn?: (data: AgilPayCardData) => Promise<{ success: boolean; reference: string }>;
    /** Traducción a usar (en páginas públicas, el idioma del navegador del visitante). */
    t?: (key: string, params?: Record<string, string | number>) => string;
}

const luhnOk = (num: string) => {
    const n = num.replace(/\D/g, '');
    if (n.length < 13) return false;
    let sum = 0, even = false;
    for (let i = n.length - 1; i >= 0; i--) {
        let d = parseInt(n[i], 10);
        if (even) { d *= 2; if (d > 9) d -= 9; }
        sum += d; even = !even;
    }
    return sum % 10 === 0;
};

const expiryOk = (exp: string) => {
    const [mm, yy] = exp.split('/');
    const month = parseInt(mm, 10), year = parseInt('20' + (yy || ''), 10);
    if (!month || !year || month < 1 || month > 12) return false;
    const now = new Date();
    if (year < now.getFullYear()) return false;
    if (year === now.getFullYear() && month < now.getMonth() + 1) return false;
    return true;
};

const inputCls = 'w-full text-base px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500';

export const AgilPayCardForm: React.FC<AgilPayCardFormProps> = ({ amount, tax, customerName, customerEmail, onSuccess, chargeFn, t: tProp }) => {
    const { t: tHook } = useTranslation();
    const t = tProp || tHook;
    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [zip, setZip] = useState('');
    const [charging, setCharging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onCard = (v: string) => {
        const digits = v.replace(/\D/g, '').slice(0, 19);
        setCard(digits.match(/.{1,4}/g)?.join(' ') || digits);
    };
    const onExpiry = (v: string) => {
        let d = v.replace(/\D/g, '').slice(0, 4);
        if (d.length >= 2) d = d.slice(0, 2) + '/' + d.slice(2);
        setExpiry(d);
    };

    const charge = async () => {
        setError(null);
        const cardDigits = card.replace(/\s/g, '');
        if (!luhnOk(cardDigits)) return setError(t('cmpx.agilpay.err_card'));
        if (!expiryOk(expiry)) return setError(t('cmpx.agilpay.err_expiry'));
        if (cvv.replace(/\D/g, '').length < 3) return setError(t('cmpx.agilpay.err_cvv'));
        const [mm, yy] = expiry.split('/');
        setCharging(true);
        try {
            const cardData: AgilPayCardData = {
                card: cardDigits, expMonth: mm, expYear: yy,
                cvv: cvv.replace(/\D/g, ''), zipCode: zip || undefined,
            };
            const res = chargeFn
                ? await chargeFn(cardData)
                : await paymentsService.chargeAgilPay({
                    amount, tax, ...cardData,
                    customerName, customerEmail,
                    invoice: `POS-${Date.now()}`,
                });
            // Guardamos el IDTransaction (lo requiere el reembolso por AgilPay).
            if (res.success) onSuccess((res as any).transactionId || res.reference || 'AGIL');
            else setError(t('cmpx.agilpay.err_declined'));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('cmpx.agilpay.err_charge'));
        } finally {
            setCharging(false);
        }
    };

    return (
        <div className="pt-2 space-y-2 border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('cmpx.agilpay.title', { amount: amount.toFixed(2) })}</div>
            <input type="text" inputMode="numeric" value={card} onChange={e => onCard(e.target.value)} placeholder={t('cmpx.agilpay.card_ph')} className={inputCls} autoComplete="off" />
            <div className="grid grid-cols-3 gap-2">
                <input type="text" inputMode="numeric" value={expiry} onChange={e => onExpiry(e.target.value)} placeholder={t('cmpx.agilpay.expiry_ph')} className={inputCls} autoComplete="off" />
                <input type="text" inputMode="numeric" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CVV" className={inputCls} autoComplete="off" />
                <input type="text" inputMode="numeric" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip" className={inputCls} autoComplete="off" />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="button" onClick={charge} disabled={charging} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-md">
                {charging ? t('cmpx.agilpay.processing') : t('cmpx.agilpay.charge', { amount: amount.toFixed(2) })}
            </button>
        </div>
    );
};
