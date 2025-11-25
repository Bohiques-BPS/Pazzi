
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Category, Branch, UserRole } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BranchStockAdjustmentModal } from '../../components/forms/BranchStockAdjustmentModal';
import { InventoryHistoryModal } from '../../components/ui/InventoryHistoryModal';
import { ListBulletIcon, Cog6ToothIcon } from '../../components/icons'; 
import { INPUT_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export const POSInventoryPage: React.FC = () => {
    const { t } = useTranslation();
    const { 
        products: allCompanyProducts,
        branches, 
        categories: allCategories, 
        addInventoryLog,
    } = useData();
    const { currentUser } = useAuth();
    
    const [showBranchAdjustmentModal, setShowBranchAdjustmentModal] = useState(false);
    const [productForBranchAdjustment, setProductForBranchAdjustment] = useState<Product | null>(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [productForHistory, setProductForHistory] = useState<Product | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    
    const availableCategories = useMemo(() => {
        return allCategories.filter(cat => !cat.storeOwnerId || cat.storeOwnerId === currentUser?.id || currentUser?.role === UserRole.MANAGER);
    }, [allCategories, currentUser]);

    const filteredAndSearchedProducts = useMemo(() => {
        const posRelevantProducts = allCompanyProducts.filter(p => p.storeOwnerId === 'admin-user' || !p.storeOwnerId);

        return posRelevantProducts.filter(p =>
            (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (p.skus && p.skus.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))) &&
            (selectedCategory === 'Todos' || p.category === selectedCategory)
        );
    }, [allCompanyProducts, searchTerm, selectedCategory]);
    
    const handleOpenBranchAdjustmentModal = useCallback((product: Product) => {
        setProductForBranchAdjustment(product);
        setShowBranchAdjustmentModal(true);
    }, []);

    const handleOpenHistoryModal = useCallback((product: Product) => {
        setProductForHistory(product);
        setShowHistoryModal(true);
    }, []);

    const tableColumns = useMemo((): TableColumn<Product>[] => {
        return [
            { 
                header: t('inventory.col.product'), 
                accessor: (p) => (
                    <div className="flex items-center space-x-3">
                        <img src={p.imageUrl || 'https://picsum.photos/seed/defaultprod/50/50'} alt={p.name} className="w-10 h-10 object-cover rounded flex-shrink-0"/>
                        <div>
                            <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.name}</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">SKU: {p.skus?.[0] || 'N/A'}</span>
                        </div>
                    </div>
                ),
                className: 'w-4/5'
            },
            { 
                header: t('inventory.col.total_stock'), 
                accessor: (product) => product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0),
                className: 'text-center font-semibold w-1/5'
            }
        ];
    }, [t]);
    
    const tableActions = (product: Product) => (
        <div className="flex items-center space-x-2">
            <button 
                onClick={() => handleOpenHistoryModal(product)}
                className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs flex items-center`}
            >
                <ListBulletIcon className="w-4 h-4 mr-1"/> {t('inventory.action.history')}
            </button>
            <button 
                onClick={() => handleOpenBranchAdjustmentModal(product)}
                className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs flex items-center`}
            >
                <Cog6ToothIcon className="w-4 h-4 mr-1"/> {t('inventory.action.adjust')}
            </button>
        </div>
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
                    {t('inventory.title')}
                </h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder={t('inventory.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`${INPUT_SM_CLASSES} sm:w-auto`}
                    >
                        <option value="Todos">{t('inventory.filter.all_categories')}</option>
                        {availableCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <DataTable<Product>
                data={filteredAndSearchedProducts}
                columns={tableColumns}
                actions={tableActions}
            />
            
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
