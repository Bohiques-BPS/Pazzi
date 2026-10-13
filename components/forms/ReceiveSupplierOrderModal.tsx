import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import {
    supplierOrdersService,
    supplierItemPending,
    supplierOrderReceiveProgress,
    parseSupplierOrderDay,
    displaySupplierOrderStatus,
    type SupplierOrderRecord,
} from '../../services/supplierOrders';
import { productsService } from '../../services/products';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import type { SupplierOrder } from '../../types';

interface ReceiveSupplierOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrderRecord | null;
    onReceived?: (updated: SupplierOrderRecord) => void;
}

type StockRow = { branchId: string; quantity: number };

/** Trae el stock actual de varios productos (de a pocos, para no saturar el backend). */
async function fetchStocks(productIds: string[]): Promise<Record<string, { stockByBranch: StockRow[]; lastCost?: number }>> {
    const out: Record<string, { stockByBranch: StockRow[]; lastCost?: number }> = {};
    const ids = Array.from(new Set(productIds));
    for (let i = 0; i < ids.length; i += 5) {
        const chunk = ids.slice(i, i + 5);
        const results = await Promise.allSettled(chunk.map(id => productsService.getById(id)));
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                out[chunk[idx]] = {
                    stockByBranch: (r.value.stockByBranch || []).map((s: any) => ({ branchId: s.branchId, quantity: Number(s.quantity) || 0 })),
                    lastCost: r.value.lastCost ?? undefined,
                };
            }
        });
    }
    return out;
}

