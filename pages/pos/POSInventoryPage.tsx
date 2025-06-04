import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Branch, UserRole } from '../../types'; // ProductStockInfo removed as we use Product directly
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { StockAdjustmentModal } from '../../components/forms/StockAdjustmentModal';
import { Cog6ToothIcon, Squares2X2Icon, ListBulletIcon } from '../../components/icons'; 
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

export const POSInventoryPage: React.FC = () => {
    const { 
        products: allCompanyProducts, // Renamed to avoid confusion
        branches, 
        categories: allCategories, 
        getBranchById,
        getProductStockForBranch // Keep for card view individual adjustments if needed
    } = useData();
    const { currentUser } = useAuth();
    
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [productToAdjust, setProductToAdjust] = useState<Product | null>(null); // Changed to Product
    const [branchForAdjustment, setBranchForAdjustment] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

    // Filter for active branches to display as columns or in cards
    const activeBranches = useMemo(() => branches.filter(b => b.isActive), [branches]);
    
    const availableCategories = useMemo(() => {
        return allCategories.filter(cat => !cat.storeOwnerId || cat.storeOwnerId === currentUser?.id || currentUser?.role === UserRole.MANAGER);
    }, [allCategories, currentUser]);

    const filteredAndSearchedProducts = useMemo(() => {
        // POS Inventory should primarily show products owned by the admin/company, not client-specific products.
        // This might need adjustment based on how storeOwnerId is used for POS context.
        // For now, assuming products with ADMIN_USER_ID or no storeOwnerId are POS-relevant.
        // A more robust way might be a specific flag on the product or category.
        const posRelevantProducts = allCompanyProducts.filter(p => p.storeOwnerId === 'admin-user' || !p.storeOwnerId);

        return posRelevantProducts.filter(p =>
            (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (p.skus && p.skus.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))) &&
            (selectedCategory === 'Todos' || p.category === selectedCategory)
        );
    }, [allCompanyProducts, searchTerm, selectedCategory]);

    const handleOpenAdjustmentModal = (product: Product, branchId: string) => {
        setProductToAdjust(product);
        setBranchForAdjustment(branchId);
        setShowAdjustmentModal(true);
    };

    const tableColumns = useMemo((): TableColumn<Product>[] => {
        const staticColumns: TableColumn<Product>[] = [
            { header: 'Producto', accessor: 'name', className: 'w-1/4' },
            { header: 'SKU P.', accessor: (p) => p.skus?.[0] || 'N/A', className: 'w-1/8' },
            { header: 'Categoría', accessor: 'category', className: 'w-1/8' },
        ];

        const branchColumns: TableColumn<Product>[] = activeBranches.map(branch => ({
            header: branch.name,
            accessor: (product) => {
                const stockEntry = product.stockByBranch.find(sb => sb.branchId === branch.id);
                const stockQty = stockEntry ? stockEntry.quantity : 0;
                return (
                    <div className="flex items-center justify-end space-x-2">
                        <span>{stockQty}</span>
                        <button 
                            onClick={() => handleOpenAdjustmentModal(product, branch.id)}
                            className="p-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 opacity-50 hover:opacity-100 focus:opacity-100"
                            title={`Ajustar stock en ${branch.name}`}
                            aria-label={`Ajustar stock de ${product.name} en ${branch.name}`}
                        >
                            <Cog6ToothIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            },
            className: 'text-right w-1/12', 
        }));

        const totalStockColumn: TableColumn<Product>[] = [{
            header: 'Stock Total',
            accessor: (product) => product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0),
            className: 'text-right font-semibold w-1/12',
        }];
        
        return [...staticColumns, ...branchColumns, ...totalStockColumn];
    }, [activeBranches]);


    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
                    Inventario POS Global
                </h1>
                 <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                    <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tabla"><ListBulletIcon/></button>
                    <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tarjetas"><Squares2X2Icon/></button>
                </div>
            </div>

            <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${INPUT_SM_CLASSES} flex-grow`}
                />
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`${INPUT_SM_CLASSES} sm:w-auto`}
                >
                    <option value="Todos">Todas las Categorías</option>
                    {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {viewMode === 'table' ? (
                <DataTable<Product>
                    data={filteredAndSearchedProducts}
                    columns={tableColumns}
                    // Actions are now inline with branch stock
                />
            ) : ( // Card View
                filteredAndSearchedProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredAndSearchedProducts.map(product => (
                            <div key={product.id} className="bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-md flex flex-col justify-between">
                                <div>
                                    <img src={product.imageUrl || 'https://picsum.photos/seed/prodinv/200'} alt={product.name} className="w-full h-32 object-cover rounded mb-2" />
                                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate" title={product.name}>{product.name}</h3>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">SKU: {product.skus?.[0] || 'N/A'}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Categoría: {product.category || 'N/A'}</p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-1">Precio: <span className="font-medium">${product.unitPrice.toFixed(2)}</span></p>
                                    <div className="space-y-1 text-xs mb-2">
                                        <p className="font-semibold text-neutral-700 dark:text-neutral-100">Stock por Sucursal:</p>
                                        {activeBranches.map(branch => {
                                            const stockEntry = product.stockByBranch.find(sb => sb.branchId === branch.id);
                                            const stockQty = stockEntry ? stockEntry.quantity : 0;
                                            return (
                                                <div key={branch.id} className="flex justify-between items-center">
                                                    <span>{branch.name}: {stockQty}</span>
                                                    <button 
                                                        onClick={() => handleOpenAdjustmentModal(product, branch.id)}
                                                        className="p-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title={`Ajustar stock en ${branch.name}`}
                                                        aria-label={`Ajustar stock de ${product.name} en ${branch.name}`}
                                                    >
                                                        <Cog6ToothIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-sm font-bold text-primary">Stock Total: {product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">No se encontraron productos con los filtros actuales.</p>
                )
            )}

            <StockAdjustmentModal
                isOpen={showAdjustmentModal}
                onClose={() => setShowAdjustmentModal(false)}
                product={productToAdjust}
                branchId={branchForAdjustment}
            />
        </div>
    );
};
