
import React, { useState, useMemo } from 'react';
import { Product, ProductFormData, Category } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { DataTable, TableColumn } from '../../components/DataTable'; 
import { ProductFormModal } from './ProductFormModal'; 
import { ConfirmationModal } from '../../components/Modal'; 
import { ProductCard } from '../../components/cards/ProductCard'; 
import { PlusIcon, EditIcon, DeleteIcon, Squares2X2Icon, ListBulletIcon, SparklesIcon } from '../../components/icons'; 
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ADMIN_USER_ID } from '../../constants'; 
import { AIImportModal } from '../../components/AIImportModal'; 

export const ProductsListPage: React.FC = () => {
    const { products, setProducts, categories: dynamicCategories, getProductsByStoreOwner, addProduct } = useData(); 
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);

    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE_CARD_VIEW = 5;

    const globalProducts = useMemo(() => getProductsByStoreOwner(ADMIN_USER_ID), [products, getProductsByStoreOwner]);


    const openModalForCreate = () => {
        setEditingProduct(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (product: Product) => {
        if (product.storeOwnerId === ADMIN_USER_ID) {
            setEditingProduct(product);
            setShowFormModal(true);
        } else {
            alert("Este producto no es un producto global y no puede editarse aquí.");
        }
    };

    const requestDelete = (productId: string) => {
        const productToDelete = globalProducts.find(p => p.id === productId);
        if (productToDelete && productToDelete.storeOwnerId === ADMIN_USER_ID) {
            setItemToDeleteId(productId);
            setShowDeleteConfirmModal(true);
        } else {
            alert("Este producto no es un producto global y no puede eliminarse aquí.");
        }
    };

    const confirmDelete = () => {
        if (itemToDeleteId) {
            setProducts(prev => prev.filter(p => p.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const handleAiProductImportSuccess = (dataArray: any[]) => {
        console.log("AI Data Array for Product Import:", dataArray);
        if (!Array.isArray(dataArray)) {
            alert("La IA no devolvió un array de datos de productos.");
            return;
        }

        let importedCount = 0;
        let failedCount = 0;

        dataArray.forEach((item) => {
            const name = item.nombre || item.name || '';
            const unitPrice = typeof item.precio === 'number' ? item.precio : (typeof item.unitPrice === 'number' ? item.unitPrice : undefined);
            
            if (!name || unitPrice === undefined) {
                console.warn(`Ítem omitido por falta de campos obligatorios (nombre, precio):`, item);
                failedCount++;
                return;
            }

            const productFormData: ProductFormData = {
                name: name,
                unitPrice: unitPrice,
                description: item.descripcion || item.description || '',
                skus: Array.isArray(item.skus) ? item.skus.map(String) : (typeof item.sku === 'string' ? [item.sku] : []),
                category: item.categoria || item.category || (dynamicCategories.find(c => c.storeOwnerId === ADMIN_USER_ID || !c.storeOwnerId)?.name || ''),
                ivaRate: typeof item.ivaRate === 'number' ? item.ivaRate : (typeof item.tasaIVA === 'number' ? item.tasaIVA : 0.16),
                imageUrl: item.imageUrl || `https://picsum.photos/seed/ai-prod-${Date.now()}-${importedCount}/200/200`,
                storeOwnerId: ADMIN_USER_ID, 
            };
            addProduct(productFormData); // Use new addProduct function
            importedCount++;
        });
        
        let message = `${importedCount} productos importados correctamente.`;
        if (failedCount > 0) {
            message += ` ${failedCount} productos no pudieron ser importados por falta de datos.`;
        }
        alert(message);
        setShowAIImportModal(false);
    };

    const filteredProducts = useMemo(() => {
        return globalProducts 
            .filter(p => 
                (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 (p.skus && p.skus.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))) &&
                (selectedCategory === 'Todos' || p.category === selectedCategory)
            );
    }, [globalProducts, searchTerm, selectedCategory]);

    const paginatedCardProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE_CARD_VIEW;
        return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE_CARD_VIEW);
    }, [filteredProducts, currentPage]);
    
    const totalCardPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE_CARD_VIEW);

    const tableColumns: TableColumn<Product>[] = [
        { header: 'Imagen', accessor: (p) => p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded"/> : 'N/A' },
        { header: 'Nombre', accessor: 'name' },
        { header: 'SKUs', accessor: (p) => p.skus?.join(', ') || 'N/A' },
        { header: 'Categoría', accessor: 'category' },
        { header: 'Precio', accessor: (p) => `$${p.unitPrice.toFixed(2)}` },
        // { header: 'Stock', accessor: 'stock' }, // Removed stock column
        { header: 'IVA', accessor: (p) => p.ivaRate ? `${(p.ivaRate * 100).toFixed(0)}%` : 'N/A' },
    ];

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Productos (Globales)</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder="Buscar productos globales..." 
                        value={searchTerm} 
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label="Buscar productos globales"
                    />
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES} flex-shrink-0`}
                        aria-label="Filtrar por categoría global"
                    >
                        <option value="Todos">Todas las categorías</option>
                        {dynamicCategories.filter(c => !c.storeOwnerId || c.storeOwnerId === ADMIN_USER_ID).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                     <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                        <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tarjetas"><Squares2X2Icon/></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tabla"><ListBulletIcon/></button>
                    </div>
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                        <SparklesIcon /> Importar con IA
                    </button>
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                       <PlusIcon /> Agregar Producto
                    </button>
                </div>
            </div>

            {viewMode === 'card' ? (
                <>
                    {paginatedCardProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                            {paginatedCardProducts.map(product => (
                                <ProductCard key={product.id} product={product} onEdit={() => openModalForEdit(product)} onRequestDelete={requestDelete} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">No se encontraron productos globales con los filtros actuales.</p>
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
                    data={filteredProducts}
                    columns={tableColumns}
                    actions={(product) => (
                        <>
                            <button onClick={() => openModalForEdit(product)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Editar ${product.name}`}><EditIcon /></button>
                            <button onClick={() => requestDelete(product.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={`Eliminar ${product.name}`}><DeleteIcon /></button>
                        </>
                    )}
                />
            )}
            <ProductFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                productToEdit={editingProduct} 
                storeOwnerIdForNewProduct={ADMIN_USER_ID} // For global products
            />
            <ConfirmationModal 
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que quieres eliminar este producto global? Esta acción no se puede deshacer.`}
                confirmButtonText="Sí, Eliminar"
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiProductImportSuccess}
                entityName="Producto Global"
                fieldsToExtract="nombre, skus (array de strings), categoría, precio (número), tasaIVA (número decimal, ej: 0.16), descripción, imageUrl (opcional)"
                exampleFormat={`{
  "nombre": "Azulejo de Cerámica",
  "skus": ["AZ-CER-001", "TILE-WHT-LG"],
  "categoria": "Revestimientos",
  "precio": 12.99,
  "tasaIVA": 0.16,
  "descripcion": "Azulejo de cerámica blanco brillante para baños y cocinas, tamaño 30x60cm."
}`}
            />
        </div>
    );
};