export const ReceiveSupplierOrderModal: React.FC<ReceiveSupplierOrderModalProps> = ({
    isOpen,
    onClose,
    order,
    onReceived,
}) => {
    const { t } = useTranslation();
    const { branches, products, setProducts, setSupplierOrders } = useData();
    const activeBranches = useMemo(() => branches.filter(b => b.isActive), [branches]);

    const [branchId, setBranchId] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    /** Cantidad a recibir por línea (itemId → texto del input). */
    const [qty, setQty] = useState<Record<string, string>>({});
    /** Stock fresco de los productos de la orden (la lista global solo trae una página). */
    const [stocks, setStocks] = useState<Record<string, { stockByBranch: StockRow[] }>>({});
    /** Versión fresca de la orden tras un conflicto (otra persona recibió a la vez). */
    const [freshOrder, setFreshOrder] = useState<SupplierOrderRecord | null>(null);

    const current = freshOrder && order && freshOrder.id === order.id ? freshOrder : order;

    const resetQuantities = (o: SupplierOrderRecord | null) => {
        const next: Record<string, string> = {};
        (o?.items || []).forEach(i => { next[i.id] = String(supplierItemPending(i)); });
        setQty(next);
    };

    useEffect(() => {
        if (!isOpen || !order) return;
        setBranchId(prev => (prev && activeBranches.some(b => b.id === prev)) ? prev : (activeBranches[0]?.id || ''));
        setNotes('');
        setError(null);
        setFreshOrder(null);
        resetQuantities(order);
        let cancelled = false;
        fetchStocks(order.items.map(i => i.productId))
            .then(map => { if (!cancelled) setStocks(map); })
            .catch(() => { /* se usa el stock del contexto */ });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, order?.id]);

    useEffect(() => {
        if (isOpen && !branchId && activeBranches[0]?.id) setBranchId(activeBranches[0].id);
    }, [isOpen, branchId, activeBranches]);

    if (!isOpen || !current) return null;

    const stockFor = (productId: string): number => {
        const fresh = stocks[productId]?.stockByBranch;
        const list = fresh || products.find(p => p.id === productId)?.stockByBranch || [];
        return list.find(sb => sb.branchId === branchId)?.quantity ?? 0;
    };

    const parseQty = (itemId: string, pending: number): number => {
        const n = Math.floor(Number(qty[itemId]));
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(n, pending);
    };

    const rows = current.items.map(item => {
        const pending = supplierItemPending(item);
        const toReceive = parseQty(item.id, pending);
        const currentStock = stockFor(item.productId);
        return {
            ...item,
            productName: item.product?.name || products.find(p => p.id === item.productId)?.name || item.productId,
            received: item.quantityReceived || 0,
            pending,
            toReceive,
            currentStock,
            stockAfter: currentStock + toReceive,
        };
    });

    const progress = supplierOrderReceiveProgress(current);
    const totalToReceive = rows.reduce((s, r) => s + r.toReceive, 0);
    const pctAfter = progress.ordered > 0 ? Math.round(((progress.received + totalToReceive) / progress.ordered) * 100) : 0;
    const completesOrder = progress.pending > 0 && totalToReceive >= progress.pending;

    /** Tras recibir: refresca stock (y último costo) de los productos que están en la lista global. */
    const refreshProductStock = async (productIds: string[]) => {
        const loaded = new Set(products.map(p => p.id));
        const ids = productIds.filter(id => loaded.has(id));
        if (ids.length === 0) return;
        const map = await fetchStocks(ids);
        setProducts(prev => prev.map(p => map[p.id]
            ? { ...p, stockByBranch: map[p.id].stockByBranch, ...(map[p.id].lastCost !== undefined ? { lastCost: map[p.id].lastCost } : {}) }
            : p));
    };

    const refreshOrders = async (): Promise<SupplierOrderRecord[] | null> => {
        try {
            const list = await supplierOrdersService.getAll();
            if (Array.isArray(list)) {
                setSupplierOrders(list as unknown as SupplierOrder[]);
                return list;
            }
        } catch { /* noop: se queda con la versión local */ }
        return null;
    };

    const handleConfirm = async () => {
        if (!branchId) {
            setError(t('cmpx.receiveorder.err_branch'));
            return;
        }
        const items = rows.filter(r => r.pending > 0).map(r => ({ itemId: r.id, quantity: r.toReceive }));
        if (items.every(i => i.quantity <= 0)) {
            setError(t('cmpx.receiveorder.err_no_qty'));
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await supplierOrdersService.receive(current.id, {
                branchId,
                notes: notes.trim() || undefined,
                items,
            });
            toast.success(res.message);
            setSupplierOrders(prev => prev.map(o => o.id === res.order.id ? (res.order as unknown as SupplierOrder) : o));
            onReceived?.(res.order);
            onClose();
            // En segundo plano: lista de órdenes y stock de los productos recibidos.
            refreshOrders();
            refreshProductStock(items.filter(i => i.quantity > 0).map(i => rows.find(r => r.id === i.itemId)!.productId)).catch(() => {});
        } catch (err) {
            if (err instanceof ApiError && err.code === 'RECEIVE_CONFLICT') {
                setError(err.message);
                // Otra persona recibió a la vez: recargar lo pendiente.
                const list = await refreshOrders();
                const updated = list?.find(o => o.id === current.id) || null;
                if (updated) { setFreshOrder(updated); resetQuantities(updated); }
            } else {
                setError(err instanceof ApiError ? err.message : t('cmpx.receiveorder.err_receive'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const orderDay = parseSupplierOrderDay(current.orderDate);

    const footer = (
        <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                {t('common.cancel')}
            </button>
            <button type="button" onClick={handleConfirm} className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting || !branchId || totalToReceive <= 0}>
                {submitting ? t('cmpx.receiveorder.submitting') : t('cmpx.receiveorder.submit')}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.receiveorder.title', { id: current.id.slice(0, 8).toUpperCase() })} size="3xl" footer={footer}>
            <div className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 flex items-center text-red-700 dark:text-red-300 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-700/50 text-sm space-y-0.5">
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.receiveorder.supplier')}</span>
                        <span className="font-medium">{current.supplier?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.receiveorder.order_date')}</span>
                        <span>{orderDay ? orderDay.toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.receiveorder.status')}</span>
                        <span>{displaySupplierOrderStatus(current.status)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span>{t('cmpx.receiveorder.total_cost')}</span>
                        <span>${current.totalCost.toFixed(2)}</span>
                    </div>
                </div>

                {/* Progreso de recepción: lo ya recibido y cómo queda tras esta recepción. */}
                <div>
                    <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-300 mb-1">
                        <span>{t('cmpx.receiveorder.progress', { received: progress.received, ordered: progress.ordered })}</span>
                        <span>{totalToReceive > 0 ? t('cmpx.receiveorder.progress_after', { pct: pctAfter }) : `${progress.pct}%`}</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-primary/40" style={{ width: `${Math.min(100, pctAfter)}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${Math.min(100, progress.pct)}%` }} />
                    </div>
                    {totalToReceive > 0 && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {completesOrder ? t('cmpx.receiveorder.will_complete') : t('cmpx.receiveorder.will_be_partial')}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.receiveorder.dest_branch')}</label>
                    <select value={branchId} onChange={e => setBranchId(e.target.value)} className={inputFormStyle} required>
                        <option value="">{t('cmpx.common.select_ph')}</option>
                        {activeBranches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2 gap-2">
                        <h4 className="text-sm font-semibold">{t('cmpx.receiveorder.products_to_receive', { count: current.items.length })}</h4>
                        <div className="flex gap-3 text-xs">
                            <button type="button" className="text-primary hover:underline" onClick={() => resetQuantities(current)}>
                                {t('cmpx.receiveorder.fill_pending')}
                            </button>
                            <button type="button" className="text-neutral-500 dark:text-neutral-400 hover:underline" onClick={() => setQty(Object.fromEntries(current.items.map(i => [i.id, '0'])))}>
                                {t('cmpx.receiveorder.clear_qty')}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-600 rounded">
                            <thead className="bg-neutral-100 dark:bg-neutral-900">
                                <tr>
                                    <th className="text-left p-2">{t('cmpx.receiveorder.th_product')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_ordered')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_received')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_pending')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_receive_now')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_unit_cost')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_current_stock')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_stock_after')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {rows.map(item => (
                                    <tr key={item.id} className={item.pending === 0 ? 'opacity-60' : ''}>
                                        <td className="p-2">{item.productName}</td>
                                        <td className="p-2 text-right">{item.quantityOrdered}</td>
                                        <td className="p-2 text-right">{item.received}</td>
                                        <td className="p-2 text-right font-medium">{item.pending}</td>
                                        <td className="p-2 text-right">
                                            {item.pending > 0 ? (
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={item.pending}
                                                    step={1}
                                                    value={qty[item.id] ?? ''}
                                                    onChange={e => setQty(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    onBlur={() => setQty(prev => ({ ...prev, [item.id]: String(parseQty(item.id, item.pending)) }))}
                                                    className={`${inputFormStyle} !mt-0 !py-1 w-20 text-right`}
                                                    aria-label={t('cmpx.receiveorder.th_receive_now')}
                                                />
                                            ) : (
                                                <span className="text-xs text-green-600 dark:text-green-400">{t('cmpx.receiveorder.line_complete')}</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-right">${item.unitCost.toFixed(2)}</td>
                                        <td className="p-2 text-right text-neutral-500 dark:text-neutral-400">{branchId ? item.currentStock : '—'}</td>
                                        <td className="p-2 text-right font-bold text-primary">{branchId ? item.stockAfter : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.receiveorder.notes_label')}</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        maxLength={500}
                        className={inputFormStyle}
                        placeholder={t('cmpx.receiveorder.notes_ph')}
                    />
                </div>

                <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-xs text-amber-800 dark:text-amber-300">
                    {t('cmpx.receiveorder.confirm_warning_partial')}
                </div>
            </div>
        </Modal>
    );
};
