import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { inventoryService } from '../../services/inventory';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    branchId: string | null;
    /** Callback opcional cuando el ajuste se aplica con éxito. */
    onAdjusted?: (result: { stockBefore: number; stockAfter: number; quantityChange: number }) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
    isOpen,
    onClose,
    product,
    branchId,
    onAdjusted,
}) => {
    const { t } = useTranslation();
    const { getBranchById, setProducts } = useData();

    const [adjustment, setAdjustment] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [currentStockAtBranch, setCurrentStockAtBranch] = useState(0);
    const [totalStockAcrossAllBranches, setTotalStockAcrossAllBranches] = useState(0);

    useEffect(() => {
        if (!isOpen || !product || !branchId) return;
        const stockEntry = product.stockByBranch.find(sb => sb.branchId === branchId);
        setCurrentStockAtBranch(stockEntry?.quantity ?? 0);
        setTotalStockAcrossAllBranches(product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0));
        setAdjustment('');
        setNotes('');
        setError(null);
    }, [product, branchId, isOpen]);

    const branchName = branchId ? getBranchById(branchId)?.name : '—';
    const parsedAdjustment = parseInt(adjustment.replace(/\s/g, ''), 10) || 0;
    const newCalculatedStock = currentStockAtBranch + parsedAdjustment;
    const isLargeNegative = parsedAdjustment <= -10;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!product || !branchId) {
            setError(t('cmpx.stockadj.err_missing'));
            return;
        }
        if (parsedAdjustment === 0) {
            setError(t('cmpx.stockadj.err_zero'));
            return;
        }
        if (newCalculatedStock < 0) {
            setError(t('cmpx.stockadj.err_negative', { stock: newCalculatedStock }));
            return;
        }
        if (isLargeNegative && !notes.trim()) {
            setError(t('cmpx.stockadj.err_reason_required'));
            return;
        }

        setSubmitting(true);
        try {
            const result = await inventoryService.adjustStock(product.id, {
                branchId,
                quantity: parsedAdjustment,
                type: 'ADJUSTMENT_MANUAL',
                notes: notes.trim() || undefined,
            });

            // Actualizamos el producto en DataContext con el nuevo stock para reflejar el cambio en la UI.
            setProducts(prev => prev.map(p => {
                if (p.id !== product.id) return p;
                const idx = p.stockByBranch.findIndex(sb => sb.branchId === branchId);
                const updated = [...p.stockByBranch];
                if (idx >= 0) updated[idx] = { ...updated[idx], quantity: result.stockAfter };
                else updated.push({ branchId, quantity: result.stockAfter });
                return { ...p, stockByBranch: updated };
            }));

            toast.success(
                t('cmpx.stockadj.adjusted', {
                    before: result.stockBefore,
                    after: result.stockAfter,
                    change: `${result.quantityChange >= 0 ? '+' : ''}${result.quantityChange}`,
                })
            );
            onAdjusted?.(result);
            onClose();
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
            else setError(t('cmpx.common.conn_error'));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !product || !branchId) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('inventory.adjust.single_title', { product: product.name }) || `Ajustar stock — ${product.name}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="text-sm space-y-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.stockadj.product')}</span>
                        <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.stockadj.branch')}</span>
                        <span className="font-medium">{branchName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">{t('cmpx.stockadj.current_stock')}</span>
                        <span className="font-bold">{currentStockAtBranch}</span>
                    </div>
                    {totalStockAcrossAllBranches !== currentStockAtBranch && (
                        <div className="flex justify-between text-xs text-neutral-500">
                            <span>{t('cmpx.stockadj.total_stock')}</span>
                            <span>{totalStockAcrossAllBranches}</span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.stockadj.adjustment_label')}</label>
                    <input
                        type="text"
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                        className={`${inputFormStyle} w-full mt-1`}
                        placeholder={t('cmpx.stockadj.adjustment_ph')}
                        required
                        autoFocus
                    />
                </div>

                <div className={`p-2 rounded text-sm ${
                    newCalculatedStock < 0
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-neutral-100 dark:bg-neutral-700'
                }`}>
                    {t('cmpx.stockadj.new_stock')} <span className="font-bold text-lg">{newCalculatedStock}</span>
                </div>

                <div>
                    <label className="block text-sm font-medium">
                        {t('cmpx.common.reason')} {isLargeNegative ? <span className="text-red-500">*</span> : t('cmpx.common.optional_paren')}
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className={`${inputFormStyle} w-full mt-1`}
                        placeholder={t('cmpx.stockadj.reason_ph')}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                        {t('common.cancel') || 'Cancelar'}
                    </button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? t('common.saving') : t('cmpx.stockadj.submit')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
