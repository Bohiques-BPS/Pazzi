import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { supplierOrdersService, type SupplierOrderRecord } from '../../services/supplierOrders';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ReceiveSupplierOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrderRecord | null;
    onReceived?: (updated: SupplierOrderRecord) => void;
}

export const ReceiveSupplierOrderModal: React.FC<ReceiveSupplierOrderModalProps> = ({
    isOpen,
    onClose,
    order,
    onReceived,
}) => {
    const { t } = useTranslation();
    const { branches, products } = useData();
    const activeBranches = useMemo(() => branches.filter(b => b.isActive), [branches]);

    const [branchId, setBranchId] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setBranchId(activeBranches[0]?.id || '');
            setNotes('');
            setError(null);
        }
    }, [isOpen, activeBranches]);

    if (!isOpen || !order) return null;

    const itemsWithCurrentStock = order.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const currentStock = branchId
            ? product?.stockByBranch.find(sb => sb.branchId === branchId)?.quantity ?? 0
            : 0;
        return {
            ...item,
            productName: item.product?.name || product?.name || item.productId,
            currentStock,
            stockAfter: currentStock + item.quantityOrdered,
        };
    });

    const handleConfirm = async () => {
        if (!branchId) {
            setError(t('cmpx.receiveorder.err_branch'));
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await supplierOrdersService.receive(order.id, {
                branchId,
                notes: notes.trim() || undefined,
            });
            toast.success(res.message);
            onReceived?.(res.order);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('cmpx.receiveorder.err_receive'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.receiveorder.title', { id: order.id.slice(0, 8).toUpperCase() })} size="2xl">
            <div className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-700/50 text-sm">
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.receiveorder.supplier')}</span>
                        <span className="font-medium">{order.supplier?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.receiveorder.order_date')}</span>
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span>{t('cmpx.receiveorder.total_cost')}</span>
                        <span>${order.totalCost.toFixed(2)}</span>
                    </div>
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
                    <h4 className="text-sm font-semibold mb-2">{t('cmpx.receiveorder.products_to_receive', { count: order.items.length })}</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border border-neutral-200 dark:border-neutral-600 rounded">
                            <thead className="bg-neutral-100 dark:bg-neutral-900">
                                <tr>
                                    <th className="text-left p-2">{t('cmpx.receiveorder.th_product')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_quantity')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_unit_cost')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_current_stock')}</th>
                                    <th className="text-right p-2">{t('cmpx.receiveorder.th_stock_after')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {itemsWithCurrentStock.map(item => (
                                    <tr key={item.id}>
                                        <td className="p-2">{item.productName}</td>
                                        <td className="p-2 text-right">{item.quantityOrdered}</td>
                                        <td className="p-2 text-right">${item.unitCost.toFixed(2)}</td>
                                        <td className="p-2 text-right text-neutral-500">{branchId ? item.currentStock : '—'}</td>
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
                        className={inputFormStyle}
                        placeholder={t('cmpx.receiveorder.notes_ph')}
                    />
                </div>

                <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
                    {t('cmpx.receiveorder.confirm_warning')}
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                        {t('common.cancel')}
                    </button>
                    <button type="button" onClick={handleConfirm} className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting || !branchId}>
                        {submitting ? t('cmpx.receiveorder.submitting') : t('cmpx.receiveorder.submit')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
