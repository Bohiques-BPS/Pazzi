import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invoicesService, type PublicInvoice } from '../../services/invoices';
import { AgilPayCardForm } from '../../components/pos/AgilPayCardForm';
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
    const [paidOk, setPaidOk] = useState(false);

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

    const cfg = useMemo(() => (inv ? configFrom(inv) : null), [inv]);
    const isPaid = inv?.status === 'paid' || paidOk;

    const handleAgilPaySuccess = async () => {
        setPaidOk(true);
        await load(); // refresca para traer paidMethod/paidReference/paidAt
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
                    </div>
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
                            {inv.agilpayEnabled ? (
                                <AgilPayCardForm
                                    amount={inv.total}
                                    tax={inv.tax}
                                    onSuccess={handleAgilPaySuccess}
                                    chargeFn={async (card) => {
                                        const r = await invoicesService.payPublicAgilPay(token!, card);
                                        return { success: !!r.success, reference: r.reference };
                                    }}
                                />
                            ) : (
                                <p className="text-sm text-center text-neutral-500">El pago con tarjeta no está disponible para este comercio.</p>
                            )}
                            <div className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3 text-sm text-neutral-600 dark:text-neutral-300">
                                <div className="font-medium text-neutral-700 dark:text-neutral-200 mb-1">¿Pagar con ATH Móvil?</div>
                                Envía <span className="font-semibold">{money(inv.total)}</span> por ATH Móvil al comercio. Una vez confirmado el pago, el negocio marcará esta factura como pagada.
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center text-xs text-neutral-400 mt-4">Pazzi · Pago seguro</p>
        </div>
    );
};
