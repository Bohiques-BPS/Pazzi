import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Product, InventoryLogType, InventoryLog } from '../../types'; // Changed from ProductStockInfo
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null; // Changed from ProductStockInfo
    branchId: string | null;
    addInventoryLog: (logData: Omit<InventoryLog, 'id'>) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, product, branchId, addInventoryLog }) => {
    const { updateProductStockForBranch, getBranchById } = useData();
    const { currentUser } = useAuth();
    const [adjustment, setAdjustment] = useState<string>('');
    const [notes, setNotes] = useState('');
    
    const [currentStockAtBranch, setCurrentStockAtBranch] = useState<number>(0);
    const [totalStockAcrossAllBranches, setTotalStockAcrossAllBranches] = useState<number>(0);

    useEffect(() => {
        if (product && branchId && isOpen) {
            const stockEntry = product.stockByBranch.find(sb => sb.branchId === branchId);
            const stockInBranch = stockEntry ? stockEntry.quantity : 0;
            const totalStock = product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0);
            
            setCurrentStockAtBranch(stockInBranch);
            setTotalStockAcrossAllBranches(totalStock);
            setAdjustment('');
            setNotes(''); // Reset notes on open
        }
    }, [product, branchId, isOpen]);

    const branchName = branchId ? getBranchById(branchId)?.name : 'Desconocida';

    const parsedAdjustment = parseInt(adjustment.replace(/\s/g,''), 10) || 0;
    const newCalculatedStock = currentStockAtBranch + parsedAdjustment;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !branchId || !currentUser) {
            alert("Error: Faltan datos de producto, sucursal o usuario para completar la acción.");
            return;
        }
        
        if (parsedAdjustment === 0) {
            alert("No se ha ingresado ningún ajuste.");
            return;
        }

        if (newCalculatedStock < 0) {
            alert("La cantidad de stock no puede ser negativa.");
            return;
        }
        
        const stockBefore = currentStockAtBranch;
        updateProductStockForBranch(product.id, branchId, newCalculatedStock);

        addInventoryLog({
            productId: product.id,
            branchId,
            date: new Date().toISOString(),
            type: InventoryLogType.ADJUSTMENT_MANUAL,
            quantityChange: parsedAdjustment,
            stockBefore,
            stockAfter: newCalculatedStock,
            employeeId: currentUser.id,
            notes: notes.trim() || `Ajuste manual: ${parsedAdjustment > 0 ? '+' : ''}${parsedAdjustment}`
        });

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
                    <label htmlFor="adjustment" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Sumar o Restar Stock</label>
                    <input
                        type="text"
                        id="adjustment"
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                        className={inputFormStyle + " w-full mt-1"}
                        placeholder="Ej: +10, -5, 25"
                        required
                        aria-describedby="adjustment-help"
                    />
                    <p id="adjustment-help" className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Ingrese la cantidad a sumar (ej: 10 o +10) o restar (ej: -5).</p>
                </div>

                <div className="text-sm p-2 bg-neutral-100 dark:bg-neutral-700 rounded">
                    Nuevo Stock en Sucursal: <span className="font-bold text-lg">{newCalculatedStock}</span>
                </div>
                
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notas / Razón (Opcional pero Recomendado)</label>
                    <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className={inputFormStyle + " w-full mt-1"}
                        placeholder="Ej: Conteo físico, producto dañado, transferencia..."
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Ajuste</button>
                </div>
            </form>
        </Modal>
    );
};