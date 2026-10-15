import React, { useEffect, useState } from 'react';
import { invoicesService, type Invoice } from '../../services/invoices';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, BUTTON_CLOSE_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { Modal } from '../Modal';
import { InputModal } from '../InputModal';
import { MoneyInput } from '../ui/MoneyInput';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { printInvoicePaymentReceipt } from '../../utils/printInvoicePaymentReceipt';
import type { InvoicePdfBusiness } from '../../utils/invoiceClientPdf';

/**
 * Piezas compartidas de Facturas: modales de link/QR, historial de pagos y registro de abono,
 * datos del negocio para el PDF y el envío por correo con fallback (pedir correo).
 * Las usan la página de Facturas (POS) y la pestaña Facturación del proyecto.
 */

export const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
export const publicLink = (token: string) => `${window.location.origin}/pay/${token}`;

export const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    partial: { label: 'Pago parcial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelled: { label: 'Cancelada', cls: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300' },
};

/** Modal que muestra el link público + QR de una factura. */
export const ShareModal: React.FC<{ invoice: Invoice | null; onClose: () => void }> = ({ invoice, onClose }) => {
    const { t } = useTranslation();
    const [qr, setQr] = useState<string>('');
    const link = invoice ? publicLink(invoice.publicToken) : '';

    useEffect(() => {
        let alive = true;
        if (invoice) {
            import('qrcode').then(QR => QR.toDataURL(link, { width: 240, margin: 1 }))
                .then(url => { if (alive) setQr(url); })
                .catch(() => { if (alive) setQr(''); });
        } else { setQr(''); }
        return () => { alive = false; };
    }, [invoice, link]);

    const copy = async () => {
        try { await navigator.clipboard.writeText(link); toast.success(t('posx.invoices.share_copy_ok')); }
        catch { toast.error(t('posx.invoices.share_copy_fail')); }
    };

    return (
        <Modal isOpen={!!invoice} onClose={onClose} title={t('posx.invoices.share_title', { num: invoice?.number ? `#${invoice.number}` : '' })} size="sm">
            <div className="space-y-4 text-center">
                <p className="text-sm text-neutral-500">{t('posx.invoices.share_desc')}</p>
                {qr ? <img src={qr} alt="QR" className="mx-auto rounded-md border border-neutral-200 dark:border-neutral-700" /> : <div className="h-40 flex items-center justify-center text-neutral-400">{t('posx.invoices.generating_qr')}</div>}
                <div className="flex gap-2">
                    <input readOnly value={link} className={`${INPUT_SM_CLASSES} w-full text-xs`} onFocus={e => e.target.select()} />
                    <button onClick={copy} className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.invoices.copy')}</button>
                </div>
                <a href={link} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">{t('posx.invoices.open_client_view')}</a>
            </div>
        </Modal>
    );
};

