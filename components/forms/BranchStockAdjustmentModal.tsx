import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { Product, Branch } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { inventoryService } from '../../services/inventory';
import { api, ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';

interface BranchStockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

interface AdjustmentState {
    [branchId: string]: {
        adjustment: string;
        notes: string;
    };
}

export const BranchStockAdjustmentModal: React.FC<BranchStockAdjustmentModalProps> = ({ isOpen, onClose, product }) => {
    const { t } = useTranslation();
    const { branches: contextBranches, setBranches, setProducts } = useData();
    const [localBranches, setLocalBranches] = useState<Branch[]>([]);
    const [adjustments, setAdjustments] = useState<AdjustmentState>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hydrate localBranches from context; fall back to a direct fetch if context is empty
    useEffect(() => {
        if (!isOpen) return;
        if (contextBranches.length > 0) {
            setLocalBranches(contextBranches);
            return;
        }
        api.get<Branch[]>('/branches')
            .then(data => { setBranches(data); setLocalBranches(data); })
            .catch(() => {});
    }, [isOpen, contextBranches]);

    const activeBranches = useMemo(() => localBranches.filter(b => b.isActive), [localBranches]);

    useEffect(() => {
        if (isOpen) {
            setAdjustments({});
            setError(null);
        }
    }, [isOpen]);

    const handleAdjustmentChange = (branchId: string, value: string) => {
        setAdjustments(prev => ({
            ...prev,
            [branchId]: { ...(prev[branchId] || { adjustment: '', notes: '' }), adjustment: value },
        }));
    };

    const handleNotesChange = (branchId: string, value: string) => {
        setAdjustments(prev => ({
            ...prev,
            [branchId]: { ...(prev[branchId] || { adjustment: '', notes: '' }), notes: value },
        }));
    };

    const handleSubmit = async () => {
        if (!product) return;
        setError(null);

        const changes = Object.entries(adjustments)
            .map(([branchId, v]) => {
                const adj = parseInt((v.adjustment || '').replace(/\s/g, ''), 10);
                if (isNaN(adj) || adj === 0) return null;
                return { branchId, adjustment: adj, notes: v.notes };
            })
            .filter((x): x is { branchId: string; adjustment: number; notes: string } => x !== null);

        if (changes.length === 0) {
            onClose();
            return;
        }

        // Validar localmente que no haya stocks negativos resultantes
        for (const c of changes) {
            const stockBefore = product.stockByBranch.find(sb => sb.branchId === c.branchId)?.quantity ?? 0;
            if (stockBefore + c.adjustment < 0) {
                const branchName = localBranches.find(b => b.id === c.branchId)?.name || c.branchId;
                setError(`Stock negativo en ${branchName}: ${stockBefore} + ${c.adjustment} = ${stockBefore + c.adjustment}`);
                return;
            }
        }

        setSubmitting(true);
        const results = await Promise.allSettled(
            changes.map(c =>
                inventoryService.adjustStock(product.id, {
                    branchId: c.branchId,
                    quantity: c.adjustment,
                    type: 'ADJUSTMENT_MANUAL',
                    notes: c.notes.trim() || undefined,
                })
            )
        );

        // Aplicar al estado local los ajustes que tuvieron éxito
        setProducts(prev => prev.map(p => {
            if (p.id !== product.id) return p;
            const updated = [...p.stockByBranch];
            results.forEach((r, idx) => {
                if (r.status !== 'fulfilled') return;
                const branchId = changes[idx].branchId;
                const i = updated.findIndex(sb => sb.branchId === branchId);
                if (i >= 0) updated[i] = { ...updated[i], quantity: r.value.stockAfter };
                else updated.push({ branchId, quantity: r.value.stockAfter });
            });
            return { ...p, stockByBranch: updated };
        }));

        const successes = results.filter(r => r.status === 'fulfilled').length;
        const failures = results.filter(r => r.status === 'rejected').length;
        setSubmitting(false);

        if (failures === 0) {
            toast.success(`${successes} sucursal(es) actualizada(s)`);
            onClose();
        } else if (successes === 0) {
            const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
            const msg = firstError?.reason instanceof ApiError ? firstError.reason.message : 'Error al guardar los ajustes';
            setError(msg);
            toast.error(msg);
        } else {
            toast.warning(`${successes} ajuste(s) guardado(s), ${failures} fallaron`);
            setError('Algunos ajustes fallaron. Revisa los datos e inténtalo de nuevo para los pendientes.');
        }
    };

    if (!isOpen || !product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('inventory.adjust.title', { product: product.name }) || `Ajustar stock por sucursal — ${product.name}`} size="4xl">
            <div className="space-y-4 max-h-[70vh] flex flex-col">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                    Ingresa el ajuste para cada sucursal (positivo agrega, negativo resta). Las filas en blanco se ignoran.
                </p>

                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm flex-shrink-0">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                    <div className="grid grid-cols-12 gap-x-3 p-2 sticky top-0 bg-neutral-100 dark:bg-neutral-900 z-10">
                        <div className="col-span-12 sm:col-span-3 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Sucursal</div>
                        <div className="col-span-3 sm:col-span-2 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Actual</div>
                        <div className="col-span-4 sm:col-span-2 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Ajuste</div>
                        <div className="col-span-5 sm:col-span-2 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Nuevo</div>
                        <div className="col-span-12 sm:col-span-3 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Razón</div>
                    </div>
                    <div className="space-y-3">
                        {activeBranches.map(branch => {
                            const stockBefore = product.stockByBranch.find(sb => sb.branchId === branch.id)?.quantity ?? 0;
                            const adjustmentValue = adjustments[branch.id]?.adjustment || '';
                            const adj = parseInt(adjustmentValue.replace(/\s/g, ''), 10) || 0;
                            const newStock = stockBefore + adj;
                            const isNegative = newStock < 0;

                            return (
                                <div key={branch.id} className={`grid grid-cols-12 gap-x-3 items-center p-2 rounded-md ${isNegative ? 'bg-red-50 dark:bg-red-900/20' : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                                    <label className="col-span-12 sm:col-span-3 font-medium text-sm" htmlFor={`adj-${branch.id}`}>{branch.name}</label>
                                    <div className="col-span-3 sm:col-span-2 text-sm"><span className="font-bold">{stockBefore}</span></div>
                                    <div className="col-span-4 sm:col-span-2">
                                        <input
                                            type="text"
                                            id={`adj-${branch.id}`}
                                            value={adjustmentValue}
                                            onChange={(e) => handleAdjustmentChange(branch.id, e.target.value)}
                                            placeholder="0"
                                            className={`${inputFormStyle} !text-sm text-center`}
                                        />
                                    </div>
                                    <div className="col-span-5 sm:col-span-2 text-sm">
                                        <span className={`font-bold ${adjustmentValue ? (isNegative ? 'text-red-600' : 'text-primary dark:text-accent') : ''}`}>{newStock}</span>
                                    </div>
                                    <div className="col-span-12 sm:col-span-3">
                                        <input
                                            type="text"
                                            value={adjustments[branch.id]?.notes || ''}
                                            onChange={(e) => handleNotesChange(branch.id, e.target.value)}
                                            placeholder="Razón..."
                                            className={`${inputFormStyle} !text-xs`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>
                        {t('common.cancel') || 'Cancelar'}
                    </button>
                    <button type="button" onClick={handleSubmit} className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? 'Guardando...' : 'Guardar ajustes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
