import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoicesService, type PublicInvoice } from '../../services/invoices';
import { AgilPayCardForm } from '../../components/pos/AgilPayCardForm';
import { AthMovilButton } from '../../components/pos/AthMovilButton';
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

    const load = async () => {
        if (!token) return;
        setLoading(true); setError(null);
        try {
            const data = await invoicesService.getPublic(token);
            setInv(data);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo cargar la factura.');
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
    const isPaid = inv?.status === 'paid';
    const balance = inv ? (inv.balance ?? inv.total) : 0;
    // Monto validado para el cobro (no excede el saldo).
    const charge = Math.min(Math.max(0, parseFloat(payAmount.replace(',', '.')) || 0), balance);

    const handleAgilPaySuccess = async () => {
        await load(); // refresca saldo/estado/abonos
    };

    // El cliente completó el pago con el botón de ATH Móvil → verificar y registrar automáticamente.
    const handleAthSuccess = async (referenceNumber: string) => {
        if (!token) return;
        setAthProcessing(true); setAthMsg('Verificando tu pago de ATH Móvil…'); setError(null);
        try {
            const r = await invoicesService.payPublicAthMovil(token, referenceNumber, charge > 0 ? charge : undefined);
            setAthMsg(r.fullyPaid ? '¡Pago recibido! Gracias.' : 'Abono registrado. Gracias.');
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Recibimos tu pago pero no se pudo registrar automáticamente. El comercio lo confirmará.');
            setAthMsg(null);
        } finally { setAthProcessing(false); }
    };

    const downloadPDF = () => {
        if (inv && cfg) generatePDF(saleFrom({ ...inv, status: 'paid' }), cfg);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-neutral-500">Cargando factura…</div>;
    }
    if (error || !inv || !cfg) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="text-5xl mb-3">🧾</div>
                    <p className="text-neutral-600 dark:text-neutral-300">{error || 'Factura no encontrada.'}</p>
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
                    <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{b.businessName || 'Factura'}</h1>
                    {b.rnc && <p className="text-xs text-neutral-500">RNC/Reg: {b.rnc}</p>}
                    {b.address && <p className="text-xs text-neutral-500">{b.address}</p>}
                    {b.phone && <p className="text-xs text-neutral-500">Tel: {b.phone}</p>}
                </div>

                {/* Estado */}
                <div className="px-6 pt-4 flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Factura {inv.number ? `#${inv.number}` : ''}</span>
                    {isPaid
                        ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">✓ Pagada</span>
                        : inv.status === 'partial'
                            ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Pago parcial</span>
                            : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pendiente</span>}
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
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-300"><span>Subtotal</span><span>{money(inv.subtotal)}</span></div>
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-300"><span>IVU</span><span>{money(inv.tax)}</span></div>
                        <div className="flex justify-between text-lg font-bold text-neutral-900 dark:text-white pt-1"><span>Total</span><span>{money(inv.total)}</span></div>
                        {(inv.amountPaid || 0) > 0 && (
                            <>
                                <div className="flex justify-between text-green-700 dark:text-green-400"><span>Pagado</span><span>−{money(inv.amountPaid)}</span></div>
                                <div className="flex justify-between text-base font-bold text-red-600 dark:text-red-400"><span>Saldo</span><span>{money(balance)}</span></div>
                            </>
                        )}
                    </div>

                    {/* Abonos recibidos */}
                    {inv.payments && inv.payments.length > 0 && (
                        <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-2">
                            <p className="text-xs font-semibold text-neutral-500 mb-1">Abonos recibidos</p>
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
                                Pago recibido. ¡Gracias!
                                {inv.paidReference && <div className="text-xs text-neutral-500 mt-1">Ref: {inv.paidReference}</div>}
                            </div>
                            <button onClick={downloadPDF} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-md">
                                📄 Descargar factura (PDF)
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Monto a pagar (permite abonar una parte del saldo). */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">Monto a pagar</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text" inputMode="decimal" value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                        className="w-full text-lg px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700"
                                    />
                                    <button type="button" onClick={() => setPayAmount(balance.toFixed(2))} className="px-3 py-2 text-sm rounded-md border border-teal-400 text-teal-700 dark:text-teal-300 whitespace-nowrap">Saldo completo</button>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">Puedes pagar el saldo completo ({money(balance)}) o una parte.</p>
                            </div>

                            {allowAgil && (inv.agilpayEnabled ? (
                                <AgilPayCardForm
                                    amount={charge}
                                    tax={inv.tax}
                                    onSuccess={handleAgilPaySuccess}
                                    chargeFn={async (card) => {
                                        if (!(charge > 0)) return { success: false, reference: '' };
                                        const r = await invoicesService.payPublicAgilPay(token!, card, charge);
                                        return { success: !!r.success, reference: r.reference };
                                    }}
                                />
                            ) : (
                                <p className="text-sm text-center text-neutral-500">El pago con tarjeta no está disponible para este comercio.</p>
                            ))}
                            {allowAth && (
                                inv.athEnabled && inv.athPublicToken ? (
                                    <div className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                        <div className="font-medium text-neutral-700 dark:text-neutral-200 mb-2 text-sm">Pagar con ATH Móvil</div>
                                        {athProcessing || athMsg ? (
                                            <p className={`text-sm text-center py-2 ${athProcessing ? 'text-neutral-500' : 'text-green-700 dark:text-green-300'}`}>{athMsg}</p>
                                        ) : charge > 0 ? (
                                            <AthMovilButton
                                                publicToken={inv.athPublicToken}
                                                environment={inv.athEnv || 'production'}
                                                total={charge}
                                                tax={inv.tax}
                                                items={inv.items.map(it => ({ name: it.name, quantity: it.quantity, price: it.unitPrice }))}
                                                onSuccess={handleAthSuccess}
                                                onFail={(m) => setError(m)}
                                            />
                                        ) : (
                                            <p className="text-sm text-neutral-500">Ingresa un monto mayor a 0 para pagar con ATH Móvil.</p>
                                        )}
                                        <p className="text-xs text-neutral-400 mt-2">Al completar el pago en tu app ATH Móvil, se registra automáticamente.</p>
                                    </div>
                                ) : (
                                    <div className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3 text-sm text-neutral-600 dark:text-neutral-300">
                                        <div className="font-medium text-neutral-700 dark:text-neutral-200 mb-1">¿Pagar con ATH Móvil?</div>
                                        Envía el monto por ATH Móvil al comercio. Una vez confirmado, el negocio registra tu abono (saldo actual: <span className="font-semibold">{money(balance)}</span>).
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-xs text-neutral-400 mt-4">Pazzi · Pago seguro</p>
        </div>
    );
};
