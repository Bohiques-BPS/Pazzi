import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Product, InventoryLogType, InventoryLog } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

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
    const { branches, updateProductStockForBranch, addInventoryLog } = useData();
    const { currentUser } = useAuth();
    const [adjustments, setAdjustments] = useState<AdjustmentState>({});

    const activeBranches = branches.filter(b => b.isActive);

    useEffect(() => {
        if (isOpen) {
            setAdjustments({}); // Reset state when modal opens
        }
    }, [isOpen]);

    const handleAdjustmentChange = (branchId: string, value: string) => {
        setAdjustments(prev => {
            const existing = prev[branchId] || { adjustment: '', notes: '' };
            return {
                ...prev,
                [branchId]: { ...existing, adjustment: value },
            };
        });
    };

    const handleNotesChange = (branchId: string, value: string) => {
        setAdjustments(prev => {
            const existing = prev[branchId] || { adjustment: '', notes: '' };
            return {
                ...prev,
                [branchId]: { ...existing, notes: value },
            };
        });
    };

    const handleSubmit = () => {
        if (!product || !currentUser) return;

        const changesToProcess = Object.keys(adjustments).filter(branchId => {
            const value = adjustments[branchId];
            return value && value.adjustment && value.adjustment.trim() !== '' && value.adjustment.trim() !== '0';
        });

        if (changesToProcess.length === 0) {
            onClose();
            return;
        }

        // Validation first
        for (const branchId of changesToProcess) {
            const { adjustment } = adjustments[branchId];
            const adjValue = parseInt(adjustment.replace(/\s/g, ''), 10) || 0;
            const stockBefore = product.stockByBranch.find(sb => sb.branchId === branchId)?.quantity ?? 0;
            const newQuantity = stockBefore + adjValue;
            if (newQuantity < 0) {
                const branchName = branches.find(b => b.id === branchId)?.name || branchId;
                alert(`Error en sucursal ${branchName}: El nuevo stock no puede ser negativo (${newQuantity}). No se guardaron los cambios.`);
                return;
            }
        }
        
        // Process changes
        changesToProcess.forEach(branchId => {
            const { adjustment, notes } = adjustments[branchId];
            const adjValue = parseInt(adjustment.replace(/\s/g, ''), 10) || 0;
            if (adjValue === 0) return;

            const stockBefore = product.stockByBranch.find(sb => sb.branchId === branchId)?.quantity ?? 0;
            const newQuantity = stockBefore + adjValue;

            updateProductStockForBranch(product.id, branchId, newQuantity);
            addInventoryLog({
                productId: product.id,
                branchId,
                date: new Date().toISOString(),
                type: InventoryLogType.ADJUSTMENT_MANUAL,
                quantityChange: adjValue,
                stockBefore,
                stockAfter: newQuantity,
                employeeId: currentUser.id,
                notes: notes || `Ajuste manual: ${adjValue > 0 ? '+' : ''}${adjValue}`
            });
        });

        onClose();
    };

    if (!isOpen || !product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gestionar Stock de: ${product.name}`} size="4xl">
            <div className="space-y-4 max-h-[70vh] flex flex-col">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                    Ingrese la cantidad a sumar (ej: 10 o +10) o restar (ej: -5) para cada sucursal. Deje en blanco si no hay cambios.
                </p>
                <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                    {/* Header */}
                     <div className="grid grid-cols-12 gap-x-3 p-2 sticky top-0 bg-neutral-100 dark:bg-neutral-900 z-10">
                        <div className="col-span-12 sm:col-span-3 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Sucursal</div>
                        <div className="col-span-3 sm:col-span-2 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Stock Actual</div>
                        <div className="col-span-4 sm:col-span-2 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Ajuste (+/-)</div>
                        <div className="col-span-5 sm:col-span-2 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Nuevo Stock</div>
                        <div className="col-span-12 sm:col-span-3 font-semibold text-xs uppercase text-neutral-500 dark:text-neutral-400">Notas</div>
                    </div>
                    {/* Rows */}
                    <div className="space-y-3">
                        {activeBranches.map(branch => {
                            const stockBefore = product.stockByBranch.find(sb => sb.branchId === branch.id)?.quantity ?? 0;
                            const adjustmentValue = adjustments[branch.id]?.adjustment || '';
                            const newStock = stockBefore + (parseInt(adjustmentValue.replace(/\s/g, ''), 10) || 0);

                            return (
                                <div key={branch.id} className="grid grid-cols-12 gap-x-3 items-center p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                                    <label className="col-span-12 sm:col-span-3 font-medium text-sm" htmlFor={`adj-${branch.id}`}>{branch.name}</label>
                                    <div className="col-span-3 sm:col-span-2 text-sm text-center sm:text-left"> <span className="font-bold">{stockBefore}</span></div>
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
                                    <div className="col-span-5 sm:col-span-2 text-sm text-center sm:text-left"> <span className={`font-bold ${adjustmentValue ? 'text-primary dark:text-accent' : ''}`}>{newStock}</span></div>
                                    <div className="col-span-12 sm:col-span-3">
                                         <input
                                            type="text"
                                            value={adjustments[branch.id]?.notes || ''}
                                            onChange={(e) => handleNotesChange(branch.id, e.target.value)}
                                            placeholder="Notas (opcional)"
                                            className={`${inputFormStyle} !text-xs`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="button" onClick={handleSubmit} className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Ajustes</button>
                </div>
            </div>
        </Modal>
    );
};