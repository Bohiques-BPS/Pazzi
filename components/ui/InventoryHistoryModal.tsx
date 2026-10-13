
import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal';
import { Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../DataTable';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { inventoryService, type InventoryLog } from '../../services/inventory';
import { productsService } from '../../services/products';
import { ApiError } from '../../services/api';

interface InventoryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string | null;
    /** Producto que ya tiene el llamador (respaldo si GET /products/:id falla, p.ej. sin products.view). */
    product?: Product | null;
}

// Tope de movimientos por apertura (el backend acepta hasta 1000).
const LOGS_LIMIT = 500;

export const InventoryHistoryModal: React.FC<InventoryHistoryModalProps> = ({ isOpen, onClose, productId, product: fallbackProduct }) => {
    const { t } = useTranslation();
    const { getProductById, branches } = useData();

    // Producto y movimientos se piden al backend cada vez que se abre el modal. Antes se leían de
    // DataContext (últimos 200 logs de TODA la tienda + lista truncada de productos) → historial
    // vacío/obsoleto y el modal no abría para productos fuera de esa lista.
    const [product, setProduct] = useState<Product | null>(null);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !productId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setLogs([]);
        setTotal(0);
        setProduct(fallbackProduct && fallbackProduct.id === productId ? fallbackProduct : (getProductById(productId) || null));

        Promise.allSettled([
            productsService.getByIdNormalized(productId),
            inventoryService.getLogs({ productId, limit: LOGS_LIMIT }),
        ]).then(([productRes, logsRes]) => {
            if (cancelled) return;
            if (productRes.status === 'fulfilled' && productRes.value) setProduct(productRes.value as Product);
            if (logsRes.status === 'fulfilled') {
                const items = Array.isArray(logsRes.value?.items) ? logsRes.value.items : [];
                setLogs(items);
                setTotal(Number(logsRes.value?.total) || items.length);
            } else {
                const reason = logsRes.reason;
                setError(reason instanceof ApiError ? reason.message : t('inventory.history.load_error'));
            }
            setLoading(false);
        });
        return () => { cancelled = true; };
        // Solo al abrir / cambiar de producto: no re-pedir si cambian las funciones del contexto.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, productId]);

    const activeBranches = useMemo(() => branches.filter(b => b.isActive), [branches]);

    const allProductLogs = useMemo(
        () => [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [logs]
    );

    const branchLogColumns: TableColumn<InventoryLog>[] = [
        { header: t('inventory.history.col_date'), accessor: (log) => new Date(log.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), className: "whitespace-nowrap" },
        { header: t('inventory.history.col_type'), accessor: 'type' },
        {
            header: t('inventory.history.col_change'),
            accessor: (log) => {
                const isPositive = log.quantityChange > 0;
                const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                return <span className={`font-semibold ${colorClass}`}>{isPositive ? `+${log.quantityChange}` : log.quantityChange}</span>;
            },
            className: "text-center"
        },
        { header: t('inventory.history.col_stock_before'), accessor: 'stockBefore', className: "text-center" },
        { header: t('inventory.history.col_stock_after'), accessor: 'stockAfter', className: "text-center font-medium" },
        { header: t('inventory.history.col_ref'), accessor: (log) => log.referenceId?.slice(-6).toUpperCase() || 'N/A' },
        { header: t('inventory.history.col_notes'), accessor: (log) => log.notes || '', className: 'text-xs max-w-xs truncate' },
        // log.employeeId es un User.id (no Employee.id): usamos la relación `employee` que incluye la API.
        { header: t('inventory.history.col_employee'), accessor: (log) => log.employee ? `${log.employee.name || ''} ${log.employee.lastName || ''}`.trim() || t('cmpx.common.system') : t('cmpx.common.system') },
    ];

    if (!isOpen || !productId) return null;

    const stockByBranch = product?.stockByBranch || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('inventory.history.title', { product: product?.name || '' })} size="full">
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-neutral-600 dark:text-neutral-400">{t('common.loading')}</span>
                    </div>
                ) : (
                <>
                {product && (
                <div>
                    <h3 className="text-md font-semibold text-primary mb-2">{t('inventory.history.current_stock_branch')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
                        {stockByBranch.map(stockItem => {
                            const branch = branches.find(b => b.id === stockItem.branchId);
                            if (!branch || !branch.isActive) return null;
                            return (
                                <div key={branch.id} className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded text-center">
                                    <div className="font-semibold text-neutral-700 dark:text-neutral-200">{branch.name}</div>
                                    <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{stockItem.quantity}</div>
                                </div>
                            );
                        })}
                         <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded text-center">
                            <div className="font-semibold text-primary dark:text-accent">{t('inventory.history.total')}</div>
                            <div className="text-lg font-bold text-primary dark:text-accent">{stockByBranch.reduce((acc, item) => acc + item.quantity, 0)}</div>
                        </div>
                    </div>
                </div>
                )}

                <div className="space-y-4">
                    <h3 className="text-md font-semibold text-primary mb-2 border-t pt-4 dark:border-neutral-700">{t('inventory.history.movement_log')}</h3>
                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 px-2 py-3 text-center bg-red-50 dark:bg-red-900/20 rounded">{error}</p>
                    )}
                    {!error && total > logs.length && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('inventory.history.showing_latest', { count: logs.length, total })}</p>
                    )}
                    {!error && activeBranches.map(branch => {
                        const logsForBranch = allProductLogs.filter(log => log.branchId === branch.id);
                        return (
                            <div key={branch.id}>
                                <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2">{branch.name}</h4>
                                {logsForBranch.length > 0 ? (
                                    <DataTable<InventoryLog>
                                        data={logsForBranch}
                                        columns={branchLogColumns}
                                    />
                                ) : (
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-4 text-center bg-neutral-50 dark:bg-neutral-700/50 rounded">
                                        {t('inventory.history.no_movements')}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
                </>
                )}
            </div>
        </Modal>
    );
};