/** Modal de SOLO LECTURA: historial de abonos/pagos de una factura. */
export const PaymentsModal: React.FC<{ invoice: Invoice | null; onClose: () => void; onAddPayment?: () => void }> = ({ invoice, onClose, onAddPayment }) => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    if (!invoice) return null;
    const payments = [...(invoice.payments || [])].sort((a, b) => new Date(a.paidAt || 0).getTime() - new Date(b.paidAt || 0).getTime());
    const paid = invoice.amountPaid ?? payments.reduce((s, p) => s + (p.amount || 0), 0);
    const balance = Math.max(0, (invoice.total || 0) - paid);
    const st = INVOICE_STATUS[invoice.status];
    // Se puede abonar mientras quede saldo y la factura no esté anulada.
    const canAddPayment = !!onAddPayment && balance > 0.001 && invoice.status !== 'cancelled' && invoice.status !== 'paid';
    const store = { businessName: (settings as any)?.receiptConfig?.businessName, address: (settings as any)?.receiptConfig?.address, phone: (settings as any)?.receiptConfig?.phone };
    // Imprime (→ guardar como PDF) un recibo del abono i (0-based). El acumulado incluye hasta ese abono.
    const printAbono = (i: number) => {
        const p = payments[i];
        const paidTotal = payments.slice(0, i + 1).reduce((s, x) => s + (x.amount || 0), 0);
        printInvoicePaymentReceipt({ invoiceNumber: invoice.number, clientName: invoice.clientName, payment: p, total: invoice.total || 0, paidTotal, index: i + 1 }, store);
    };
    return (
        <Modal isOpen={!!invoice} onClose={onClose} title={`Pagos de la factura${invoice.number ? ` #${invoice.number}` : ''}`} size="lg">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">
                        {invoice.clientName ? <span className="font-medium">{invoice.clientName}</span> : <span className="text-neutral-400">Sin cliente</span>}
                    </div>
                    {st && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>}
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700">
                        <p className="text-[11px] uppercase tracking-wide text-neutral-400">Total</p>
                        <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">{money(invoice.total || 0)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-[11px] uppercase tracking-wide text-green-600 dark:text-green-400">Pagado</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">{money(paid)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-[11px] uppercase tracking-wide text-red-600 dark:text-red-400">Saldo</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{money(balance)}</p>
                    </div>
                </div>

                {/* Lista de abonos */}
                {payments.length === 0 ? (
                    <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-6">Esta factura aún no tiene abonos registrados.</p>
                ) : (
                    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                                <tr>
                                    <th className="text-left font-medium px-3 py-2">#</th>
                                    <th className="text-left font-medium px-3 py-2">Fecha</th>
                                    <th className="text-left font-medium px-3 py-2">Método</th>
                                    <th className="text-left font-medium px-3 py-2">Referencia</th>
                                    <th className="text-right font-medium px-3 py-2">Monto</th>
                                    <th className="text-right font-medium px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, i) => (
                                    <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-700/60">
                                        <td className="px-3 py-2 text-neutral-400 tabular-nums">{i + 1}</td>
                                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{p.method || '—'}</td>
                                        <td className="px-3 py-2 text-neutral-400 dark:text-neutral-500 truncate max-w-[220px]">{p.reference || ''}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400 tabular-nums">{money(p.amount)}</td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => printAbono(i)}
                                                title="Descargar recibo de este abono"
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                Recibo
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-neutral-50 dark:bg-neutral-900/40">
                                <tr className="border-t border-neutral-200 dark:border-neutral-700">
                                    <td colSpan={4} className="px-3 py-2 text-right font-medium text-neutral-500 dark:text-neutral-400">Total pagado</td>
                                    <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400 tabular-nums">{money(paid)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                <p className="text-xs text-neutral-400">{t('posx.invoices.payments_ro_note') || 'Para editar o eliminar un abono ya registrado usa Editar en la factura (pide PIN de supervisor).'}</p>
                <div className="flex justify-between items-center pt-1 gap-2">
                    {canAddPayment
                        ? <button onClick={() => onAddPayment!()} className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.invoices.abonos_add') || '+ Añadir abono'}</button>
                        : <span />}
                    <button onClick={onClose} className={BUTTON_CLOSE_SM_CLASSES}>{t('common.close') || 'Cerrar'}</button>
                </div>
            </div>
        </Modal>
    );
};

/** Métodos de cobro para registrar un abono manualmente. */
export const PAY_METHODS = ['ATH Móvil', 'AgilPay / Tarjeta', 'Efectivo', 'Transferencia', 'Cheque', 'Otro'];
/** Hoy en YYYY-MM-DD local (lo que usa <input type="date">). */
export const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** "YYYY-MM-DD" -> ISO al mediodía local, para que el día no se corra por zona horaria. */
export const fechaAIso = (v: string) => new Date(`${v}T12:00:00`).toISOString();
/** Fecha guardada -> YYYY-MM-DD local (hoy si no hay). */
export const isoAFecha = (iso?: string | null) => { if (!iso) return hoyISO(); const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Modal con diseño de formulario para registrar un abono/pago a una factura. */
export const PayModal: React.FC<{ invoice: Invoice | null; onClose: () => void; onDone: () => void }> = ({ invoice, onClose, onDone }) => {
    const { t } = useTranslation();
    const balance = invoice ? Math.max(0, (invoice.total || 0) - (invoice.amountPaid || 0)) : 0;
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState(PAY_METHODS[0]);
    const [reference, setReference] = useState('');
    // Fecha del abono: hoy por defecto; se cambia solo si el pago fue otro día.
    const [date, setDate] = useState(hoyISO());
    const [saving, setSaving] = useState(false);

    // Al abrir, precargar el saldo pendiente y limpiar el resto.
    useEffect(() => {
        if (invoice) { setAmount(balance.toFixed(2)); setMethod(PAY_METHODS[0]); setReference(''); setDate(hoyISO()); }
    }, [invoice]); // eslint-disable-line

    const submit = async () => {
        if (!invoice) return;
        const amt = parseFloat(String(amount).replace(',', '.'));
        if (!(amt > 0)) return toast.error(t('posx.invoices.err_amount'));
        if (amt > balance + 0.001) return toast.error(t('posx.invoices.err_amount_over', { balance: money(balance) }));
        setSaving(true);
        try {
            const res: any = await invoicesService.markPaid(invoice.id, { method, reference: reference.trim() || undefined, amount: amt, paidAt: date !== hoyISO() ? fechaAIso(date) : undefined });
            toast.success(t('posx.invoices.payment_recorded'));
            // El recibo se envía en segundo plano: avisamos si hay correo destino (o si no lo hay).
            if (res?.emailQueued && res?.emailTo) toast.success(t('posx.invoices.receipt_sending', { email: res.emailTo }) || `Enviando el recibo a ${res.emailTo}…`);
            else if (!res?.emailTo) toast.warning(t('posx.invoices.no_client_email') || 'El cliente no tiene correo; no se enviará el recibo.');
            onDone(); onClose();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.invoices.err_payment')); }
        finally { setSaving(false); }
    };

    const labelCls = 'block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1';

    return (
        <Modal isOpen={!!invoice} onClose={onClose} title={t('posx.invoices.pay_title', { num: invoice?.number ? `#${invoice.number}` : '' })} size="sm">
            <div className="space-y-4">
                {/* Resumen del saldo */}
                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-700/40 rounded-md px-3 py-2 text-sm">
                    <span className="text-neutral-500">{t('pos.receivable.col.balance')}</span>
                    <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">{money(balance)}</span>
                </div>

                <div>
                    <label className={labelCls}>{t('posx.invoices.pay_amount')}</label>
                    <div className="flex gap-2">
                        <div className="flex-1"><MoneyInput value={amount} onChange={setAmount} onEnter={submit} autoFocus placeholder={t('posx.invoices.amount_placeholder')} className={`${INPUT_SM_CLASSES} w-full text-lg tabular-nums`} /></div>
                        <button type="button" onClick={() => setAmount(balance.toFixed(2))} className={`${BUTTON_SECONDARY_SM_CLASSES} whitespace-nowrap`}>{t('pay.full_balance')}</button>
                    </div>
                </div>

                <div>
                    <label className={labelCls}>{t('posx.invoices.pay_method')}</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                        {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div>
                    <label className={labelCls}>{t('posx.invoices.abonos_date')}</label>
                    <input type="date" value={date} max={hoyISO()} onChange={e => setDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} />
                </div>
                <div>
                    <label className={labelCls}>{t('posx.invoices.pay_reference')} <span className="text-neutral-400 text-xs font-normal">{t('cmp.onb.optional')}</span></label>
                    <input
                        type="text" value={reference} onChange={e => setReference(e.target.value)}
                        placeholder={t('posx.invoices.pay_reference_ph')} className={`${INPUT_SM_CLASSES} w-full`}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <button type="button" onClick={onClose} disabled={saving} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="button" onClick={submit} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {saving ? t('cmpx.agilpay.processing') : t('posx.invoices.pay_submit')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

/** Datos del negocio para el encabezado del PDF de factura (de la Configuración de la Factura). */
export function invoicePdfBusinessFromSettings(settings: any): InvoicePdfBusiness {
    const rc: any = settings?.receiptConfig || {};
    const id: any = rc.invoiceDesign || {};
    // Qué datos del negocio salen en la factura (Config. Factura). showBusiness/showLogo/showClient
    // vienen del diseño de factura; dirección/teléfono/correo/RNC usan los toggles del recibo.
    const design = {
        showLogo: id.showLogo, showBusiness: id.showBusiness, showClient: id.showClient,
        // Granulares: usa el toggle del diseño de factura; si no está definido, cae al del recibo.
        showAddress: id.showAddress ?? rc.showAddress, showPhone: id.showPhone ?? rc.showPhone,
        showEmail: id.showEmail ?? rc.showEmail, showRnc: id.showRnc ?? rc.showRnc,
        showLineDescription: id.showLineDescription,
    };
    // Tasas IVU para desglosar Estatal/Municipal en el PDF (solo si el breakdown está activo).
    const taxStateRate = settings?.taxBreakdownEnabled ? (Number(settings.taxStateRate) || 0) : 0;
    const taxMunicipalRate = settings?.taxBreakdownEnabled ? (Number(settings.taxMunicipalRate) || 0) : 0;
    return { businessName: rc.businessName, rnc: rc.rnc, address: rc.address, phone: rc.phone, email: rc.email, logoUrl: rc.logoUrl, design, taxStateRate, taxMunicipalRate };
}

/**
 * Envío de una factura por correo. Si el servidor no encuentra correo del cliente, abre un modal
 * para pedirlo y reintenta. Devuelve `send(inv)` y el `modal` que hay que renderizar.
 */
export function useInvoiceEmailSender() {
    const { t } = useTranslation();
    const [emailFor, setEmailFor] = useState<Invoice | null>(null);

    const send = async (inv: Invoice) => {
        try {
            const r = await invoicesService.send(inv.id);
            toast.success(t('posx.invoices.sent_to', { to: r.to }));
        } catch {
            // Si no hay correo del cliente, lo pedimos con un modal y reintentamos.
            setEmailFor(inv);
        }
    };

    const confirm = async (to: string) => {
        if (!emailFor) return;
        const inv = emailFor;
        setEmailFor(null);
        try {
            const r = await invoicesService.send(inv.id, to.trim());
            toast.success(t('posx.invoices.sent_to', { to: r.to }));
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : t('posx.invoices.err_send'));
        }
    };

    const modal = (
        <InputModal
            isOpen={!!emailFor}
            title={t('posx.invoices.send_email_title') || 'Enviar factura por correo'}
            label={t('posx.invoices.prompt_email') || 'Correo del cliente:'}
            placeholder="cliente@correo.com"
            inputType="email"
            confirmText={t('posx.invoices.send') || 'Enviar'}
            cancelText={t('common.cancel') || 'Cancelar'}
            onConfirm={confirm}
            onClose={() => setEmailFor(null)}
        />
    );

    return { send, modal };
}

/** Copia el link público de pago de una factura al portapapeles. */
export async function copyInvoiceLink(inv: Invoice, t: (k: string, p?: any) => string) {
    try { await navigator.clipboard.writeText(publicLink(inv.publicToken)); toast.success(t('posx.invoices.share_copy_ok')); }
    catch { toast.error(t('posx.invoices.share_copy_fail')); }
}
