import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoicesService, type PublicInvoice } from '../../services/invoices';
import { splitTax } from '../../utils/taxBreakdown';
import { AgilPayCardForm } from '../../components/pos/AgilPayCardForm';
import { AthMovilButton } from '../../components/pos/AthMovilButton';
import { usePublicT } from '../../hooks/usePublicTranslation';
import { generatePDF, type ReceiptSale } from '../../components/pos/ReceiptModal';
import { DEFAULT_RECEIPT_CONFIG, type ReceiptConfig } from '../../types';
import { ApiError } from '../../services/api';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

/** Construye un ReceiptConfig a partir de los datos públicos del negocio. */
function configFrom(inv: PublicInvoice): ReceiptConfig {
    const b = inv.business;
    return {
        ...DEFAULT_RECEIPT_CONFIG,
        businessName: b.businessName,
        rnc: b.rnc, address: b.address, phone: b.phone, email: b.email, logoUrl: b.logoUrl,
        showLogo: !!b.logoUrl, showRnc: !!b.rnc, showAddress: !!b.address,
        showPhone: !!b.phone, showEmail: !!b.email,
        showClient: false, showCashier: false, showTaxBreakdown: true,
        paperSize: 'letter', autoPrint: false,
        footerNote: 'Gracias por su preferencia.',
    };
}

