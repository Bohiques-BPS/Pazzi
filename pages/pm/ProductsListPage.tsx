
import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductFormData, Category, UserRole } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Imported useTranslation
import { DataTable, TableColumn } from '../../components/DataTable'; 
import { ProductFormModal } from './ProductFormModal'; 
import { ConfirmationModal } from '../../components/Modal'; 
import { ProductCard } from '../../components/cards/ProductCard'; 
import { PlusIcon, EditIcon, DeleteIcon, Squares2X2Icon, ListBulletIcon, Cog6ToothIcon } from '../../components/icons'; 
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ADMIN_USER_ID, inputFormStyle } from '../../constants'; 
import { InventoryHistoryModal } from '../../components/ui/InventoryHistoryModal';
import { StockAdjustmentModal } from '../../components/forms/StockAdjustmentModal';
import { API_URL } from './api';

export const ProductsListPage: React.FC = () => {
    const { t } = useTranslation(); // Use hook
    const { products, setProducts, categories: dynamicCategories, addInventoryLog, branches } = useData(); 
    const { currentUser } = useAuth();
    
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [productForHistory, setProductForHistory] = useState<Product | null>(null);
    
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
    const [branchForAdjustment, setBranchForAdjustment] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE_CARD_VIEW = 10;

    // Sincronizamos globalProducts directamente con el estado products que viene del fetch
    const globalProducts = products;

    const activeBranches = useMemo(() => branches.filter(b => b.isActive), [branches]);
    const availableCategories = useMemo(() => {
        return dynamicCategories.filter(cat => !cat.storeOwnerId || cat.storeOwnerId === currentUser?.id || currentUser?.role === UserRole.MANAGER);
    }, [dynamicCategories, currentUser]);

    // Carga de datos real desde el backend
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`${API_URL}/products`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    // Normalizamos los productos para que la categoría sea un string (el nombre)
                    const normalized = data.map((p: any) => ({
                        ...p,
                        category: typeof p.category === 'object' ? p.category.name : p.category,
                        skus: Array.isArray(p.skus) ? p.skus.map((s: any) => typeof s === 'string' ? s : s.sku) : [],
                        customSpecifications: p.customSpecs || []
                    }));
                    setProducts(normalized);
                }
            } catch (error) {
                console.error("Error al cargar productos:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchProducts();
    }, [setProducts]);


    const openModalForCreate = () => {
        setEditingProduct(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (product: Product) => {
               if (product.storeOwnerId === ADMIN_USER_ID || product.storeOwnerId === currentUser?.id) {

            setEditingProduct(product);
            setShowFormModal(true);
        } else {
                       alert("No tienes permisos para editar este producto.");

        }
    };

    const requestDelete = (productId: string) => {
        const productToDelete = globalProducts.find(p => p.id === productId);
               if (productToDelete && (productToDelete.storeOwnerId === ADMIN_USER_ID || productToDelete.storeOwnerId === currentUser?.id)) {

            setItemToDeleteId(productId);
            setShowDeleteConfirmModal(true);
        } else {
                     alert("No tienes permisos para eliminar este producto.");

        }
    };
    
    const openHistoryModal = (product: Product) => {
        setProductForHistory(product);
        setShowHistoryModal(true);
    };
    
    const openAdjustmentModal = (product: Product, branchId: string) => {
        setProductToAdjust(product);
        setBranchForAdjustment(branchId);
        setShowAdjustmentModal(true);
    };

    const confirmDelete = async () => {
        if (itemToDeleteId) {
           
            try {
                const response = await fetch(`${API_URL}/products/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                if (response.ok) {
                    setProducts(prev => prev.filter(p => p.id !== itemToDeleteId));
                } else {
                    const errData = await response.json();
                    alert(errData.error || "No se pudo eliminar el producto del servidor.");
                }
            } catch (error) {
                console.error("Error al eliminar producto:", error);
            } finally {
                setItemToDeleteId(null);
            }
        }
        setShowDeleteConfirmModal(false);
    };

    const filteredProducts = useMemo(() => {
        return globalProducts 
            .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     (p.skus && p.skus.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
                
                const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;

                return matchesSearch && matchesCategory;
            });
    }, [globalProducts, searchTerm, selectedCategory]);

    const paginatedCardProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE_CARD_VIEW;
        return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE_CARD_VIEW);
    }, [filteredProducts, currentPage]);
    
    const totalCardPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE_CARD_VIEW);

    const tableColumns = useMemo((): TableColumn<Product>[] => {
        const staticColumns: TableColumn<Product>[] = [
            { 
                header: t('Image'), 
                accessor: (product) => (
                    <div className="w-10 h-10 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mx-auto">
                        {product.imageUrl ? (
                            <img 
                                src={product.imageUrl.startsWith('http') 
                                    ? product.imageUrl
                                    : `${API_URL.replace('/api', '')}${product.imageUrl.startsWith('/') ? '' : '/'}${product.imageUrl}`
                                } 
                                alt={product.name} 
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            <div className="text-neutral-400 text-[8px] font-bold">N/A</div>
                        )}
                    </div>
                ),
                className: 'w-16 text-center'
            },
            { header: t('product.name'), accessor: 'name', className: 'font-medium min-w-[150px]', noWrap: false },
            { header: t('product.sku'), accessor: (p) => {
                const firstSku = p.skus?.[0];
                return typeof firstSku === 'object' ? (firstSku as any).sku : (firstSku || 'N/A');
            }},
            { header: t('product.category'), accessor: 'category' },
        ];

        const branchColumns: TableColumn<Product>[] = activeBranches.map(branch => ({
            header: branch.name,
            accessor: (product) => {
                const stockQty = product.stockByBranch.find(sb => sb.branchId === branch.id)?.quantity ?? 0;
                return (
                    <div className="flex items-center justify-end space-x-1">
                        <span>{stockQty}</span>
                        <button onClick={() => openAdjustmentModal(product, branch.id)} className="p-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" title={`Ajustar stock en ${branch.name}`}>
                            <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                    </div>
                );
            },
            className: 'text-right',
        }));

        const totalStockColumn: TableColumn<Product>[] = [{
            header: t('product.stock_total'),
            accessor: (product) => product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0),
            className: 'text-right font-semibold',
        }];
        
        return [...staticColumns, ...branchColumns, ...totalStockColumn];
    }, [activeBranches, t]); // Added t dependency
    
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('product.list.title')}</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder={t('common.search') + "..."}
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label="Buscar productos"
                    />
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES}`}
                        aria-label="Filtrar por categoría"
                    >
                        <option value="Todos">Todas</option>
                        {availableCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                     <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                        <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tarjetas"><Squares2X2Icon className="w-5 h-5"/></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tabla"><ListBulletIcon className="w-5 h-5"/></button>
                    </div>
                    <button 
                        onClick={openModalForCreate} 
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}
                    >
                       <PlusIcon className="w-5 h-5"/> {t('product.list.add')}
                    </button>
                </div>
            </div>

            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando productos desde la base de datos...</span>
                </div>
            )}

            {!loadingData && viewMode === 'card' ? (
                <>
                    {paginatedCardProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {paginatedCardProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onEdit={openModalForEdit} 
                                    onRequestDelete={requestDelete} 
                                    onAdjustStock={openAdjustmentModal}
                                    onViewHistory={openHistoryModal} 
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">No se encontraron productos con los filtros actuales.</p>
                    )}
                    {totalCardPages > 1 && (
                        <div className="mt-6 flex justify-center items-center space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.previous')}</button>
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{t('common.page_of', { current: currentPage, total: totalCardPages })}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalCardPages, p + 1))} disabled={currentPage === totalCardPages} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.next')}</button>
                        </div>
                    )}
                </>
            ) : !loadingData && (
                 <DataTable<Product>
                    data={filteredProducts}
                    columns={tableColumns}
                    actions={(product) => (
                        <div className="flex space-x-1">
                            <button onClick={() => openModalForEdit(product)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Editar ${product.name}`}><EditIcon /></button>
                            <button onClick={() => openHistoryModal(product)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1" aria-label={`Ver movimientos de ${product.name}`}><ListBulletIcon/></button>
                            <button onClick={() => requestDelete(product.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={`Eliminar ${product.name}`}><DeleteIcon /></button>
                        </div>
                    )}
                />
            )}
            <ProductFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                productToEdit={editingProduct} 
                storeOwnerIdForNewProduct={currentUser?.id || ADMIN_USER_ID} // Pasar el ID del usuario actual para nuevos productos
            />
            <ConfirmationModal 
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
            <InventoryHistoryModal 
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                productId={productForHistory?.id || null}
            />
             <StockAdjustmentModal
                isOpen={showAdjustmentModal}
                onClose={() => setShowAdjustmentModal(false)}
                product={productToAdjust}
                branchId={branchForAdjustment}
                addInventoryLog={addInventoryLog}
            />
        </div>
    );
};
