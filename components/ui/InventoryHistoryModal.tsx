
import React, { useMemo } from 'react';
import { Modal } from '../Modal';
import { Product, InventoryLog, Branch } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../DataTable';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface InventoryHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string | null;
}

export const InventoryHistoryModal: React.FC<InventoryHistoryModalProps> = ({ isOpen, onClose, productId }) => {
    const { t } = useTranslation();
    const { inventoryLogs, getProductById, branches, getEmployeeById } = useData();
    
    const product = useMemo(() => productId ? getProductById(productId) : null, [productId, getProductById]);
    const activeBranches = useMemo(() => branches.filter(b => b.isActive), [branches]);
    
    const allProductLogs = useMemo(() => {
        if (!productId) return [];
        return inventoryLogs
            .filter(log => log.productId === productId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [productId, inventoryLogs]);

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
        { header: t('inventory.history.col_notes'), accessor: 'notes', className: 'text-xs max-w-xs truncate' },
        { header: t('inventory.history.col_employee'), accessor: (log) => getEmployeeById(log.employeeId)?.name || 'Sistema' },
    ];

    if (!isOpen || !product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('inventory.history.title', { product: product.name })} size="full">
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                <div>
                    <h3 className="text-md font-semibold text-primary mb-2">{t('inventory.history.current_stock_branch')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
                        {product.stockByBranch.map(stockItem => {
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
                            <div className="text-lg font-bold text-primary dark:text-accent">{product.stockByBranch.reduce((acc, item) => acc + item.quantity, 0)}</div>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-md font-semibold text-primary mb-2 border-t pt-4 dark:border-neutral-700">{t('inventory.history.movement_log')}</h3>
                    {activeBranches.map(branch => {
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
            </div>
        </Modal>
    );
};
