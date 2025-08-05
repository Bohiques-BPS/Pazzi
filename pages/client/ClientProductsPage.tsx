
import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductFormData, Category as CategoryType, UserRole } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { ProductFormModal } from '../pm/ProductFormModal'; 
import { ConfirmationModal } from '../../components/Modal';
import { ProductCard } from '../../components/cards/ProductCard';
import { PlusIcon, EditIcon, DeleteIcon, Squares2X2Icon, ListBulletIcon, SparklesIcon } from '../../components/icons';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { AIImportModal } from '../../components/AIImportModal'; 
import { StockAdjustmentModal } from '../../components/forms/StockAdjustmentModal';

export const ClientProductsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { products, setProducts, getCategoriesByStoreOwner, getProductsByStoreOwner, addProduct, addInventoryLog } = useData();
    
    const [clientProducts, setClientProducts] = useState<Product[]>([]);
    const [clientCategories, setClientCategories] = useState<CategoryType[]>([]);

    useEffect(() => {
        if (currentUser) {
            setClientProducts(getProductsByStoreOwner(currentUser.id));
            setClientCategories(getCategoriesByStoreOwner(currentUser.id));
        }
    }, [currentUser, products, getProductsByStoreOwner, getCategoriesByStoreOwner]);


    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);
    
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
    const [branchForAdjustment, setBranchForAdjustment] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todos'); 
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE_CARD_VIEW = 5;

    const openModalForCreate = () => {
        if (!currentUser) return;
        setEditingProduct(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (product: Product) => {
        if (!currentUser || product.storeOwnerId !== currentUser.id) return; 
        setEditingProduct(product);
        setShowFormModal(true);
    };

    const requestDelete = (productId: string) => {
        setItemToDeleteId(productId);
        setShowDeleteConfirmModal(true);
    };

    const handleOpenAdjustmentModal = (product: Product, branchId: string) => {
        if (currentUser && product.storeOwnerId === currentUser.id) {
            setProductToAdjust(product);
            setBranchForAdjustment(branchId);
            setShowAdjustmentModal(true);
        } else {
            alert("No tienes permiso para ajustar el stock de este producto.");
        }
    };

    const confirmDelete = () => {
        if (itemToDeleteId && currentUser) {
            const productToDelete = clientProducts.find(p => p.id === itemToDeleteId);
            if (productToDelete && productToDelete.storeOwnerId === currentUser.id) {
                 setProducts(prevGlobalProducts => prevGlobalProducts.filter(p => p.id !== itemToDeleteId));
            }
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };
    
    const handleAiProductImportSuccess = (dataArray: any[]) => {
        if (!currentUser) return;
        let importedCount = 0;
        let failedCount = 0;

        dataArray.forEach((item) => {
            const name = item.nombre || item.name || '';
            const unitPrice = typeof item.precio === 'number' ? item.precio : (typeof item.unitPrice === 'number' ? item.unitPrice : undefined);
            
            if (!name || unitPrice === undefined) {
                failedCount++;
                return;
            }
            const productFormData: ProductFormData = {
                name: name,
                unitPrice: unitPrice,
                description: item.descripcion || item.description || '',
                skus: Array.isArray(item.skus) ? item.skus.map(String) : (typeof item.sku === 'string' ? [item.sku] : []),
                category: item.categoria || item.category || (clientCategories.length > 0 ? clientCategories[0].name : ''),
                ivaRate: typeof item.ivaRate === 'number' ? item.ivaRate : (typeof item.tasaIVA === 'number' ? item.tasaIVA : 0.16),
                imageUrl: item.imageUrl || `https://picsum.photos/seed/clientprod-${Date.now()}-${importedCount}/200/200`,
                storeOwnerId: currentUser.id, 
            };
            addProduct(productFormData);
            importedCount++;
        });
        
        alert(`${importedCount} productos importados a tu tienda. ${failedCount > 0 ? `${failedCount} fallaron.` : ''}`);
        setShowAIImportModal(false);
    };


    const filteredClientProducts = useMemo(() => {
        return clientProducts
            .filter(p => 
                (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 (p.skus && p.skus.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))) &&
                (selectedCategoryFilter === 'Todos' || p.category === selectedCategoryFilter)
            );
    }, [clientProducts, searchTerm, selectedCategoryFilter]);

    const paginatedCardProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE_CARD_VIEW;
        return filteredClientProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE_CARD_VIEW);
    }, [filteredClientProducts, currentPage]);
    
    const totalCardPages = Math.ceil(filteredClientProducts.length / ITEMS_PER_PAGE_CARD_VIEW);

    const tableColumns: TableColumn<Product>[] = [
        { header: 'Imagen', accessor: (p) => p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded"/> : 'N/A' },
        { header: 'Nombre', accessor: 'name' },
        { header: 'SKUs', accessor: (p) => p.skus?.join(', ') || 'N/A' },
        { header: 'Categoría', accessor: 'category' },
        { header: 'Precio', accessor: (p) => `$${p.unitPrice.toFixed(2)}` },
        // { header: 'Stock', accessor: 'stock' }, // Removed stock
        { header: 'IVA', accessor: (p) => p.ivaRate ? `${(p.ivaRate * 100).toFixed(0)}%` : 'N/A' },
    ];

    if (!currentUser) {
        return <p className="p-6 text-center">Inicia sesión para administrar tus productos.</p>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Mis Productos de Tienda</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder="Buscar mis productos..." 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                    />
                    <select 
                        value={selectedCategoryFilter} 
                        onChange={(e) => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES} flex-shrink-0`}
                    >
                        <option value="Todos">Todas mis categorías</option>
                        {clientCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                     <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                        <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}><Squares2X2Icon/></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`}><ListBulletIcon/></button>
                    </div>
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                        <SparklesIcon /> Importar con IA
                    </button>
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                       <PlusIcon /> Añadir Producto
                    </button>
                </div>
            </div>

            {viewMode === 'card' ? (
                <>
                    {paginatedCardProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5">
                            {paginatedCardProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onEdit={() => openModalForEdit(product)} 
                                    onRequestDelete={requestDelete} 
                                    onAdjustStock={handleOpenAdjustmentModal}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">No tienes productos con los filtros actuales.</p>
                    )}
                     {totalCardPages > 1 && (
                        <div className="mt-6 flex justify-center items-center space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={BUTTON_SECONDARY_SM_CLASSES}>Anterior</button>
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">Página {currentPage} de {totalCardPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalCardPages, p + 1))} disabled={currentPage === totalCardPages} className={BUTTON_SECONDARY_SM_CLASSES}>Siguiente</button>
                        </div>
                    )}
                </>
            ) : (
                 <DataTable<Product>
                    data={filteredClientProducts}
                    columns={tableColumns}
                    actions={(product) => (
                        <>
                            <button onClick={() => openModalForEdit(product)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"><EditIcon /></button>
                            <button onClick={() => requestDelete(product.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                        </>
                    )}
                />
            )}
            <ProductFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                productToEdit={editingProduct}
                storeOwnerIdForNewProduct={currentUser.id} // Pass current client's ID for new products
            />
            <ConfirmationModal 
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que quieres eliminar este producto de tu tienda?`}
                confirmButtonText="Sí, Eliminar"
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiProductImportSuccess}
                entityName="Producto para mi Tienda"
                fieldsToExtract="nombre, skus (array de strings), categoría, precio (número), tasaIVA (número decimal, ej: 0.16), descripción, imageUrl (opcional)"
                exampleFormat={`{
  "nombre": "Martillo Pro",
  "skus": ["MART-PRO-001"],
  "categoria": "Herramientas Manuales",
  "precio": 25.50,
  "tasaIVA": 0.16,
  "descripcion": "Martillo de uña profesional con mango de fibra de vidrio."
}`}
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