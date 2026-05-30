import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { Product, Branch } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { inventoryService } from '../../services/inventory';
import { api, ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';

interface TransferStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    /** Sucursal pre-seleccionada como origen (opcional). */
    defaultFromBranchId?: string;
    onTransferred?: (result: {
        from: { branchId: string; stockAfter: number };
        to: { branchId: string; stockAfter: number };
    }) => void;
}

export const TransferStockModal: React.FC<TransferStockModalProps> = ({
    isOpen,
    onClose,
    product,
    defaultFromBranchId,
    onTransferred,
}) => {
    const { branches: contextBranches, setBranches, setProducts } = useData();
    const [localBranches, setLocalBranches] = useState<Branch[]>([]);

    // Use context branches when available; otherwise fetch directly so the modal
    // works even for employees who lack the branches.view/manage permission
    // (which was required by the old route — now fixed, but keep fallback).
    useEffect(() => {
        if (!isOpen) return;
        if (contextBranches.length > 0) {
            setLocalBranches(contextBranches);
            return;
        }
        // Fallback: fetch directly from the API
        api.get<Branch[]>('/branches')
            .then(data => {
                setBranches(data);          // also hydrate the context for other consumers
                setLocalBranches(data);
            })
            .catch(() => {/* non-fatal — selects will stay empty */});
    }, [isOpen, contextBranches]);     // re-run when context populates after mount

    const activeBranches = useMemo(() => localBranches.filter(b => b.isActive), [localBranches]);

    const [fromBranchId, setFromBranchId] = useState('');
    const [toBranchId, setToBranchId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setFromBranchId(defaultFromBranchId || activeBranches[0]?.id || '');
        setToBranchId('');
        setQuantity('');
        setNotes('');
        setError(null);
    }, [isOpen, defaultFromBranchId, activeBranches]);

    const fromStock = useMemo(() => {
        if (!product || !fromBranchId) return 0;
        return product.stockByBranch.find(sb => sb.branchId === fromBranchId)?.quantity ?? 0;
    }, [product, fromBranchId]);

    const toStock = useMemo(() => {
        if (!product || !toBranchId) return 0;
        return product.stockByBranch.find(sb => sb.branchId === toBranchId)?.quantity ?? 0;
    }, [product, toBranchId]);

    const parsedQty = parseInt(quantity, 10) || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!product) return;
        if (!fromBranchId) { setError('Seleccione sucursal origen.'); return; }
        if (!toBranchId) { setError('Seleccione sucursal destino.'); return; }
        if (fromBranchId === toBranchId) { setError('Origen y destino no pueden ser la misma sucursal.'); return; }
        if (parsedQty <= 0) { setError('La cantidad debe ser mayor a 0.'); return; }
        if (parsedQty > fromStock) { setError(`Solo hay ${fromStock} disponibles en la sucursal origen.`); return; }

        setSubmitting(true);
        try {
            const result = await inventoryService.transferStock(product.id, {
                fromBranchId,
                toBranchId,
                quantity: parsedQty,
                notes: notes.trim() || undefined,
            });

            // Aplicar al estado local
            setProducts(prev => prev.map(p => {
                if (p.id !== product.id) return p;
                const updated = [...p.stockByBranch];
                const fromIdx = updated.findIndex(sb => sb.branchId === fromBranchId);
                const toIdx = updated.findIndex(sb => sb.branchId === toBranchId);
                if (fromIdx >= 0) updated[fromIdx] = { ...updated[fromIdx], quantity: result.from.stockAfter };
                if (toIdx >= 0) updated[toIdx] = { ...updated[toIdx], quantity: result.to.stockAfter };
                else updated.push({ branchId: toBranchId, quantity: result.to.stockAfter });
                return { ...p, stockByBranch: updated };
            }));

            toast.success(result.message);
            onTransferred?.(result);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error en transferencia');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Transferir stock — ${product.name}`} size="md">
            {activeBranches.length < 2 ? (
                <div className="p-4 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            {localBranches.length === 0
                                ? 'Cargando sucursales…'
                                : 'Se necesitan al menos 2 sucursales activas para realizar una transferencia.'}
                        </p>
                        {localBranches.length > 0 && localBranches.every(b => !b.isActive) && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                Todas las sucursales están marcadas como inactivas. Actívalas en Admin → Sucursales.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium">Desde sucursal</label>
                        <select value={fromBranchId} onChange={e => setFromBranchId(e.target.value)} className={inputFormStyle} required>
                            <option value="">Seleccionar...</option>
                            {activeBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        {fromBranchId && (
                            <p className="text-xs text-neutral-500 mt-1">Stock disponible: <span className="font-semibold">{fromStock}</span></p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Hacia sucursal</label>
                        <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} className={inputFormStyle} required>
                            <option value="">Seleccionar...</option>
                            {activeBranches.filter(b => b.id !== fromBranchId).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        {toBranchId && (
                            <p className="text-xs text-neutral-500 mt-1">Stock actual: <span className="font-semibold">{toStock}</span></p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium">Cantidad a transferir</label>
                    <input
                        type="number"
                        min="1"
                        max={fromStock || undefined}
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className={inputFormStyle}
                        required
                        autoFocus
                    />
                </div>

                {parsedQty > 0 && fromBranchId && toBranchId && (
                    <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                        <div>
                            <div className="text-xs text-neutral-500">Origen después</div>
                            <div className="font-bold text-lg">{fromStock - parsedQty}</div>
                        </div>
                        <div>
                            <div className="text-xs text-neutral-500">Destino después</div>
                            <div className="font-bold text-lg">{toStock + parsedQty}</div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium">Notas (opcional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className={inputFormStyle}
                        placeholder="Motivo de la transferencia..."
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? 'Transfiriendo...' : 'Transferir stock'}
                    </button>
                </div>
            </form>
            )}
        </Modal>
    );
};
