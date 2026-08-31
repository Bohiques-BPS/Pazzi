
import React, { useState, useMemo, useEffect } from 'react';
import { deleteWithUndo } from '../../utils/deleteWithUndo';
import { Product, ProductFormData, Category, UserRole } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Imported useTranslation
import { DataTable, TableColumn } from '../../components/DataTable'; 
import { ProductFormModal } from './ProductFormModal';
import { CameraScanModal } from '../../components/ui/CameraScanModal';
import { ConfirmationModal } from '../../components/Modal'; 
import { ProductCard } from '../../components/cards/ProductCard'; 
import { PlusIcon, EditIcon, DeleteIcon, Squares2X2Icon, ListBulletIcon, Cog6ToothIcon, CameraIcon } from '../../components/icons';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ADMIN_USER_ID, inputFormStyle } from '../../constants'; 
import { InventoryHistoryModal } from '../../components/ui/InventoryHistoryModal';
import { StockAdjustmentModal } from '../../components/forms/StockAdjustmentModal';
import { ImportModal, type ImportFieldDef } from '../../components/ui/ImportModal';
import { stripHtml, firstImageUrl, categoryFromPath, departmentFromPath, statusToActive, priceOf } from '../../utils/wpImport';
import { ProductReportsModal } from './ProductReportsModal';
import { ADVANCED_PRODUCT_FIELDS } from '../../config/advancedProductFields';
import { productsService } from '../../services/products';
import { API_URL } from '../../services/api';
import logo from '../../assets/logo.png';
import { toast } from 'react-hot-toast';
import { printBarcodeLabel } from '../../services/labelPrinter';

// Campos importables de producto + alias para el auto-mapeo heurístico de columnas.
// categoryName / departmentName / supplierName se resuelven por NOMBRE en el backend
// (crea la categoría/división/proveedor si no existe y enlaza el id al producto).
const PRODUCT_IMPORT_FIELDS: ImportFieldDef[] = [
    // Alias/transformaciones incluyen columnas de WooCommerce (post_title, tax:product_cat, images, etc.).
    { key: 'name', label: 'Nombre', required: true, aliases: ['descripcion', 'producto', 'articulo', 'item', 'nombre producto', 'post_title', 'title'] },
    { key: 'categoryName', label: 'Categoría (por nombre)', aliases: ['categoria', 'category', 'rubro', 'tax:product_cat', 'product_cat'], transform: categoryFromPath },
    { key: 'departmentName', label: 'División / Departamento', aliases: ['division', 'departamento', 'department', 'tax:product_cat', 'product_cat'], transform: departmentFromPath },
    { key: 'supplierName', label: 'Proveedor (por nombre)', aliases: ['suplidor1', 'suplidor', 'proveedor', 'supplier', 'tax:product_brand', 'product_brand', 'marca'] },
    { key: 'unitPrice', label: 'Precio de venta', type: 'number', aliases: ['precioventa', 'precio venta', 'precio', 'pvp', 'venta', 'price', 'regular_price', 'sale_price'], transform: priceOf },
    { key: 'costPrice', label: 'Costo', type: 'number', aliases: ['costoreal', 'costo real', 'costo', 'cost'] },
    { key: 'initialStock', label: 'Stock inicial', type: 'number', aliases: ['balanceinicial', 'balance inicial', 'stock inicial', 'existencia', 'cantidad', 'stock'] },
    { key: 'sku', label: 'SKU / Referencia', aliases: ['referencia', 'sku', 'codigo interno', 'ref', 'clave'] },
    { key: 'barcode13Digits', label: 'Código de barras', aliases: ['barcode', 'codigo barras', 'ean', 'upc', 'bcde13', 'codigo', 'meta:_global_unique_id', 'global_unique_id'] },
    { key: 'barcode2', label: 'Código de barras 2', aliases: ['barcode2', 'codigo barras 2'] },
    { key: 'chainCode', label: 'Código de cadena', aliases: ['bccadena', 'codigo cadena', 'chain'] },
    { key: 'family', label: 'Familia', aliases: ['familia', 'family'] },
    { key: 'manufacturer', label: 'Marca / Fabricante', aliases: ['marca', 'fabricante', 'manufacturer', 'brand', 'tax:product_brand'] },
    { key: 'physicalLocation', label: 'Localización', aliases: ['localizacion', 'ubicacion', 'location'] },
    { key: 'weight', label: 'Peso', type: 'number', aliases: ['peso', 'weight'] },
    { key: 'imageUrl', label: 'Imagen (URL)', aliases: ['imagen', 'image', 'images', 'thumbnail', 'foto'], transform: firstImageUrl },
    { key: 'description', label: 'Descripción larga', aliases: ['longdesc', 'descripcion larga', 'detalle', 'post_content', 'post_excerpt', 'content'], transform: stripHtml },
    { key: 'isActive', label: 'Activo', type: 'boolean', aliases: ['activo', 'active', 'post_status', 'status', 'stock_status'], transform: statusToActive },
    { key: 'isService', label: 'Es servicio', type: 'boolean', aliases: ['esservicio', 'es servicio', 'servicio', 'service'] },
    { key: 'creationDate', label: 'Fecha de creación', type: 'date', aliases: ['fechacreado', 'fecha creado', 'creado', 'post_date'] },
    // Campos avanzados (config compartido con el formulario).
    ...ADVANCED_PRODUCT_FIELDS.map(f => ({
        key: f.key,
        label: f.label,
        type: (f.type === 'text' ? 'string' : f.type) as 'string' | 'number' | 'boolean' | 'date',
        aliases: f.aliases,
    })),
];

