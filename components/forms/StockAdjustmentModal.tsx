import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Product } from '../../types'; // Changed from ProductStockInfo
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null; // Changed from ProductStockInfo
    branchId: string | null;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, product, branchId }) => {
    const { updateProductStockForBranch, getBranchById } = useData();
    const [newQuantity, setNewQuantity] = useState<string>('');
    
    const [currentStockAtBranch, setCurrentStockAtBranch] = useState<number>(0);
    const [totalStockAcrossAllBranches, setTotalStockAcrossAllBranches] = useState<number>(0);

    useEffect(() => {
        if (product && branchId && isOpen) {
            const stockEntry = product.stockByBranch.find(sb => sb.branchId === branchId);
            const stockInBranch = stockEntry ? stockEntry.quantity : 0;
            const totalStock = product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0);
            
            setCurrentStockAtBranch(stockInBranch);
            setTotalStockAcrossAllBranches(totalStock);
            setNewQuantity(stockInBranch.toString());
        } else {
            setNewQuantity('');
            setCurrentStockAtBranch(0);
            setTotalStockAcrossAllBranches(0);
        }
    }, [product, branchId, isOpen]);

    const branchName = branchId ? getBranchById(branchId)?.name : 'Desconocida';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !branchId) {
            alert("Error: Producto o sucursal no especificados.");
            return;
        }
        const quantity = parseInt(newQuantity, 10);
        if (isNaN(quantity) || quantity < 0) {
            alert("Por favor, ingrese una cantidad de stock válida (número entero no negativo).");
            return;
        }
        updateProductStockForBranch(product.id, branchId, quantity);
        onClose();
    };

    if (!isOpen || !product || !branchId) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ajustar Stock - ${product.name}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Ajustando stock para <span className="font-semibold text-primary">{product.name}</span> en la sucursal <span className="font-semibold text-primary">{branchName}</span>.
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Stock en sucursal (<span className="font-medium">{branchName}</span>): <span className="font-semibold">{currentStockAtBranch}</span>
                </p>
                {totalStockAcrossAllBranches !== undefined && totalStockAcrossAllBranches !== currentStockAtBranch && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2">
                        Stock Total (todas las sucursales): <span className="font-semibold">{totalStockAcrossAllBranches}</span>
                    </p>
                )}
                <div>
                    <label htmlFor="newQuantity" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nueva Cantidad de Stock</label>
                    <input
                        type="number"
                        id="newQuantity"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className={inputFormStyle + " w-full mt-1"}
                        min="0"
                        step="1"
                        required
                        aria-describedby="newQuantity-help"
                    />
                    <p id="newQuantity-help" className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Ingrese la cantidad total que desea que haya en stock para este producto en esta sucursal.</p>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Ajuste</button>
                </div>
            </form>
        </Modal>
    );
};
