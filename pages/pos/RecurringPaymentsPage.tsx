import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { recurringService, type RecurringPayment, type CreateRecurringInput } from '../../services/recurring';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const INTERVAL_LABEL: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
const STATUS_LABEL: Record<string, string> = { active: 'Activo', paused: 'Pausado', cancelled: 'Cancelado' };
const STATUS_COLOR: Record<string, string> = { active: 'bg-green-100 text-green-700', paused: 'bg-amber-100 text-amber-700', cancelled: 'bg-neutral-200 text-neutral-500' };

export const RecurringPaymentsPage: React.FC = () => {
    const { clients } = useData();
    const [items, setItems] = useState<RecurringPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    // Form
    const [clientId, setClientId] = useState('');
    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [zip, setZip] = useState('');
    const [amount, setAmount] = useState('');
    const [interval, setInterval] = useState<CreateRecurringInput['interval']>('monthly');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await recurringService.list()); }
        catch (err) { if (err instanceof ApiError) toast.error(err.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const resetForm = () => { setClientId(''); setCard(''); setExpiry(''); setCvv(''); setZip(''); setAmount(''); setInterval('monthly'); setDescription(''); };

    const onCard = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 19); setCard(d.match(/.{1,4}/g)?.join(' ') || d); };
    const onExpiry = (v: string) => { let d = v.replace(/\D/g, '').slice(0, 4); if (d.length >= 2) d = d.slice(0, 2) + '/' + d.slice(2); setExpiry(d); };

    const create = async () => {
        if (!clientId) return toast.error('Selecciona un cliente.');
        if (!amount || Number(amount) <= 0) return toast.error('Ingresa un monto válido.');
        const [mm, yy] = expiry.split('/');
        if (!mm || !yy) return toast.error('Fecha de expiración inválida.');
        setSaving(true);
        try {
            await recurringService.create({
                clientId, card: card.replace(/\s/g, ''), expMonth: mm, expYear: yy, cvv: cvv.replace(/\D/g, ''),
                zipCode: zip || undefined, amount: Number(amount), interval, description: description || undefined,
            });
            toast.success('Pago recurrente creado. Primer cobro realizado.');
            setShowForm(false); resetForm(); load();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el pago recurrente.');
        } finally { setSaving(false); }
    };

    const doAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
        if (action === 'cancel' && !confirm('¿Cancelar este pago recurrente? No se volverá a cobrar.')) return;
        try { await recurringService.setStatus(id, action); load(); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'Error.'); }
    };

    const chargeNow = async (id: string) => {
        try {
            const r = await recurringService.chargeNow(id);
            if (r.status === 'approved') toast.success(`Cobro aprobado. Ref: ${r.reference || '—'}`);
            else toast.warning(`Cobro ${r.status}: ${r.message}`);
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Error al cobrar.'); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Pagos Recurrentes</h1>
                <button onClick={() => setShowForm(s => !s)} className={BUTTON_PRIMARY_SM_CLASSES}>{showForm ? 'Cerrar' : '+ Nuevo pago recurrente'}</button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Cobros automáticos con tarjeta vía AgilPay. La tarjeta se tokeniza (no se guarda el número); el sistema cobra en cada período.</p>

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-primary">Nuevo pago recurrente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Cliente</label>
                            <select value={clientId} onChange={e => setClientId(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
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
                    <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <label className="block text-xs text-neutral-500 mb-1">Tarjeta (se cobra el primer período ahora y se guarda como token)</label>
                        <input type="text" inputMode="numeric" value={card} onChange={e => onCard(e.target.value)} placeholder="Número de tarjeta" className={`${INPUT_SM_CLASSES} w-full mb-2`} autoComplete="off" />
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" inputMode="numeric" value={expiry} onChange={e => onExpiry(e.target.value)} placeholder="MM/AA" className={INPUT_SM_CLASSES} autoComplete="off" />
                            <input type="text" inputMode="numeric" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CVV" className={INPUT_SM_CLASSES} autoComplete="off" />
                            <input type="text" inputMode="numeric" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip" className={INPUT_SM_CLASSES} autoComplete="off" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowForm(false); resetForm(); }} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Procesando…' : 'Crear y cobrar primer período'}</button>
                    </div>
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={4} /> : items.length === 0 ? (
                <EmptyState title="Sin pagos recurrentes" description="Crea uno para cobrar automáticamente a un cliente cada período." />
            ) : (
                <div className="space-y-2">
                    {items.map(rp => (
                        <div key={rp.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[rp.status]}`}>{STATUS_LABEL[rp.status]}</span>
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{rp.clientName}</span>
                                <span className="text-neutral-500">· {money(rp.amount)} {INTERVAL_LABEL[rp.interval]}</span>
                                {rp.cardLast4 && <span className="text-xs text-neutral-400">·•••• {rp.cardLast4}</span>}
                                <span className="text-xs text-neutral-400 ml-auto">Próximo: {rp.status === 'cancelled' ? '—' : new Date(rp.nextChargeDate).toLocaleDateString()}</span>
                            </div>
                            {rp.description && <p className="text-xs text-neutral-500 mt-1">{rp.description}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {rp.status !== 'cancelled' && <button onClick={() => chargeNow(rp.id)} className="text-xs text-primary hover:underline">Cobrar ahora</button>}
                                {rp.status === 'active' && <button onClick={() => doAction(rp.id, 'pause')} className="text-xs text-amber-600 hover:underline">Pausar</button>}
                                {rp.status === 'paused' && <button onClick={() => doAction(rp.id, 'resume')} className="text-xs text-green-600 hover:underline">Reanudar</button>}
                                {rp.status !== 'cancelled' && <button onClick={() => doAction(rp.id, 'cancel')} className="text-xs text-red-600 hover:underline">Cancelar</button>}
                                <button onClick={() => setExpanded(expanded === rp.id ? null : rp.id)} className="text-xs text-neutral-500 hover:underline ml-auto">{expanded === rp.id ? 'Ocultar' : 'Historial'} ({rp.charges.length})</button>
                            </div>
                            {expanded === rp.id && (
                                <table className="min-w-full text-sm mt-2 border-t border-neutral-100 dark:border-neutral-700">
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {rp.charges.length === 0 ? <tr><td className="p-2 text-neutral-400">Sin cobros aún.</td></tr> : rp.charges.map(c => (
                                            <tr key={c.id}>
                                                <td className="p-2">{new Date(c.date).toLocaleString()}</td>
                                                <td className="p-2">{money(c.amount)}</td>
                                                <td className={`p-2 ${c.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{c.status === 'approved' ? 'Aprobado' : c.status === 'declined' ? 'Declinado' : 'Error'}</td>
                                                <td className="p-2 text-neutral-500 text-xs">{c.reference || c.message || ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
