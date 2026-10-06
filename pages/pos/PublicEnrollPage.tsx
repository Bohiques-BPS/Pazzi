import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { recurringPublic, type PublicEnroll } from '../../services/recurring';
import { AgilPayCardForm } from '../../components/pos/AgilPayCardForm';
import { usePublicT } from '../../hooks/usePublicTranslation';
import { ApiError } from '../../services/api';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const INTERVAL_KEY: Record<string, string> = {
    daily: 'posx.recurring.interval.daily', weekly: 'posx.recurring.interval.weekly', biweekly: 'posx.recurring.interval.biweekly',
    monthly: 'posx.recurring.interval.monthly', quarterly: 'posx.recurring.interval.quarterly', annual: 'posx.recurring.interval.annual',
};

export const PublicEnrollPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const t = usePublicT();
    const [data, setData] = useState<PublicEnroll | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);
    const [done, setDone] = useState(false);

    const load = async () => {
        if (!token) return;
        setLoading(true); setError(null);
        try { setData(await recurringPublic.get(token)); }
        catch (err) { setError(err instanceof ApiError ? err.message : t('pay.load_error')); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

    const items = useMemo(() => (Array.isArray(data?.items) ? data!.items! : []), [data]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">{t('pay.loading')}</div>;
    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center"><div className="text-5xl mb-3">🔒</div><p className="text-neutral-600 dark:text-neutral-300">{error || t('pay.not_found')}</p></div>
            </div>
        );
    }

    const b = data.business;
    const freq = t(INTERVAL_KEY[data.interval] || '') || data.interval;
    const alreadyEnrolled = data.enrolled || done;

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 py-8 px-4">
            <div className="max-w-lg mx-auto bg-white dark:bg-neutral-800 rounded-xl shadow-md overflow-hidden">
                {/* Encabezado del negocio */}
                <div className="p-6 text-center border-b border-neutral-200 dark:border-neutral-700">
                    {b.logoUrl && <img src={b.logoUrl} alt="" className="mx-auto max-h-16 object-contain mb-3" />}
                    <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{b.businessName || t('enroll.title')}</h1>
                    {b.address && <p className="text-xs text-neutral-500">{b.address}</p>}
                    {b.phone && <p className="text-xs text-neutral-500">Tel: {b.phone}</p>}
                </div>

                <div className="p-6">
                    <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-1">{t('enroll.heading')}</h2>
                    {data.clientName && <p className="text-sm text-neutral-500 mb-3">{data.clientName}</p>}

                    {/* Resumen del plan */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm space-y-1 mb-4">
                        {items.length > 0 && items.map((it, i) => (
                            <div key={i} className="flex justify-between text-neutral-600 dark:text-neutral-300">
                                <span>{it.quantity} × {it.name}</span><span>{money(it.quantity * it.unitPrice)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between font-bold text-neutral-900 dark:text-white pt-1 border-t border-neutral-100 dark:border-neutral-700">
                            <span>{t('enroll.per_period')}</span><span>{money(data.amount)} · {freq}</span>
                        </div>
                        {data.description && <p className="text-xs text-neutral-500 pt-1">{data.description}</p>}
                    </div>

                    {alreadyEnrolled ? (
                        <div className="text-center space-y-3 py-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                <svg className="w-9 h-9 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('enroll.done_title')}</h3>
                            <p className="text-sm text-neutral-500">{t('enroll.done_desc')}</p>
                        </div>
                    ) : !data.agilpayEnabled ? (
                        <p className="text-sm text-center text-neutral-500">{t('pay.card_unavailable')}</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Términos y condiciones */}
                            <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
                                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="h-4 w-4 mt-0.5 flex-shrink-0 accent-teal-600" />
                                <span>{t('enroll.terms')}</span>
                            </label>
                            <div className={accepted ? '' : 'opacity-50 pointer-events-none select-none'} aria-disabled={!accepted}>
                                {!accepted && <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">{t('enroll.terms_required')}</p>}
                                <AgilPayCardForm
                                    amount={data.amount}
                                    t={t}
                                    onSuccess={() => setDone(true)}
                                    chargeFn={async (card) => {
                                        const r = await recurringPublic.enroll(token!, { ...card, acceptedTerms: true });
                                        return { success: !!r.success, reference: r.reference || '' };
                                    }}
                                />
                            </div>
                            <p className="text-[11px] text-neutral-400 text-center">{t('enroll.first_charge_note')}</p>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-xs text-neutral-400 mt-4">{t('pay.secure')}</p>
        </div>
    );
};

export default PublicEnrollPage;
