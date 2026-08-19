import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { recurringService, type RecurringPayment, type RecurringCharge, type CreateRecurringInput, type RecurringMode, type LinkMethod } from '../../services/recurring';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const INTERVAL_LABEL: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
const STATUS_LABEL: Record<string, string> = { active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado' };
const STATUS_COLOR: Record<string, string> = { active: 'bg-green-100 text-green-700', paused: 'bg-amber-100 text-amber-700', cancelled: 'bg-neutral-200 text-neutral-500' };

// Estado de pago de un período (para el modo factura + link, y compat con el modo cobro).
const PAY_LABEL: Record<string, string> = {
    approved: 'Aprobado', declined: 'Declinado', error: 'Error',
    paid: 'Pagó', partial: 'Abono parcial', pending: 'Pendiente', overdue: 'No pagó', cancelled: 'Cancelada',
};
const PAY_COLOR: Record<string, string> = {
    approved: 'text-green-600', paid: 'text-green-600',
    partial: 'text-amber-600', pending: 'text-neutral-500',
    overdue: 'text-red-600', declined: 'text-red-600', error: 'text-red-600', cancelled: 'text-neutral-400',
};
const PAY_BADGE: Record<string, string> = {
    approved: 'bg-green-100 text-green-700', paid: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700', pending: 'bg-neutral-100 text-neutral-600',
    overdue: 'bg-red-100 text-red-700', declined: 'bg-red-100 text-red-700', error: 'bg-red-100 text-red-700', cancelled: 'bg-neutral-100 text-neutral-500',
};

const payState = (c: RecurringCharge) => c.payState || c.status;

export const RecurringPaymentsPage: React.FC = () => {
    const { clients } = useData();
    const [items, setItems] = useState<RecurringPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    // Form
    const [mode, setMode] = useState<RecurringMode>('invoice_link');
    const [clientId, setClientId] = useState('');
    const [amount, setAmount] = useState('');
    const [interval, setInterval] = useState<CreateRecurringInput['interval']>('monthly');
    const [description, setDescription] = useState('');
    // auto_charge
    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [zip, setZip] = useState('');
    // invoice_link
    const [email, setEmail] = useState('');
    const [methods, setMethods] = useState<LinkMethod[]>(['agilpay', 'ath']);
    const [graceDays, setGraceDays] = useState('3');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await recurringService.list()); }
        catch (err) { if (err instanceof ApiError) toast.error(err.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const resetForm = () => {
        setClientId(''); setAmount(''); setInterval('monthly'); setDescription('');
        setCard(''); setExpiry(''); setCvv(''); setZip('');
        setEmail(''); setMethods(['agilpay', 'ath']); setGraceDays('3');
    };

    const onCard = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 19); setCard(d.match(/.{1,4}/g)?.join(' ') || d); };
    const onExpiry = (v: string) => { let d = v.replace(/\D/g, '').slice(0, 4); if (d.length >= 2) d = d.slice(0, 2) + '/' + d.slice(2); setExpiry(d); };

    // Al elegir cliente en modo factura, precargar su correo.
    const onSelectClient = (id: string) => {
        setClientId(id);
        const c = clients.find(c => c.id === id);
        if (c?.email && !email) setEmail(c.email);
    };

    const toggleMethod = (m: LinkMethod) => setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

    const create = async () => {
        if (!clientId) return toast.error('Selecciona un cliente.');
        if (!amount || Number(amount) <= 0) return toast.error('Ingresa un monto válido.');

        const base: CreateRecurringInput = { clientId, mode, amount: Number(amount), interval, description: description || undefined };

        if (mode === 'invoice_link') {
            if (methods.length === 0) return toast.error('Selecciona al menos un método de pago para el link.');
            const client = clients.find(c => c.id === clientId);
            const finalEmail = (email || client?.email || '').trim();
            if (!finalEmail) return toast.error('El cliente no tiene correo. Escribe uno para enviarle la factura.');
            base.email = finalEmail;
            base.linkMethods = methods;
            base.graceDays = Math.max(0, Number(graceDays) || 0);
        } else {
            const [mm, yy] = expiry.split('/');
            if (!mm || !yy) return toast.error('Fecha de expiración inválida.');
            base.card = card.replace(/\s/g, '');
            base.expMonth = mm; base.expYear = yy;
            base.cvv = cvv.replace(/\D/g, '');
            base.zipCode = zip || undefined;
        }

        setSaving(true);
        try {
            await recurringService.create(base);
            toast.success(mode === 'invoice_link' ? 'Recurrente creado. Primera factura enviada.' : 'Pago recurrente creado. Primer cobro realizado.');
            setShowForm(false); resetForm(); load();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el pago recurrente.');
        } finally { setSaving(false); }
    };

    const doAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
        if (action === 'cancel' && !confirm('¿Cancelar este pago recurrente? No se volverá a cobrar/facturar.')) return;
        try { await recurringService.setStatus(id, action); load(); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'Error.'); }
    };

    const chargeNow = async (rp: RecurringPayment) => {
        try {
            const r = await recurringService.chargeNow(rp.id);
            if (rp.mode === 'invoice_link') toast.success(r.message || 'Factura enviada.');
            else if (r.status === 'approved') toast.success(`Cobro aprobado. Ref: ${r.reference || '—'}`);
            else toast.warning(`Cobro ${r.status}: ${r.message}`);
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Error.'); }
    };

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/#/pay/${token}`;
        navigator.clipboard?.writeText(url).then(() => toast.success('Link de pago copiado.'), () => toast.error('No se pudo copiar.'));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Pagos Recurrentes</h1>
                <button onClick={() => setShowForm(s => !s)} className={BUTTON_PRIMARY_SM_CLASSES}>{showForm ? 'Cerrar' : '+ Nuevo pago recurrente'}</button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Dos modos por período: <b>cobro automático</b> con tarjeta tokenizada (AgilPay), o <b>factura + link</b> que se envía por correo para que el cliente pague (ATH Móvil y/o AgilPay). En modo factura, la lista muestra si pagó o no.</p>

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-primary">Nuevo pago recurrente</h3>

                    {/* Selector de modo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" onClick={() => setMode('invoice_link')}
                            className={`text-left p-3 rounded-lg border ${mode === 'invoice_link' ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-neutral-200 dark:border-neutral-700'}`}>
                            <div className="font-medium text-sm">📧 Factura + link</div>
                            <div className="text-xs text-neutral-500">Envía la factura cada período; el cliente paga con el link (ATH/AgilPay).</div>
                        </button>
                        <button type="button" onClick={() => setMode('auto_charge')}
                            className={`text-left p-3 rounded-lg border ${mode === 'auto_charge' ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-neutral-200 dark:border-neutral-700'}`}>
                            <div className="font-medium text-sm">💳 Cobro automático</div>
                            <div className="text-xs text-neutral-500">Cobra la tarjeta tokenizada automáticamente cada período.</div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Cliente</label>
                            <select value={clientId} onChange={e => onSelectClient(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                <option value="">Selecciona…</option>
                                {clients.filter(c => !c.isDefault).map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Monto por período</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Frecuencia</label>
                            <select value={interval} onChange={e => setInterval(e.target.value as any)} className={`${INPUT_SM_CLASSES} w-full`}>
                                <option value="weekly">Semanal</option>
                                <option value="biweekly">Quincenal</option>
                                <option value="monthly">Mensual</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Descripción (opcional)</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Membresía mensual" className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>

                    {mode === 'invoice_link' ? (
                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Correo del cliente (se le envía la factura)</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className={`${INPUT_SM_CLASSES} w-full`} autoComplete="off" />
                                </div>
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Holgura (días de tolerancia para pagar)</label>
                                    <input type="number" min={0} value={graceDays} onChange={e => setGraceDays(e.target.value)} placeholder="3" className={`${INPUT_SM_CLASSES} w-full`} />
                                    <p className="text-[11px] text-neutral-400 mt-1">Tras vencer + estos días sin pago, el período se marca <b>“No pagó”</b>.</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">Métodos de pago que ofrece el link</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={methods.includes('agilpay')} onChange={() => toggleMethod('agilpay')} className="h-4 w-4" />
                                        💳 AgilPay (tarjeta)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={methods.includes('ath')} onChange={() => toggleMethod('ath')} className="h-4 w-4" />
                                        📱 ATH Móvil
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
                            <label className="block text-xs text-neutral-500 mb-1">Tarjeta (se cobra el primer período ahora y se guarda como token)</label>
                            <input type="text" inputMode="numeric" value={card} onChange={e => onCard(e.target.value)} placeholder="Número de tarjeta" className={`${INPUT_SM_CLASSES} w-full mb-2`} autoComplete="off" />
                            <div className="grid grid-cols-3 gap-2">
                                <input type="text" inputMode="numeric" value={expiry} onChange={e => onExpiry(e.target.value)} placeholder="MM/AA" className={INPUT_SM_CLASSES} autoComplete="off" />
                                <input type="text" inputMode="numeric" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CVV" className={INPUT_SM_CLASSES} autoComplete="off" />
                                <input type="text" inputMode="numeric" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip" className={INPUT_SM_CLASSES} autoComplete="off" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowForm(false); resetForm(); }} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                            {saving ? 'Procesando…' : mode === 'invoice_link' ? 'Crear y enviar primera factura' : 'Crear y cobrar primer período'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={4} /> : items.length === 0 ? (
                <EmptyState title="Sin pagos recurrentes" description="Crea uno para cobrar o facturar automáticamente a un cliente cada período." />
            ) : (
                <div className="space-y-2">
                    {items.map(rp => {
                        const isInvoice = rp.mode === 'invoice_link';
                        const cur = rp.currentState;
                        return (
                        <div key={rp.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[rp.status]}`}>{STATUS_LABEL[rp.status]}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isInvoice ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{isInvoice ? '📧 Factura + link' : '💳 Cobro auto'}</span>
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{rp.clientName}</span>
                                <span className="text-neutral-500">· {money(rp.amount)} {INTERVAL_LABEL[rp.interval]}</span>
                                {!isInvoice && rp.cardLast4 && <span className="text-xs text-neutral-400">·•••• {rp.cardLast4}</span>}
                                {isInvoice && cur && <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_BADGE[cur] || 'bg-neutral-100 text-neutral-600'}`}>{PAY_LABEL[cur] || cur}</span>}
                                <span className="text-xs text-neutral-400 ml-auto">Próx{isInvoice ? '. factura' : '. cobro'}: {rp.status === 'cancelled' ? '—' : new Date(rp.nextChargeDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-neutral-500">
                                {rp.description && <span>{rp.description}</span>}
                                {isInvoice && rp.clientEmail && <span>· ✉ {rp.clientEmail}</span>}
                                {isInvoice && <span>· Link: {(rp.linkMethods || 'agilpay,ath').split(',').map(m => m === 'ath' ? 'ATH Móvil' : 'AgilPay').join(' + ')}</span>}
                                {isInvoice && (rp.graceDays ?? 0) > 0 && <span>· Holgura: {rp.graceDays} día(s)</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {rp.status !== 'cancelled' && <button onClick={() => chargeNow(rp)} className="text-xs text-primary hover:underline">{isInvoice ? 'Enviar factura ahora' : 'Cobrar ahora'}</button>}
                                {rp.status === 'active' && <button onClick={() => doAction(rp.id, 'pause')} className="text-xs text-amber-600 hover:underline">Pausar</button>}
                                {rp.status === 'paused' && <button onClick={() => doAction(rp.id, 'resume')} className="text-xs text-green-600 hover:underline">Reanudar</button>}
                                {rp.status !== 'cancelled' && <button onClick={() => doAction(rp.id, 'cancel')} className="text-xs text-red-600 hover:underline">Cancelar</button>}
                                <button onClick={() => setExpanded(expanded === rp.id ? null : rp.id)} className="text-xs text-neutral-500 hover:underline ml-auto">{expanded === rp.id ? 'Ocultar' : 'Historial'} ({rp.charges.length})</button>
                            </div>
                            {expanded === rp.id && (
                                <table className="min-w-full text-sm mt-2 border-t border-neutral-100 dark:border-neutral-700">
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {rp.charges.length === 0 ? <tr><td className="p-2 text-neutral-400">Sin movimientos aún.</td></tr> : rp.charges.map(c => {
                                            const st = payState(c);
                                            return (
                                            <tr key={c.id}>
                                                <td className="p-2 whitespace-nowrap">{new Date(c.date).toLocaleDateString()}</td>
                                                <td className="p-2">{money(c.amount)}</td>
                                                <td className={`p-2 font-medium ${PAY_COLOR[st] || 'text-neutral-500'}`}>{PAY_LABEL[st] || st}</td>
                                                <td className="p-2 text-neutral-500 text-xs">
                                                    {c.reference || c.message || ''}
                                                    {c.invoiceToken && (st === 'pending' || st === 'overdue' || st === 'partial') && (
                                                        <button onClick={() => copyLink(c.invoiceToken!)} className="ml-2 text-primary hover:underline">Copiar link</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );})}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
