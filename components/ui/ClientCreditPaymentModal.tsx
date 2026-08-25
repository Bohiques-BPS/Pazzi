import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { salesService } from '../../services/sales';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const METHODS = ['Efectivo', 'Tarjeta', 'ATH Móvil', 'Cheque', 'Transferencia'];

interface PendingSale {
    id: string;
    saleNumber?: number | null;
    date: string;
    totalAmount: number;
    balance: number;
}

interface ClientCreditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName?: string;
    /** Se llama tras registrar el abono (para refrescar y/o imprimir comprobante). */
    onPaid?: (info: { total: number; method: string; reference?: string }) => void;
}

/** "Pagos y Créditos a Clientes": abona a varias facturas pendientes distribuyendo el pago. */
export const ClientCreditPaymentModal: React.FC<ClientCreditPaymentModalProps> = ({ isOpen, onClose, clientId, clientName, onPaid }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [sales, setSales] = useState<PendingSale[]>([]);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [method, setMethod] = useState('Efectivo');
    const [reference, setReference] = useState('');
    const [distribute, setDistribute] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !clientId) return;
        let cancelled = false;
        setLoading(true); setAmounts({}); setMethod('Efectivo'); setReference(''); setDistribute('');
        salesService.getAll({ clientId, paymentStatus: 'Pendiente de Pago', isReturn: false })
            .then((data: any[]) => {
                if (cancelled) return;
                const rows: PendingSale[] = (Array.isArray(data) ? data : [])
                    .map(s => {
                        const paid = (s.payments || []).reduce((a: number, p: any) => a + p.amountPaid, 0);
                        return { id: s.id, saleNumber: s.saleNumber, date: s.date, totalAmount: s.totalAmount, balance: r2(s.totalAmount - paid) };
                    })
                    .filter(s => s.balance > 0.001)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // más antiguas primero
                setSales(rows);
            })
            .catch(err => { if (!cancelled && err instanceof ApiError) toast.error(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, clientId]);

    const totalBalance = useMemo(() => r2(sales.reduce((s, x) => s + x.balance, 0)), [sales]);
    const num = (v?: string) => { const n = parseFloat(v ?? ''); return isNaN(n) ? 0 : n; };
    const assigned = useMemo(() => r2(sales.reduce((s, x) => s + Math.min(num(amounts[x.id]), x.balance), 0)), [sales, amounts]);

    const setAmount = (id: string, v: string) => setAmounts(prev => ({ ...prev, [id]: v }));

    // Reparte un total entre las facturas, más antiguas primero.
    const doDistribute = (total: number) => {
        let remaining = total;
        const next: Record<string, string> = {};
        for (const s of sales) {
            const take = Math.min(r2(remaining), s.balance);
            next[s.id] = take > 0 ? take.toFixed(2) : '';
            remaining = r2(remaining - take);
        }
        setAmounts(next);
    };

    const submit = async () => {
        const allocations = sales
            .map(s => ({ saleId: s.id, amount: Math.min(num(amounts[s.id]), s.balance) }))
            .filter(a => a.amount > 0.001)
            .map(a => ({ saleId: a.saleId, amount: r2(a.amount) }));
        if (allocations.length === 0) return toast.error(t('cmpx.credit.enter_amount'));
        setSaving(true);
        try {
            const res = await salesService.bulkPayment({ clientId, method, reference: reference.trim() || undefined, allocations });
            toast.success(t('cmpx.credit.payment_ok', { amount: money(res.total), count: res.count }));
            onPaid?.({ total: res.total, method, reference: reference.trim() || undefined });
            onClose();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('cmpx.credit.payment_error'));
        } finally { setSaving(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('cmpx.credit.title')} — ${clientName || t('common.client')}`} size="2xl">
            {loading ? (
                <LoadingSkeleton variant="table" rows={5} />
            ) : sales.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">{t('cmpx.credit.no_pending')}</p>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-md px-4 py-2">
                        <span className="font-medium text-red-700 dark:text-red-300">{t('cmpx.credit.balance_owed')}</span>
                        <span className="text-xl font-bold text-red-700 dark:text-red-300">{money(totalBalance)}</span>
                    </div>

                    {/* Repartir un total */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-neutral-500">{t('cmpx.credit.distribute')}</span>
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                            <input type="number" min="0" step="0.01" value={distribute} onChange={e => setDistribute(e.target.value)} placeholder="0.00" className={`${INPUT_SM_CLASSES} w-32 pl-5`} />
                        </div>
                        <button type="button" onClick={() => doDistribute(num(distribute))} className={BUTTON_SECONDARY_SM_CLASSES}>{t('cmpx.credit.distribute_oldest')}</button>
                        <button type="button" onClick={() => doDistribute(totalBalance)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('cmpx.credit.pay_all')}</button>
                        <button type="button" onClick={() => setAmounts({})} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-red-600`}>{t('cmpx.credit.clear')}</button>
                    </div>

                    {/* Facturas */}
                    <div className="max-h-[40vh] overflow-y-auto border rounded-md dark:border-neutral-700">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-100 dark:bg-neutral-900 sticky top-0">
                                <tr>
                                    <th className="text-left p-2">{t('cmpx.credit.col_invoice')}</th>
                                    <th className="text-left p-2">{t('common.date')}</th>
                                    <th className="text-right p-2">{t('cmpx.credit.col_balance')}</th>
                                    <th className="text-right p-2 w-32">{t('cmpx.credit.col_pay')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {sales.map(s => (
                                    <tr key={s.id}>
                                        <td className="p-2 font-medium">#{s.saleNumber ?? s.id.slice(0, 6)}</td>
                                        <td className="p-2 text-neutral-500">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="p-2 text-right tabular-nums">{money(s.balance)}</td>
                                        <td className="p-2 text-right">
                                            <input
                                                type="number" min="0" max={s.balance} step="0.01"
                                                value={amounts[s.id] ?? ''}
                                                onChange={e => setAmount(s.id, e.target.value)}
                                                placeholder="0.00"
                                                className={`${INPUT_SM_CLASSES} w-28 text-right tabular-nums`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('cmpx.credit.method')}</label>
                            <select value={method} onChange={e => setMethod(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('cmpx.credit.reference')}</label>
                            <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder={t('cmpx.credit.reference_ph')} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t dark:border-neutral-700 pt-3">
                        <span className="text-sm text-neutral-500">{t('cmpx.credit.assigned')} <b className="text-neutral-800 dark:text-neutral-100">{money(assigned)}</b></span>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                            <button type="button" onClick={submit} disabled={saving || assigned <= 0} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                                {saving ? t('cmpx.credit.saving') : t('cmpx.credit.register_payment', { amount: money(assigned) })}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};
