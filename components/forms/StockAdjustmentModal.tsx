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
            setError('Faltan datos de producto o sucursal.');
            return;
        }
        if (parsedAdjustment === 0) {
            setError('Ingrese un valor de ajuste diferente de 0.');
            return;
        }
        if (newCalculatedStock < 0) {
            setError(`El stock resultante sería ${newCalculatedStock} (no puede ser negativo).`);
            return;
        }
        if (isLargeNegative && !notes.trim()) {
            setError('Para ajustes negativos de 10 o más unidades, debe indicar una razón.');
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
                `Stock ajustado: ${result.stockBefore} → ${result.stockAfter} (${result.quantityChange >= 0 ? '+' : ''}${result.quantityChange})`
            );
            onAdjusted?.(result);
            onClose();
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
            else setError('Error de conexión con el servidor');
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
                        <span className="text-neutral-600 dark:text-neutral-300">Producto:</span>
                        <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">Sucursal:</span>
                        <span className="font-medium">{branchName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-300">Stock actual:</span>
                        <span className="font-bold">{currentStockAtBranch}</span>
                    </div>
                    {totalStockAcrossAllBranches !== currentStockAtBranch && (
                        <div className="flex justify-between text-xs text-neutral-500">
                            <span>Stock total (todas las sucursales):</span>
                            <span>{totalStockAcrossAllBranches}</span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium">Ajuste (positivo para agregar, negativo para restar)</label>
                    <input
                        type="text"
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                        className={`${inputFormStyle} w-full mt-1`}
                        placeholder="Ej: 10 o -5"
                        required
                        autoFocus
                    />
                </div>

                <div className={`p-2 rounded text-sm ${
                    newCalculatedStock < 0
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-neutral-100 dark:bg-neutral-700'
                }`}>
                    Nuevo stock: <span className="font-bold text-lg">{newCalculatedStock}</span>
                </div>

                <div>
                    <label className="block text-sm font-medium">
                        Razón {isLargeNegative ? <span className="text-red-500">*</span> : '(opcional)'}
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className={`${inputFormStyle} w-full mt-1`}
                        placeholder="Conteo físico, pérdida, daño, etc."
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                        {t('common.cancel') || 'Cancelar'}
                    </button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Guardar ajuste'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