export const ProductsListPage: React.FC = () => {
    const { t } = useTranslation(); // Use hook
    const { products, setProducts, categories: dynamicCategories, branches, departments, suppliers } = useData();
    const { currentUser } = useAuth();
    
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [migratingImages, setMigratingImages] = useState(false);

    const handleMigrateImages = async () => {
        setMigratingImages(true);
        try {
            const res = await productsService.migrateImagesToCloudinary();
            toast.success(t('pmx.product.migrate_done_all', { p: res.migrated, c: res.categoriesMigrated, logo: res.logoMigrated ? '✓' : '—' }));
            setRefreshKey(k => k + 1); // recargar para ver las imágenes desde Cloudinary
        } catch (err: any) {
            toast.error(err?.message || t('pmx.product.migrate_error'));
        } finally {
            setMigratingImages(false);
        }
    };
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [productForHistory, setProductForHistory] = useState<Product | null>(null);
    
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
    const [branchForAdjustment, setBranchForAdjustment] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('Todos');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('Todos');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 24;

    // Debounce de la búsqueda para no pegarle al backend en cada tecla.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchTerm), 350);
        return () => clearTimeout(id);
    }, [searchTerm]);

    // Al cambiar cualquier filtro, volver a la página 1.
    useEffect(() => { setCurrentPage(1); }, [debouncedSearch, selectedCategory, selectedDepartment, selectedSupplier, statusFilter, stockFilter]);

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
                // Paginación + búsqueda + categoría del lado del servidor (soporta catálogos grandes).
                const params = new URLSearchParams();
                params.set('page', String(currentPage));
                params.set('limit', String(PAGE_SIZE));
                if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
                if (selectedCategory !== 'Todos') {
                    const cat = dynamicCategories.find(c => c.name === selectedCategory);
                    if (cat) params.set('categoryId', cat.id);
                }
                if (selectedDepartment !== 'Todos') params.set('departmentId', selectedDepartment);
                if (selectedSupplier !== 'Todos') params.set('supplierId', selectedSupplier);
                if (statusFilter !== 'all') params.set('isActive', statusFilter === 'active' ? 'true' : 'false');
                if (stockFilter !== 'all') params.set('stockStatus', stockFilter);
                const response = await fetch(`${API_URL}/products?${params.toString()}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                const total = Number(response.headers.get('X-Total-Count'));
                setTotalCount(Number.isFinite(total) ? total : 0);

                if (Array.isArray(data)) {
                    // Normalizamos los productos para que la categoría sea un string (el nombre)
                    const normalized = data.map((p: any) => ({
                        ...p,
                        // OJO: typeof null === 'object', por eso el guard `&& p.category` (evita null.name).
                        category: (p.category && typeof p.category === 'object') ? p.category.name : p.category,
                        skus: Array.isArray(p.skus) ? p.skus.map((s: any) => typeof s === 'string' ? s : s?.sku) : [],
                        customSpecifications: p.customSpecs || []
                    }));
                    setProducts(normalized);
                }
            } catch (error) {
                console.error("Error al cargar productos:", error);
                toast.error(t('pmx.product.load_error'));
            } finally {
                setLoadingData(false);
            }
        };
        fetchProducts();
    }, [setProducts, refreshKey, currentPage, debouncedSearch, selectedCategory, selectedDepartment, selectedSupplier, statusFilter, stockFilter, dynamicCategories]);


    const openModalForCreate = () => {
        setEditingProduct(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (product: Product) => {
               if (product.storeOwnerId === ADMIN_USER_ID || product.storeOwnerId === currentUser?.id) {

            setEditingProduct(product);
            setShowFormModal(true);
        } else {
                       toast.error(t('pmx.product.no_permission_edit'));

        }
    };

    // Escanear un código → buscar el producto (código de barras / SKU / nombre) y abrir su edición.
    const handleScan = (raw: string) => {
        const code = String(raw || '').trim();
        setShowScanner(false);
        if (!code) return;
        const c = code.toLowerCase();
        const found = globalProducts.find(p =>
            (p as any).barcode13Digits === code || (p as any).barcode2 === code ||
            (Array.isArray(p.skus) && p.skus.some((s: any) => String(s).toLowerCase() === c)) ||
            p.name.toLowerCase() === c
        );
        if (found) openModalForEdit(found);
        else toast.error(t('pmx.product.scan_not_found', { code }) || `No se encontró un producto para: ${code}`);
    };

    const requestDelete = (productId: string) => {
        const productToDelete = globalProducts.find(p => p.id === productId);
               if (productToDelete && (productToDelete.storeOwnerId === ADMIN_USER_ID || productToDelete.storeOwnerId === currentUser?.id)) {

            setItemToDeleteId(productId);
            setShowDeleteConfirmModal(true);
        } else {
                     toast.error(t('pmx.product.no_permission_delete'));

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

    const confirmDelete = () => {
        if (!itemToDeleteId) { setShowDeleteConfirmModal(false); return; }
        const id = itemToDeleteId;
        const item = products.find(p => p.id === id);
        setItemToDeleteId(null);
        setShowDeleteConfirmModal(false);
        deleteWithUndo({
            label: t('entity.product'),
            optimisticRemove: () => setProducts(prev => prev.filter(p => p.id !== id)),
            restore: () => setProducts(prev => (item && !prev.some(p => p.id === id)) ? [item, ...prev] : prev),
            apiDelete: async () => {
                const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` } });
                if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || t('pmx.product.delete_error')); }
            },
            errorMessage: t('pmx.product.delete_error'),
        });
    };

    // El backend ya devuelve la página filtrada por búsqueda/categoría → usamos los datos tal cual.
    const filteredProducts = globalProducts;
    const paginatedCardProducts = globalProducts;
    const totalCardPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
                                onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = logo; t.className = 'w-full h-full object-contain p-1 opacity-60'; } }}
                            />
                        ) : (
                            <img src={logo} alt="" className="w-full h-full object-contain p-1 opacity-50" />
                        )}
                    </div>
                ),
                className: 'w-16 text-center'
            },
            { header: t('product.field.name'), accessor: 'name', className: 'font-medium min-w-[150px]', noWrap: false },
            { header: 'SKU', accessor: (p) => {
                const firstSku = p.skus?.[0];
                return typeof firstSku === 'object' ? (firstSku as any).sku : (firstSku || 'N/A');
            }},
            { header: t('product.field.category'), accessor: (p) => (p.category as any)?.name ?? p.category ?? 'N/A' },
        ];

        const branchColumns: TableColumn<Product>[] = activeBranches.map(branch => ({
            header: branch.name,
            accessor: (product) => {
                const stockQty = product.stockByBranch.find(sb => sb.branchId === branch.id)?.quantity ?? 0;
                return (
                    <div className="flex items-center justify-end space-x-1">
                        <span>{stockQty}</span>
                        <button onClick={() => openAdjustmentModal(product, branch.id)} className="p-0.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" title={t('pmx.product.adjust_stock_in', { branch: branch.name })}>
                            <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                    </div>
                );
            },
            className: 'text-right',
            sortable: true,
            sortKey: `branch-${branch.id}`,
            sortValue: (product) => product.stockByBranch.find(sb => sb.branchId === branch.id)?.quantity ?? 0,
        }));

        const totalStockColumn: TableColumn<Product>[] = [{
            header: t('product.stock_total'),
            accessor: (product) => product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0),
            className: 'text-right font-semibold',
            sortable: true,
            sortKey: 'totalStock',
            sortValue: (product) => product.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0),
        }];
        
        return [...staticColumns, ...branchColumns, ...totalStockColumn];
    }, [activeBranches, t]); // Added t dependency
    
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('product.list.title')} {totalCount > 0 && <span className="text-base font-normal text-neutral-500">({totalCount})</span>}</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder={t('pmx.product.search_ph')}
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label={t('pmx.product.search_aria')}
                    />
                     <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                        <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label={t('pmx.product.view_cards')}><Squares2X2Icon className="w-5 h-5"/></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label={t('pmx.product.view_table')}><ListBulletIcon className="w-5 h-5"/></button>
                    </div>
                    <button
                        onClick={() => setShowReportsModal(true)}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0`}
                        title={t('pmx.product.view_reports_title')}
                    >
                       📊 {t('pmx.product.view_reports')}
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0`}
                        title={t('pmx.product.import_title')}
                    >
                       📥 {t('pmx.common.import')}
                    </button>
                    <button
                        onClick={handleMigrateImages}
                        disabled={migratingImages}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0 disabled:opacity-50`}
                        title={t('pmx.product.migrate_title')}
                    >
                       {migratingImages ? '…' : `☁️ ${t('pmx.product.migrate_btn')}`}
                    </button>
                    <button
                        onClick={() => setShowScanner(true)}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0`}
                        title={t('pmx.product.scan_title') || 'Escanear un producto para editarlo'}
                    >
                       <CameraIcon className="w-5 h-5 mr-1" /> {t('pmx.product.scan') || 'Escanear'}
                    </button>
                    <button
                        onClick={openModalForCreate}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}
                    >
                       <PlusIcon className="w-5 h-5"/> {t('product.list.add')}
                    </button>
                </div>
            </div>

            {/* Barra de filtros por columna (server-side) */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t('pmx.common.filters_label')}</span>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={INPUT_SM_CLASSES}
                    aria-label={t('pmx.product.filter_category')}
                >
                    <option value="Todos">{t('pmx.product.category_all')}</option>
                    {availableCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className={INPUT_SM_CLASSES}
                    aria-label={t('pmx.product.filter_department')}
                >
                    <option value="Todos">{t('pmx.product.department_all')}</option>
                    {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                </select>
                <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className={INPUT_SM_CLASSES}
                    aria-label={t('pmx.product.filter_supplier')}
                >
                    <option value="Todos">{t('pmx.product.supplier_all')}</option>
                    {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className={INPUT_SM_CLASSES}
                    aria-label={t('pmx.product.filter_status')}
                >
                    <option value="all">{t('pmx.product.status_all')}</option>
                    <option value="active">{t('pmx.product.status_active')}</option>
                    <option value="inactive">{t('pmx.product.status_inactive')}</option>
                </select>
                <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as 'all' | 'in' | 'out')}
                    className={INPUT_SM_CLASSES}
                    aria-label={t('pmx.product.filter_stock')}
                >
                    <option value="all">{t('pmx.product.stock_all')}</option>
                    <option value="in">{t('pmx.product.stock_in')}</option>
                    <option value="out">{t('pmx.product.stock_out')}</option>
                </select>
                {(selectedCategory !== 'Todos' || selectedDepartment !== 'Todos' || selectedSupplier !== 'Todos' || statusFilter !== 'all' || stockFilter !== 'all') && (
                    <button
                        onClick={() => { setSelectedCategory('Todos'); setSelectedDepartment('Todos'); setSelectedSupplier('Todos'); setStatusFilter('all'); setStockFilter('all'); }}
                        className="text-sm text-primary hover:underline flex-shrink-0"
                    >
                        {t('pmx.common.clear_filters')}
                    </button>
                )}
            </div>

            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">{t('pmx.product.loading')}</span>
                </div>
            )}

            {!loadingData && viewMode === 'card' ? (
                <>
                    {paginatedCardProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                        <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">{t('pmx.product.none_found')}</p>
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
                <>
                 <DataTable<Product> searchable={false} onRowClick={openModalForEdit}
                    data={filteredProducts}
                    columns={tableColumns}
                    actions={(product) => (
                        <div className="flex space-x-1">
                            <button onClick={() => openModalForEdit(product)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('pmx.product.edit_name', { name: product.name })}><EditIcon className="w-5 h-5" /></button>
                            <button
                                onClick={() => printBarcodeLabel(product).then(() => toast.success(t('pmx.product.label_sent_short'))).catch(err => toast.error(err?.message || t('pmx.product.label_print_failed')))}
                                className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1 text-base leading-none"
                                title={t('pmx.product.print_barcode_of', { name: product.name })}
                                aria-label={t('pmx.product.print_barcode_of', { name: product.name })}
                            >🏷️</button>
                            <button onClick={() => openHistoryModal(product)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1" aria-label={t('pmx.product.view_movements_of', { name: product.name })}><ListBulletIcon/></button>
                            <button onClick={() => requestDelete(product.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('pmx.product.delete_name', { name: product.name })}><DeleteIcon className="w-5 h-5" /></button>
                        </div>
                    )}
                />
                {totalCardPages > 1 && (
                    <div className="mt-6 flex justify-center items-center space-x-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.previous')}</button>
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">{t('common.page_of', { current: currentPage, total: totalCardPages })}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalCardPages, p + 1))} disabled={currentPage === totalCardPages} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.next')}</button>
                    </div>
                )}
                </>
            )}
            <CameraScanModal
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onDetected={handleScan}
                title={t('pmx.product.scan') || 'Escanear producto'}
            />

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
                title={t('pmx.common.confirm_delete_title')}
                message={(() => {
                    const name = globalProducts.find(p => p.id === itemToDeleteId)?.name || '';
                    return name
                        ? t('confirm.delete.named_item', { item: t('confirm.delete.def.product'), name })
                        : t('confirm.delete.named', { item: t('confirm.delete.n.product') });
                })()}
                confirmButtonText={t('pmx.common.yes_delete')}
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
            />
            {showImportModal && (
                <ImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title={t('pmx.product.import_modal_title')}
                    fields={PRODUCT_IMPORT_FIELDS}
                    onImport={async (rows) => {
                        // Mapear a la forma del backend: sku (columna) -> skus (array).
                        const payloads = rows.map(r => {
                            const { sku, ...rest } = r;
                            return { ...rest, skus: sku ? [String(sku)] : [] };
                        });
                        return productsService.bulkImport(payloads);
                    }}
                    onDone={() => setRefreshKey(k => k + 1)}
                />
            )}
            {showReportsModal && (
                <ProductReportsModal
                    isOpen={showReportsModal}
                    onClose={() => setShowReportsModal(false)}
                    onProductsDeleted={() => setRefreshKey(k => k + 1)}
                />
            )}
        </div>
    );
};
