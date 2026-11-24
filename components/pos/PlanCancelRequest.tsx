import React, { useState } from 'react';

/**
 * Páginas públicas del plan recurrente (autorización de tarjeta y factura del plan): el cliente pide
 * cancelar su plan. No cancela nada por sí solo: le llega un aviso al negocio, que decide si pausa,
 * cancela o desvincula la tarjeta.
 */
export const PlanCancelRequest: React.FC<{
    canRequest: boolean;
    pendingSince?: string | null;
    onSubmit: (reason: string) => Promise<void>;
    t: (key: string, params?: Record<string, string | number>) => string;
}> = ({ canRequest, pendingSince, onSubmit, t }) => {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sentAt, setSentAt] = useState<string | null>(null);
    const since = sentAt || pendingSince || null;

    if (since) {
        return (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                <div className="font-semibold">{t('plan_cancel.pending_title')}</div>
                <p className="text-amber-700/90 dark:text-amber-300/90">{t('plan_cancel.pending_desc', { date: new Date(since).toLocaleDateString() })}</p>
            </div>
        );
    }
    if (!canRequest) return null;
    if (!open) {
        return (
            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
                <button type="button" onClick={() => setOpen(true)} className="underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-200">{t('plan_cancel.open')}</button>
            </p>
        );
    }
    const send = async () => {
        setSending(true); setError('');
        try { await onSubmit(reason.trim()); setSentAt(new Date().toISOString()); setOpen(false); }
        catch (e: any) { setError(e?.message || t('plan_cancel.error')); }
        finally { setSending(false); }
    };
    return (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
            <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t('plan_cancel.title')}</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('plan_cancel.desc')}</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={1000} placeholder={t('plan_cancel.reason_ph')}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm p-2 text-neutral-800 dark:text-neutral-100" />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} disabled={sending} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200">{t('plan_cancel.back')}</button>
                <button type="button" onClick={send} disabled={sending} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">{sending ? t('plan_cancel.sending') : t('plan_cancel.send')}</button>
            </div>
        </div>
    );
};
