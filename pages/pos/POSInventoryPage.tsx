
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, Category, Branch, UserRole, InventoryLog } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BranchStockAdjustmentModal } from '../../components/forms/BranchStockAdjustmentModal';
import { InventoryHistoryModal } from '../../components/ui/InventoryHistoryModal';
import { ListBulletIcon, Cog6ToothIcon } from '../../components/icons'; 
import { INPUT_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ADMIN_USER_ID } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { API_URL } from '../../services/api';

export const POSInventoryPage: React.FC = () => {
    const { t } = useTranslation();
    const { 
        products: allCompanyProducts,
        setProducts,
        branches, 
        categories: allCategories, 
        addInventoryLog,
    } = useData();
    const { currentUser } = useAuth();
    
    const [showBranchAdjustmentModal, setShowBranchAdjustmentModal] = useState(false);
    const [productForBranchAdjustment, setProductForBranchAdjustment] = useState<Product | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [productForHistory, setProductForHistory] = useState<Product | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    
    const availableCategories = useMemo(() => {
        return allCategories.filter(cat => !cat.storeOwnerId || cat.storeOwnerId === currentUser?.id || currentUser?.role === UserRole.MANAGER);
    }, [allCategories, currentUser]);

    // Carga de movimientos de inventario (logs) desde el backend
    useEffect(() => {
        const fetchLogs = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`${API_URL}/inventory/logs`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    setInventoryLogs(data);
                }
            } catch (error) {
                console.error("Error al cargar logs de inventario:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        return inventoryLogs.filter(log =>
            (log.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
             log.notes?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [inventoryLogs, searchTerm]);
    
    const handleOpenBranchAdjustmentModal = useCallback((product: Product) => {
        setProductForBranchAdjustment(product);
        setShowBranchAdjustmentModal(true);
    }, []);

    const handleOpenHistoryModal = useCallback((product: Product) => {
        setProductForHistory(product);
        setShowHistoryModal(true);
    }, []);

    const tableColumns = useMemo((): TableColumn<InventoryLog>[] => {
        return [
            { 
                header: t('inventory.col.date') || 'Fecha', 
                accessor: (log) => new Date(log.date).toLocaleString(),
            },
            { 
                header: t('inventory.col.product') || 'Producto', 
                accessor: (log) => log.product?.name || 'N/A',
            },
            { 
                header: t('inventory.col.type') || 'Movimiento', 
                accessor: (log) => log.type,
            },
            { 
                header: t('inventory.col.quantity') || 'Cant.', 
                accessor: (log) => (
                    <span className={log.quantityChange > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                    </span>
                )
            },
            { 
                header: t('inventory.col.total_stock') || 'Stock Final', 
                accessor: (log) => log.stockAfter,
                className: 'text-center font-semibold'
            }
        ];
    }, [t]);
    
    

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                               <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Bitácora de Inventario</h1>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder={t('common.search') + "..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                    />
                  
                </div>
            </div>

            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando inventario desde el servidor...</span>
                </div>
            )}

            {!loadingData && (
                <DataTable<InventoryLog>
                    data={filteredLogs}
                    columns={tableColumns}
                />
            )}
            
            <BranchStockAdjustmentModal
                isOpen={showBranchAdjustmentModal}
                onClose={() => setShowBranchAdjustmentModal(false)}
                product={productForBranchAdjustment}
            />
            <InventoryHistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                productId={productForHistory?.id || null}
            />
        </div>
    );
};