function saleFrom(inv: PublicInvoice): ReceiptSale {
    return {
        saleNumber: inv.number ? String(inv.number) : inv.id.slice(0, 8),
        date: inv.createdAt,
        items: inv.items.map(it => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
        subtotal: inv.subtotal,
        tax: inv.tax,
        discount: 0,
        total: inv.total,
        payments: inv.status === 'paid'
            ? [{ method: inv.paidMethod || 'Pagado', amount: inv.total, reference: inv.paidReference || undefined }]
            : [],
    };
}

export const PublicInvoicePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [inv, setInv] = useState<PublicInvoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [athMsg, setAthMsg] = useState<string | null>(null);
    const [athProcessing, setAthProcessing] = useState(false);
    const [payMethod, setPayMethod] = useState<'card' | 'ath'>('card');
    const t = usePublicT();

    const load = async () => {
        if (!token) return;
        setLoading(true); setError(null);
        try {
            const data = await invoicesService.getPublic(token);
            setInv(data);
        } catch (err) {
            // Factura eliminada por el comercio → mensaje localizado para contactar al comercio.
            if (err instanceof ApiError && (err as any).code === 'invoice_deleted') setError(t('pay.deleted'));
            else setError(err instanceof ApiError ? err.message : t('pay.load_error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);
    // El monto a pagar arranca en el saldo pendiente (se puede editar para abonar menos).
    useEffect(() => { if (inv) setPayAmount((inv.balance ?? inv.total).toFixed(2)); }, [inv]);

    const cfg = useMemo(() => (inv ? configFrom(inv) : null), [inv]);
    // Métodos que el negocio habilitó para este link (null = ambos, retrocompatible).
    const allowedMethods = useMemo(() => (inv?.allowedMethods ? inv.allowedMethods.split(',').map(s => s.trim()) : ['agilpay', 'ath']), [inv]);
    const allowAgil = allowedMethods.includes('agilpay');
    const allowAth = allowedMethods.includes('ath');
    // Métodos realmente disponibles para este link (para el selector de pestañas).
    const availableMethods = useMemo(() => {
        const list: { key: 'card' | 'ath'; label: string }[] = [];
        if (allowAgil && inv?.agilpayEnabled) list.push({ key: 'card', label: t('pay.method_card') });
        if (allowAth) list.push({ key: 'ath', label: t('pay.method_ath') });
        return list;
    }, [allowAgil, allowAth, inv?.agilpayEnabled, t]);
    // Al cargar, seleccionar el primer método disponible por defecto.
    useEffect(() => {
        if (availableMethods.length && !availableMethods.some(m => m.key === payMethod)) {
            setPayMethod(availableMethods[0].key);
        }
    }, [availableMethods]); // eslint-disable-line
    const isPaid = inv?.status === 'paid';
    const balance = inv ? (inv.balance ?? inv.total) : 0;
    // Si la factura no permite abonos, el cliente solo puede pagar el saldo completo.
    const allowPartial = inv?.allowPartial !== false;
    // Monto validado para el cobro (no excede el saldo). Si no admite abonos → siempre el saldo.
    const charge = allowPartial
        ? Math.min(Math.max(0, parseFloat(payAmount.replace(',', '.')) || 0), balance)
        : balance;

    const handleAgilPaySuccess = async () => {
        await load(); // refresca saldo/estado/abonos
    };

    // El cliente completó el pago con el botón de ATH Móvil → verificar y registrar automáticamente.
    const handleAthSuccess = async (referenceNumber: string) => {
        if (!token) return;
        setAthProcessing(true); setAthMsg(t('pay.ath_verifying')); setError(null);
        try {
            const r = await invoicesService.payPublicAthMovil(token, referenceNumber, charge > 0 ? charge : undefined);
            setAthMsg(r.fullyPaid ? t('pay.ath_received') : t('pay.ath_partial'));
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('pay.ath_error'));
            setAthMsg(null);
        } finally { setAthProcessing(false); }
    };

    const downloadPDF = () => {
        if (inv && cfg) generatePDF(saleFrom({ ...inv, status: 'paid' }), cfg);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-neutral-500">{t('pay.loading')}</div>;
    }
    if (error || !inv || !cfg) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="text-5xl mb-3">🧾</div>
                    <p className="text-neutral-600 dark:text-neutral-300">{error || t('pay.not_found')}</p>
                </div>
            </div>
        );
    }

    const b = inv.business;

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 py-8 px-4">
            <div className="max-w-lg mx-auto bg-white dark:bg-neutral-800 rounded-xl shadow-md overflow-hidden">
                {/* Encabezado del negocio */}
                <div className="p-6 text-center border-b border-neutral-200 dark:border-neutral-700">
                    {b.logoUrl && <img src={b.logoUrl} alt="" className="mx-auto max-h-16 object-contain mb-3" />}
                    <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{b.businessName || t('pay.invoice')}</h1>
                    {b.rnc && <p className="text-xs text-neutral-500">RNC/Reg: {b.rnc}</p>}
                    {b.address && <p className="text-xs text-neutral-500">{b.address}</p>}
                    {b.phone && <p className="text-xs text-neutral-500">Tel: {b.phone}</p>}
                </div>

                {/* Estado */}
                <div className="px-6 pt-4 flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{t('pay.invoice')} {inv.number ? `#${inv.number}` : ''}</span>
                    {isPaid
                        ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">✓ {t('pay.status.paid')}</span>
                        : inv.status === 'partial'
                            ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{t('pay.status.partial')}</span>
                            : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{t('pay.status.pending')}</span>}
                </div>

                {/* Detalle */}
                <div className="p-6">
                    {inv.description && <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">{inv.description}</p>}
                    <table className="w-full text-sm">
                        <tbody>
                            {inv.items.map((it, i) => (
                                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-700/50">
                                    <td className="py-2">
                                        <div className="text-neutral-800 dark:text-neutral-100">{it.name}</div>
                                        <div className="text-xs text-neutral-500">{it.quantity} × {money(it.unitPrice)}</div>
                                    </td>
                                    <td className="py-2 text-right text-neutral-800 dark:text-neutral-100">{money(it.quantity * it.unitPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 space-y-1 text-sm">
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-300"><span>{t('pay.subtotal')}</span><span>{money(inv.subtotal)}</span></div>
                        {inv.taxBreakdownEnabled ? (() => {
                            const sp = splitTax(inv.tax, inv.taxStateRate, inv.taxMunicipalRate);
                            return (<>
                                <div className="flex justify-between text-neutral-600 dark:text-neutral-300"><span>IVU Estatal</span><span>{money(sp.state)}</span></div>
                                <div className="flex justify-between text-neutral-600 dark:text-neutral-300"><span>IVU Municipal</span><span>{money(sp.municipal)}</span></div>
                            </>);
                        })() : (
                            <div className="flex justify-between text-neutral-600 dark:text-neutral-300"><span>{t('pay.tax')}</span><span>{money(inv.tax)}</span></div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-neutral-900 dark:text-white pt-1"><span>{t('pay.total')}</span><span>{money(inv.total)}</span></div>
                        {(inv.amountPaid || 0) > 0 && (
                            <>
                                <div className="flex justify-between text-green-700 dark:text-green-400"><span>{t('pay.paid')}</span><span>−{money(inv.amountPaid)}</span></div>
                                <div className="flex justify-between text-base font-bold text-red-600 dark:text-red-400"><span>{t('pay.balance')}</span><span>{money(balance)}</span></div>
                            </>
                        )}
                    </div>

                    {/* Abonos recibidos */}
                    {inv.payments && inv.payments.length > 0 && (
                        <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-2">
                            <p className="text-xs font-semibold text-neutral-500 mb-1">{t('pay.payments_received')}</p>
                            {inv.payments.map((p, i) => (
                                <div key={i} className="flex justify-between text-xs text-neutral-500">
                                    <span>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''} {p.method || ''}</span>
                                    <span>{money(p.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pago / Descarga */}
                <div className="px-6 pb-6">
                    {isPaid ? (
                        <div className="space-y-3">
                            <div className="text-center text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-md py-3">
                                {t('pay.received_thanks')}
                                {inv.paidReference && <div className="text-xs text-neutral-500 mt-1">{t('pay.ref')} {inv.paidReference}</div>}
                            </div>
                            <button onClick={downloadPDF} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-md">
                                {t('pay.download_pdf')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Monto a pagar. Si la factura admite abonos, es editable; si no, se fija al saldo. */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">{t('pay.amount_to_pay')}</label>
                                {allowPartial ? (
                                    <>
                                        <div className="flex gap-2">
                                            <input
                                                type="text" inputMode="decimal" value={payAmount}
                                                onChange={e => setPayAmount(e.target.value)}
                                                className="w-full text-lg px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                                            />
                                            <button type="button" onClick={() => setPayAmount(balance.toFixed(2))} className="px-3 py-2 text-sm rounded-md border border-teal-400 dark:border-teal-500 text-teal-700 dark:text-teal-300 whitespace-nowrap">{t('pay.full_balance')}</button>
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-1">{t('pay.pay_help', { balance: money(balance) })}</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-full text-lg px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 tabular-nums">{money(balance)}</div>
                                        <p className="text-xs text-neutral-500 mt-1">{t('pay.full_only')}</p>
                                    </>
                                )}
                            </div>

                            {/* Selector de método de pago (solo si hay más de una opción). */}
                            {availableMethods.length > 1 && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1.5">{t('pay.select_method')}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableMethods.map(m => (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={() => setPayMethod(m.key)}
                                                className={`py-2.5 px-3 rounded-md border text-sm font-medium transition ${payMethod === m.key
                                                    ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                                                    : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-200 hover:border-teal-400'}`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {payMethod === 'card' && allowAgil && (inv.agilpayEnabled ? (
                                <AgilPayCardForm
                                    amount={charge}
                                    tax={inv.tax}
                                    t={t}
                                    onSuccess={handleAgilPaySuccess}
                                    chargeFn={async (card) => {
                                        if (!(charge > 0)) return { success: false, reference: '' };
                                        const r = await invoicesService.payPublicAgilPay(token!, card, charge);
                                        return { success: !!r.success, reference: r.reference };
                                    }}
                                />
                            ) : (
                                <p className="text-sm text-center text-neutral-500">{t('pay.card_unavailable')}</p>
                            ))}
                            {payMethod === 'ath' && allowAth && (
                                inv.athEnabled && inv.athPublicToken ? (
                                    <div className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                        <div className="font-medium text-neutral-700 dark:text-neutral-200 mb-2 text-sm">{t('pay.pay_ath')}</div>
                                        {athProcessing || athMsg ? (
                                            <p className={`text-sm text-center py-2 ${athProcessing ? 'text-neutral-500' : 'text-green-700 dark:text-green-300'}`}>{athMsg}</p>
                                        ) : charge > 0 ? (
                                            <AthMovilButton
                                                publicToken={inv.athPublicToken}
                                                environment={inv.athEnv || 'production'}
                                                total={charge}
                                                tax={inv.tax}
                                                items={inv.items.map(it => ({ name: it.name, quantity: it.quantity, price: it.unitPrice }))}
                                                t={t}
                                                onSuccess={handleAthSuccess}
                                                onFail={(m) => setError(m)}
                                            />
                                        ) : (
                                            <p className="text-sm text-neutral-500">{t('pay.ath_amount_gt0')}</p>
                                        )}
                                        <p className="text-xs text-neutral-400 mt-2">{t('pay.ath_auto')}</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 rounded-lg border-l-4 border-teal-400 dark:border-teal-500 bg-teal-50 dark:bg-teal-900/20 p-3">
                                        <svg className="w-5 h-5 flex-shrink-0 text-teal-500 dark:text-teal-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <div className="text-sm text-teal-800 dark:text-teal-200">
                                            <div className="font-semibold mb-0.5">{t('pay.pay_ath_q')}</div>
                                            <p className="text-teal-700/90 dark:text-teal-300/90">{t('pay.ath_manual', { balance: money(balance) })}</p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-xs text-neutral-400 mt-4">{t('pay.secure')}</p>
        </div>
    );
};
