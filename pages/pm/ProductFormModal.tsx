import React, { useState, useEffect } from 'react';
import { Product, ProductFormData, Category, UserRole, Department, ProductVariation, ProductPriceLevel } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';
import { Modal, ConfirmationModal } from '../../components/Modal'; 
import { TrashIconMini, EditIcon } from '../../components/icons'; 
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, ADMIN_USER_ID, CLIENT_PRICE_LEVEL_OPTIONS } from '../../constants'; 
import { InventoryHistoryModal } from '../../components/ui/InventoryHistoryModal';
import { BranchStockAdjustmentModal } from '../../components/forms/BranchStockAdjustmentModal';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit: Product | null; 
    storeOwnerIdForNewProduct?: string; 
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, storeOwnerIdForNewProduct }) => {
    const { currentUser } = useAuth();
    const { addProduct, updateProduct, categories: allCategories, getCategoriesByStoreOwner, suppliers, branches, departments, setProducts } = useData();
    
    const [modalCategories, setModalCategories] = useState<Category[]>([]);
    const [activeTab, setActiveTab] = useState('Principal');
    const tabs = ['Principal', 'Inventario y Precios', 'Identificación', 'Clasificación', 'Niveles de Precio', 'Variaciones', 'Configuración POS'];

    const determineOwnerId = () => {
        if (productToEdit) return productToEdit.storeOwnerId;
        if (storeOwnerIdForNewProduct) return storeOwnerIdForNewProduct;
        return currentUser?.id || ADMIN_USER_ID; // Fallback to admin or current user
    };
    
    const ownerIdForForm = determineOwnerId();
    const [lastEdited, setLastEdited] = useState<'price' | 'cost_profit'>('price');

    const [currentVariation, setCurrentVariation] = useState<Omit<ProductVariation, 'id'>>({ name: '', sku: '', unitPrice: 0 });
    const [editingVariationId, setEditingVariationId] = useState<string | null>(null);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBranchStockModal, setShowBranchStockModal] = useState(false);

    const [currentPriceLevel, setCurrentPriceLevel] = useState<{ levelName: string; price: number }>({ levelName: CLIENT_PRICE_LEVEL_OPTIONS[0], price: 0 });
    const [editingPriceLevelId, setEditingPriceLevelId] = useState<string | null>(null);

    useEffect(() => {
        if (ownerIdForForm) {
            setModalCategories(getCategoriesByStoreOwner(ownerIdForForm));
        } else if (currentUser?.role === UserRole.MANAGER) {
             setModalCategories(allCategories.filter(c => !c.storeOwnerId || c.storeOwnerId === currentUser.id));
        }
    }, [ownerIdForForm, currentUser, allCategories, getCategoriesByStoreOwner, isOpen]);

    const defaultNewProductImageUrl = () => `https://picsum.photos/seed/newproduct-${Date.now()}/200/200`;
    const defaultEditProductImageUrl = (prod: Product) => prod.imageUrl || `https://picsum.photos/seed/edit-${prod.id}/200/200`;

    const getInitialFormData = (): ProductFormData => {
        return {
            name: productToEdit?.name || '',
            unitPrice: productToEdit?.unitPrice || 0,
            description: productToEdit?.description || '',
            imageUrl: productToEdit ? defaultEditProductImageUrl(productToEdit) : defaultNewProductImageUrl(),
            skus: productToEdit?.skus || [],
            category: productToEdit?.category || (modalCategories.length > 0 ? modalCategories[0].name : ''),
            ivaRate: productToEdit?.ivaRate === undefined ? 0.16 : productToEdit.ivaRate,
            storeOwnerId: ownerIdForForm,
            // New fields
            barcode2: productToEdit?.barcode2 || '',
            isActive: productToEdit?.isActive === undefined ? true : productToEdit.isActive,
            isService: productToEdit?.isService || false,
            barcode13Digits: productToEdit?.barcode13Digits || '',
            chainCode: productToEdit?.chainCode || '',
            manufacturer: productToEdit?.manufacturer || '',
            supplierId: productToEdit?.supplierId || (suppliers.length > 0 ? suppliers[0].id : ''),
            costPrice: productToEdit?.costPrice || 0,
            profit: productToEdit?.profit || 0,
            supplierProductCode: productToEdit?.supplierProductCode || '',
            departmentId: productToEdit?.departmentId || '',
            family: productToEdit?.family || '',
            physicalLocation: productToEdit?.physicalLocation || '',
            displayOnScreen: productToEdit?.displayOnScreen === undefined ? true : productToEdit.displayOnScreen,
            requiresSerialNumber: productToEdit?.requiresSerialNumber || false,
            creationDate: productToEdit?.creationDate || new Date().toISOString().split('T')[0],
            useKitchenPrinter: productToEdit?.useKitchenPrinter || false,
            useBarcodePrinter: productToEdit?.useBarcodePrinter || false,
            availableStock: productToEdit?.availableStock || 0,
            isEmergencyTaxExempt: productToEdit?.isEmergencyTaxExempt || false,
            hasVariations: productToEdit?.hasVariations || false,
            variations: productToEdit?.variations || [],
            hasPriceLevels: productToEdit?.hasPriceLevels || false,
            priceLevels: productToEdit?.priceLevels || [],
        };
    };
    
    const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());
    const [newSkuInput, setNewSkuInput] = useState('');

    useEffect(() => {
        const cost = formData.costPrice || 0;
        const profit = formData.profit || 0;
        const price = formData.unitPrice || 0;
    
        if (lastEdited === 'cost_profit') {
            const newPrice = cost + profit;
            if (price.toFixed(4) !== newPrice.toFixed(4)) {
                setFormData(prev => ({ ...prev, unitPrice: newPrice }));
            }
        } else { // lastEdited === 'price'
            const newProfit = price - cost;
            if (profit.toFixed(4) !== newProfit.toFixed(4)) {
                setFormData(prev => ({ ...prev, profit: newProfit }));
            }
        }
    }, [formData.costPrice, formData.profit, formData.unitPrice, lastEdited]);

    useEffect(() => {
        if (isOpen) {
            const initialData = getInitialFormData();
             if (!initialData.category && modalCategories.length > 0) {
                initialData.category = modalCategories[0].name;
            }
            setFormData(initialData);
            setLastEdited('price');
            setNewSkuInput('');
            setActiveTab('Principal'); // Reset to first tab
            setCurrentVariation({ name: '', sku: '', unitPrice: 0 });
            setEditingVariationId(null);
            setCurrentPriceLevel({ levelName: CLIENT_PRICE_LEVEL_OPTIONS[0], price: 0 });
            setEditingPriceLevelId(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productToEdit, isOpen, currentUser, modalCategories, storeOwnerIdForNewProduct, suppliers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    };

    const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseFloat(value) || 0;
    
        if (name === 'unitPrice') {
            setLastEdited('price');
        } else if (name === 'costPrice' || name === 'profit') {
            setLastEdited('cost_profit');
        }
        
        setFormData(prev => ({ ...prev, [name]: numValue }));
    };
    
    const handleAddSku = () => {
        if (newSkuInput.trim() && !formData.skus.includes(newSkuInput.trim())) {
            setFormData(prev => ({ ...prev, skus: [...prev.skus, newSkuInput.trim()] }));
            setNewSkuInput('');
        }
    };

    const handleRemoveSku = (skuToRemove: string) => {
        setFormData(prev => ({ ...prev, skus: prev.skus.filter(sku => sku !== skuToRemove) }));
    };

    const handleVariationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setCurrentVariation(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleAddOrUpdateVariation = () => {
        if (!currentVariation.name || currentVariation.unitPrice <= 0) {
            alert("El nombre y el precio de la variación son obligatorios y el precio debe ser mayor a cero.");
            return;
        }
        
        if (editingVariationId) { // Update
            setFormData(prev => ({
                ...prev,
                variations: prev.variations?.map(v => v.id === editingVariationId ? { ...v, ...currentVariation } : v)
            }));
        } else { // Add new
            const newVariation: ProductVariation = { ...currentVariation, id: `var-${Date.now()}` };
            setFormData(prev => ({
                ...prev,
                variations: [...(prev.variations || []), newVariation]
            }));
        }
        
        setCurrentVariation({ name: '', sku: '', unitPrice: 0 });
        setEditingVariationId(null);
    };

    const handleEditVariation = (variation: ProductVariation) => {
        setEditingVariationId(variation.id);
        setCurrentVariation({ name: variation.name, sku: variation.sku, unitPrice: variation.unitPrice });
    };

    const handleRemoveVariation = (variationId: string) => {
        setFormData(prev => ({
            ...prev,
            variations: prev.variations?.filter(v => v.id !== variationId)
        }));
    };

    const handlePriceLevelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setCurrentPriceLevel(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleAddOrUpdatePriceLevel = () => {
        if (!currentPriceLevel.levelName || currentPriceLevel.price <= 0) {
            alert("El nombre del nivel y el precio son obligatorios y el precio debe ser mayor a cero.");
            return;
        }

        if (editingPriceLevelId) { // Update
            setFormData(prev => ({
                ...prev,
                priceLevels: prev.priceLevels?.map(pl => pl.id === editingPriceLevelId ? { ...pl, ...currentPriceLevel } : pl)
            }));
        } else { // Add new
            if (formData.priceLevels?.some(pl => pl.levelName === currentPriceLevel.levelName)) {
                alert("Ya existe un nivel de precio con este nombre.");
                return;
            }
            const newPriceLevel: ProductPriceLevel = { ...currentPriceLevel, id: `pl-${Date.now()}` };
            setFormData(prev => ({
                ...prev,
                priceLevels: [...(prev.priceLevels || []), newPriceLevel]
            }));
        }

        setCurrentPriceLevel({ levelName: CLIENT_PRICE_LEVEL_OPTIONS[0], price: 0 });
        setEditingPriceLevelId(null);
    };

    const handleEditPriceLevel = (priceLevel: ProductPriceLevel) => {
        setEditingPriceLevelId(priceLevel.id);
        setCurrentPriceLevel({ levelName: priceLevel.levelName, price: priceLevel.price });
    };

    const handleRemovePriceLevel = (priceLevelId: string) => {
        setFormData(prev => ({
            ...prev,
            priceLevels: prev.priceLevels?.filter(pl => pl.id !== priceLevelId)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.storeOwnerId) {
            alert("Error: No se pudo determinar el propietario de la tienda para este producto.");
            return;
        }
        
        if (productToEdit && productToEdit.id) {
            updateProduct(productToEdit.id, formData);
        } else {
            addProduct(formData);
        }
        onClose();
    };

    const handleDiscontinue = () => {
        if (!productToEdit) {
            alert("No se puede descontinuar un producto que no ha sido guardado.");
            return;
        }
        const updatedData = { ...formData, isActive: false };
        updateProduct(productToEdit.id, updatedData);
        onClose();
    };
    
    const handleRequestDelete = () => {
        if (!productToEdit) {
            alert("No se puede eliminar un producto que no ha sido guardado.");
            return;
        }
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        if (productToEdit) {
            setProducts(prev => prev.filter(p => p.id !== productToEdit.id));
            setShowDeleteConfirm(false);
            onClose();
        }
    };
    
    const handleOpenHistory = () => {
        if (productToEdit) {
            setShowHistoryModal(true);
        } else {
            alert("Guarde el producto primero para ver su historial.");
        }
    };

    const handleOpenBranchStock = () => {
        if (productToEdit) {
            setShowBranchStockModal(true);
        } else {
            alert("Guarde el producto primero para gestionar unidades por sucursal.");
        }
    };

    const calculatedTax = (formData.unitPrice || 0) * (formData.ivaRate || 0);
    const customerPrice = (formData.unitPrice || 0) + calculatedTax;
    
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Modificar Inventario' : 'Crear Producto'} size="5xl">
                <form onSubmit={handleSubmit}>
                    <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                        {/* Principal Tab */}
                        <div className={activeTab === 'Principal' ? 'space-y-3' : 'hidden'}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {/* Left Side Panel */}
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="referencia" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Referencia</label>
                                        <input type="text" id="referencia" value={formData.skus[0] || ''} onChange={(e) => setFormData(prev => ({...prev, skus: [e.target.value, ...prev.skus.slice(1)]})) } placeholder="SKU Principal" className={inputFormStyle}/>
                                    </div>
                                    <div>
                                        <label htmlFor="productName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Descripción</label>
                                        <input type="text" name="name" id="productName" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label htmlFor="barcode13Digits" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Código Barras</label>
                                            <input type="text" name="barcode13Digits" id="barcode13Digits" value={formData.barcode13Digits} onChange={handleChange} className={inputFormStyle} />
                                        </div>
                                        <div>
                                            <label htmlFor="barcode2" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Código Barras 2</label>
                                            <input type="text" name="barcode2" id="barcode2" value={formData.barcode2} onChange={handleChange} className={inputFormStyle} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        <div>
                                            <label htmlFor="unitPricePrincipal" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Precio Base</label>
                                            <input type="number" name="unitPrice" id="unitPricePrincipal" value={formData.unitPrice} onChange={handlePricingChange} className={inputFormStyle} min="0" step="0.01"/>
                                        </div>
                                        <div>
                                            <label htmlFor="inventario" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Inventario</label>
                                            <input type="number" id="inventario" value={formData.availableStock} className={inputFormStyle + " bg-neutral-100 dark:bg-neutral-700"} readOnly />
                                        </div>
                                        <div>
                                            <label htmlFor="disponible" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Disponible</label>
                                            <input type="number" id="disponible" value={formData.availableStock} className={inputFormStyle + " bg-neutral-100 dark:bg-neutral-700"} readOnly />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-6 pt-2">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Activo</label>
                                            <div className="flex items-center space-x-2">
                                                <label className="flex items-center text-sm"><input type="radio" name="isActive" checked={!!formData.isActive} onChange={() => setFormData(prev => ({...prev, isActive: true}))} className="form-radio mr-1"/> Si</label>
                                                <label className="flex items-center text-sm"><input type="radio" name="isActive" checked={!formData.isActive} onChange={() => setFormData(prev => ({...prev, isActive: false}))} className="form-radio mr-1"/> No</label>
                                            </div>
                                        </div>
                                        <label className="flex items-center text-sm pt-4"><input type="checkbox" name="isService" checked={!!formData.isService} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Servicio</label>
                                    </div>
                                    <div className="flex items-center space-x-2 pt-2 border-t dark:border-neutral-700">
                                        <button type="button" onClick={handleOpenBranchStock} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-sm disabled:opacity-50 disabled:cursor-not-allowed`} disabled={!productToEdit}>Unidades</button>
                                        <button type="button" onClick={() => setActiveTab('Niveles de Precio')} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-sm disabled:opacity-50 disabled:cursor-not-allowed`} disabled={!productToEdit}>Niveles de Precios</button>
                                        <button type="button" onClick={handleOpenHistory} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-sm disabled:opacity-50 disabled:cursor-not-allowed`} disabled={!productToEdit}>Ver Movimiento</button>
                                    </div>
                                </div>
                                {/* Right side for image / description */}
                                <div className="space-y-3">
                                     <div className="h-48 bg-neutral-100 dark:bg-neutral-700/50 rounded-md flex items-center justify-center">
                                        {formData.imageUrl ? 
                                            <img key={formData.imageUrl} src={formData.imageUrl} alt="Vista previa" className="w-full h-full object-contain rounded"/>
                                            : <span className="text-sm text-neutral-500">Sin imagen</span>
                                        }
                                     </div>
                                      <div className="flex items-center space-x-2">
                                        <button type="button" className={`${BUTTON_SECONDARY_SM_CLASSES} !text-sm`}>Archivo</button>
                                        <button type="button" className={`${BUTTON_SECONDARY_SM_CLASSES} !text-sm`}>Sacar Foto</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Inventario y Precios Tab */}
                        <div className={activeTab === 'Inventario y Precios' ? 'space-y-3' : 'hidden'}>
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">Cálculo de Precios (Base)</label>
                                <div className="flex flex-wrap items-end gap-2 text-center">
                                    <div className="flex flex-col items-center flex-1 min-w-[80px]">
                                        <label htmlFor="costPrice" className="text-sm text-neutral-600 dark:text-neutral-400">Costo</label>
                                        <input type="number" name="costPrice" id="costPrice" value={formData.costPrice} onChange={handlePricingChange} className={`${inputFormStyle} text-center`} min="0" step="0.01"/>
                                    </div>
                                    <span className="font-semibold text-lg text-neutral-600 dark:text-neutral-400 pb-1">+</span>
                                    <div className="flex flex-col items-center flex-1 min-w-[80px]">
                                        <label htmlFor="profit" className="text-sm text-neutral-600 dark:text-neutral-400">Ganancia</label>
                                        <input type="number" name="profit" id="profit" value={formData.profit} onChange={handlePricingChange} className={`${inputFormStyle} text-center`} step="0.01"/>
                                    </div>
                                    <span className="font-semibold text-lg text-neutral-600 dark:text-neutral-400 pb-1">=</span>
                                    <div className="flex flex-col items-center flex-1 min-w-[80px]">
                                        <label htmlFor="unitPrice" className="text-sm text-neutral-600 dark:text-neutral-400">Precio Base</label>
                                        <input type="number" name="unitPrice" id="unitPrice" value={formData.unitPrice} onChange={handlePricingChange} className={`${inputFormStyle} text-center font-bold bg-neutral-100 dark:bg-neutral-600 cursor-not-allowed`} min="0" step="0.01" readOnly tabIndex={-1}/>
                                    </div>
                                    <span className="font-semibold text-lg text-neutral-600 dark:text-neutral-400 pb-1">+</span>
                                    <div className="flex flex-col items-center flex-1 min-w-[80px]">
                                        <label htmlFor="calculatedTax" className="text-sm text-neutral-600 dark:text-neutral-400">Tax</label>
                                        <input type="text" id="calculatedTax" value={calculatedTax.toFixed(2)} className={`${inputFormStyle} text-center bg-neutral-100 dark:bg-neutral-600 cursor-not-allowed`} readOnly/>
                                    </div>
                                    <span className="font-semibold text-lg text-neutral-600 dark:text-neutral-400 pb-1">=</span>
                                    <div className="flex flex-col items-center flex-1 min-w-[90px]">
                                        <label htmlFor="customerPrice" className="text-sm text-green-700 dark:text-green-300">Cliente Paga</label>
                                        <input type="text" id="customerPrice" value={`$${customerPrice.toFixed(2)}`} className={`${inputFormStyle} text-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 font-bold cursor-not-allowed`} readOnly/>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="productIvaRate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tasa IVA (ej: 0.16)</label>
                                <input type="number" name="ivaRate" id="productIvaRate" value={formData.ivaRate} onChange={handleChange} className={inputFormStyle} step="0.01" min="0" max="1" />
                            </div>
                            <div className="pt-2">
                                <label className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    <input type="checkbox" name="isEmergencyTaxExempt" checked={!!formData.isEmergencyTaxExempt} onChange={handleChange} className="form-checkbox rounded mr-1.5 text-amber-500 focus:ring-amber-500"/>
                                    Aplicar Exención de Impuestos en Modo Emergencia
                                </label>
                            </div>
                        </div>

                        {/* Identificación Tab */}
                        <div className={activeTab === 'Identificación' ? 'space-y-3' : 'hidden'}>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="supplierProductCode" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Cód. Fact. Suplidor</label>
                                    <input type="text" name="supplierProductCode" id="supplierProductCode" value={formData.supplierProductCode} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                 <div>
                                   <label htmlFor="chainCode" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Código Cadena</label>
                                   <input type="text" name="chainCode" id="chainCode" value={formData.chainCode} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Otros SKUs/Códigos Alternos</label>
                                <div className="flex items-center gap-2 mb-1">
                                    <input type="text" value={newSkuInput} onChange={(e) => setNewSkuInput(e.target.value)} placeholder="Añadir SKU" className={inputFormStyle + " flex-grow !text-sm"}/>
                                    <button type="button" onClick={handleAddSku} className={BUTTON_SECONDARY_SM_CLASSES + " !text-sm"}>Añadir</button>
                                </div>
                                {formData.skus.slice(1).length > 0 && (
                                    <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-sm">
                                        {formData.skus.slice(1).map(sku => (
                                            <li key={sku} className="text-neutral-700 dark:text-neutral-200 flex justify-between items-center">
                                                {sku}
                                                <button type="button" onClick={() => handleRemoveSku(sku)} className="text-red-500 hover:text-red-700 text-xs p-0.5" aria-label={`Quitar SKU ${sku}`}><TrashIconMini/></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Clasificación Tab */}
                         <div className={activeTab === 'Clasificación' ? 'space-y-3' : 'hidden'}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="productCategory" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Categoría</label>
                                     <select name="category" id="productCategory" value={formData.category} onChange={handleChange} className={inputFormStyle}>
                                        <option value="">Sin categoría</option>
                                        {modalCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="departmentId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Departamento</label>
                                    <select name="departmentId" id="departmentId" value={formData.departmentId || ''} onChange={handleChange} className={inputFormStyle}>
                                        <option value="">Sin Departamento</option>
                                        {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 <div>
                                    <label htmlFor="family" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Familia</label>
                                    <input type="text" name="family" id="family" value={formData.family} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                 <div>
                                    <label htmlFor="manufacturer" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Manufacturero</label>
                                    <input type="text" name="manufacturer" id="manufacturer" value={formData.manufacturer} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="supplierId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Suplidor Principal</label>
                                    <div className="flex items-center gap-2">
                                        <select name="supplierId" id="supplierId" value={formData.supplierId} onChange={handleChange} className={inputFormStyle + " flex-grow"}>
                                            <option value="">Seleccionar Suplidor</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => alert('Búsqueda de suplidores no implementada.')} className={BUTTON_SECONDARY_SM_CLASSES}>Buscar</button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="physicalLocation" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Localización Física</label>
                                    <input type="text" name="physicalLocation" id="physicalLocation" value={formData.physicalLocation} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="creationDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha Creación</label>
                                <input type="date" name="creationDate" id="creationDate" value={formData.creationDate} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>

                        {/* Niveles de Precio Tab */}
                        <div className={activeTab === 'Niveles de Precio' ? 'space-y-4' : 'hidden'}>
                            <label className="flex items-center text-sm font-medium">
                                <input type="checkbox" name="hasPriceLevels" checked={!!formData.hasPriceLevels} onChange={handleChange} className="form-checkbox rounded mr-2"/> Activar múltiples niveles de precios para este producto
                            </label>
                            {formData.hasPriceLevels && (
                                <div className="pl-6 space-y-4">
                                    <fieldset className="border p-3 rounded dark:border-neutral-600">
                                        <legend className="text-sm font-medium px-1">{editingPriceLevelId ? 'Editar Nivel de Precio' : 'Añadir Nuevo Nivel de Precio'}</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                                            <div>
                                                <label className="block text-sm">Nivel</label>
                                                <select name="levelName" value={currentPriceLevel.levelName} onChange={handlePriceLevelChange} className={inputFormStyle + " !text-sm"}>
                                                    {CLIENT_PRICE_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div><label className="block text-sm">Precio</label><input type="number" name="price" value={currentPriceLevel.price || ''} onChange={handlePriceLevelChange} className={inputFormStyle + " !text-sm"} min="0" step="0.01"/></div>
                                        </div>
                                        <div className="mt-2 flex justify-end gap-2">
                                            {editingPriceLevelId && <button type="button" onClick={() => { setEditingPriceLevelId(null); setCurrentPriceLevel({levelName: CLIENT_PRICE_LEVEL_OPTIONS[0], price: 0})}} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar Edición</button>}
                                            <button type="button" onClick={handleAddOrUpdatePriceLevel} className={BUTTON_PRIMARY_SM_CLASSES}>{editingPriceLevelId ? 'Actualizar Nivel' : 'Añadir Nivel'}</button>
                                        </div>
                                    </fieldset>
                                    {formData.priceLevels && formData.priceLevels.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Niveles Existentes</h4>
                                            <ul className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                                {formData.priceLevels.map(pl => (
                                                    <li key={pl.id} className="flex justify-between items-center p-1.5 bg-neutral-50 dark:bg-neutral-700/50 rounded text-sm">
                                                        <span><strong>{pl.levelName}</strong> - ${pl.price.toFixed(2)}</span>
                                                        <div className="flex gap-1">
                                                            <button type="button" onClick={() => handleEditPriceLevel(pl)} className="p-0.5 text-blue-600"><EditIcon className="w-3.5 h-3.5"/></button>
                                                            <button type="button" onClick={() => handleRemovePriceLevel(pl.id)} className="p-0.5 text-red-600"><TrashIconMini/></button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Variaciones Tab */}
                        <div className={activeTab === 'Variaciones' ? 'space-y-4' : 'hidden'}>
                            <label className="flex items-center text-sm font-medium">
                                <input type="checkbox" name="hasVariations" checked={!!formData.hasVariations} onChange={handleChange} className="form-checkbox rounded mr-2"/> Este producto tiene múltiples variaciones de venta (ej: por metro, por caja)
                            </label>
                            {formData.hasVariations && (
                                <div className="pl-6 space-y-4">
                                    <fieldset className="border p-3 rounded dark:border-neutral-600">
                                        <legend className="text-sm font-medium px-1">{editingVariationId ? 'Editar Variación' : 'Añadir Nueva Variación'}</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                            <div><label className="block text-sm">Nombre (ej: Metro)</label><input type="text" name="name" value={currentVariation.name || ''} onChange={handleVariationChange} className={inputFormStyle + " !text-sm"}/></div>
                                            <div><label className="block text-sm">SKU (Opcional)</label><input type="text" name="sku" value={currentVariation.sku || ''} onChange={handleVariationChange} className={inputFormStyle + " !text-sm"}/></div>
                                            <div><label className="block text-sm">Precio Venta</label><input type="number" name="unitPrice" value={currentVariation.unitPrice || ''} onChange={handleVariationChange} className={inputFormStyle + " !text-sm"} min="0" step="0.01"/></div>
                                        </div>
                                        <div className="mt-2 flex justify-end gap-2">
                                            {editingVariationId && <button type="button" onClick={() => { setEditingVariationId(null); setCurrentVariation({name: '', sku: '', unitPrice: 0})}} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar Edición</button>}
                                            <button type="button" onClick={handleAddOrUpdateVariation} className={BUTTON_PRIMARY_SM_CLASSES}>{editingVariationId ? 'Actualizar Variación' : 'Añadir Variación'}</button>
                                        </div>
                                    </fieldset>

                                    {formData.variations && formData.variations.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Variaciones Existentes</h4>
                                            <ul className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                                {formData.variations.map(v => (
                                                    <li key={v.id} className="flex justify-between items-center p-1.5 bg-neutral-50 dark:bg-neutral-700/50 rounded text-sm">
                                                        <span><strong>{v.name}</strong> - ${v.unitPrice.toFixed(2)} (SKU: {v.sku || 'N/A'})</span>
                                                        <div className="flex gap-1">
                                                            <button type="button" onClick={() => handleEditVariation(v)} className="p-0.5 text-blue-600"><EditIcon className="w-3.5 h-3.5"/></button>
                                                            <button type="button" onClick={() => handleRemoveVariation(v.id)} className="p-0.5 text-red-600"><TrashIconMini/></button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        {/* Configuración POS Tab */}
                         <div className={activeTab === 'Configuración POS' ? 'space-y-4 pt-2' : 'hidden'}>
                            <label className="flex items-center text-sm"><input type="checkbox" name="displayOnScreen" checked={!!formData.displayOnScreen} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Ilustrar en Pantalla (Botón en POS)</label>
                            <label className="flex items-center text-sm"><input type="checkbox" name="requiresSerialNumber" checked={!!formData.requiresSerialNumber} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Requiere Número de Serie en Venta</label>
                            <label className="flex items-center text-sm"><input type="checkbox" name="useKitchenPrinter" checked={!!formData.useKitchenPrinter} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Usar Impresora de Cocina</label>
                            <label className="flex items-center text-sm"><input type="checkbox" name="useBarcodePrinter" checked={!!formData.useBarcodePrinter} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Usar Impresora de Código de Barras</label>
                        </div>
                    </div>

                    <div className="flex justify-between items-center w-full pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                         <div>{/* Placeholder for left side buttons like 'Buscar' or 'Tutorial' if needed */}</div>
                        <div className="flex items-center justify-end space-x-2">
                            {productToEdit &&
                                <>
                                    <button type="button" onClick={handleDiscontinue} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2 px-3.5 rounded-md shadow-sm">Descontinuar</button>
                                    <button type="button" onClick={handleRequestDelete} className="bg-yellow-500 hover:bg-yellow-600 text-neutral-800 font-semibold text-sm py-2 px-3.5 rounded-md shadow-sm">Eliminar</button>
                                </>
                            }
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm py-2 px-3.5 rounded-md shadow-sm">Aceptar</button>
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        </div>
                    </div>
                </form>
            </Modal>
            
            <InventoryHistoryModal 
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                productId={productToEdit?.id || null}
            />
            
            <BranchStockAdjustmentModal
                isOpen={showBranchStockModal}
                onClose={() => setShowBranchStockModal(false)}
                product={productToEdit}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={`¿Está seguro de que desea eliminar el producto "${productToEdit?.name}"? Esta acción no se puede deshacer.`}
                confirmButtonText="Sí, Eliminar"
            />
        </>
    );
};