import React, { useState, useRef, useEffect } from 'react';
import { invoicesService } from '../../services/invoices';
import { ApiError } from '../../services/api';

interface Props {
    token: string;              // publicToken de la factura
    amount: number;             // monto a cobrar
    disabled?: boolean;
    onPaid: () => void;         // recargar la factura al completar
    t: (key: string, params?: Record<string, string | number>) => string;
}

type Phase = 'idle' | 'creating' | 'waiting' | 'done' | 'cancelled' | 'error';

/**
 * Pago ATH Móvil por flujo de TELÉFONO (server-side): el cliente escribe su número, se crea el
 * pago (ATH le manda un push), y hacemos polling del estado hasta que apruebe y se complete.
 * Reemplaza el botón JS (que no renderiza sin dominio autorizado).
 */
export const AthMovilPhonePay: React.FC<Props> = ({ token, amount, disabled, onPaid, t }) => {
    const [phone, setPhone] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<number | null>(null);
    const triesRef = useRef(0);

    useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

    const fmtPhone = (v: string) => {
        const d = v.replace(/\D/g, '').slice(0, 10);
        if (d.length >= 7) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
        if (d.length >= 4) return `${d.slice(0, 3)}-${d.slice(3)}`;
        return d;
    };

    const stopPoll = () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };

    const start = async () => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length !== 10) { setError(t('pay.ath_phone_invalid')); return; }
        if (!(amount > 0)) { setError(t('pay.ath_amount_gt0')); return; }
        setError(null); setPhase('creating');
        try {
            const r = await invoicesService.athCreate(token, digits, amount);
            if (!r.ecommerceId) throw new Error('no-id');
            setPhase('waiting');
            triesRef.current = 0;
            // Polling cada 4s, hasta ~2.5 min.
            pollRef.current = window.setInterval(async () => {
                triesRef.current += 1;
                try {
                    const s = await invoicesService.athStatus(token, r.ecommerceId, r.authToken);
                    if (s.status === 'completed') { stopPoll(); setPhase('done'); onPaid(); return; }
                    if (s.status === 'cancelled') { stopPoll(); setPhase('cancelled'); return; }
                } catch { /* reintenta en el próximo tick */ }
                if (triesRef.current >= 38) { stopPoll(); setPhase('cancelled'); setError(t('pay.ath_timeout')); }
            }, 4000);
        } catch (err) {
            setPhase('error');
            setError(err instanceof ApiError ? err.message : t('pay.ath_create_error'));
        }
    };

    if (phase === 'done') {
        return <p className="text-sm text-center text-green-700 dark:text-green-300 py-2">{t('pay.ath_received')}</p>;
    }

    return (
        <div className="space-y-2">
            {phase === 'waiting' ? (
                <div className="text-center py-2">
                    <div className="inline-block w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-sm text-neutral-700 dark:text-neutral-200 font-medium">{t('pay.ath_check_app')}</p>
                    <p className="text-xs text-neutral-500 mt-1">{t('pay.ath_waiting')}</p>
                </div>
            ) : (
                <>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('pay.ath_phone_label')}</label>
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            inputMode="numeric"
                            value={phone}
                            onChange={e => setPhone(fmtPhone(e.target.value))}
                            placeholder="787-000-0000"
                            disabled={disabled || phase === 'creating'}
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); start(); } }}
                        />
                        <button
                            type="button"
                            onClick={start}
                            disabled={disabled || phase === 'creating'}
                            className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold whitespace-nowrap disabled:opacity-50"
                        >
                            {phase === 'creating' ? '…' : t('pay.ath_pay_btn')}
                        </button>
                    </div>
                    <p className="text-xs text-neutral-500">{t('pay.ath_phone_hint')}</p>
                </>
            )}
            {phase === 'cancelled' && <p className="text-sm text-center text-red-600 dark:text-red-400 py-1">{error || t('pay.ath_cancelled')}</p>}
            {error && phase !== 'cancelled' && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};
