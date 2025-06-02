
import React, { useState, useEffect } from 'react';
import { Product, ProductFormData, Category, UserRole } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal'; 
import { TrashIconMini } from '../../components/icons'; 
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, ADMIN_USER_ID } from '../../constants'; 

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit: Product | null; 
    storeOwnerIdForNewProduct?: string; 
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, storeOwnerIdForNewProduct }) => {
    const { currentUser } = useAuth();
    const { addProduct, updateProduct, categories: allCategories, getCategoriesByStoreOwner, suppliers, branches } = useData();
    
    const [modalCategories, setModalCategories] = useState<Category[]>([]);

    const determineOwnerId = () => {
        if (productToEdit) return productToEdit.storeOwnerId;
        if (storeOwnerIdForNewProduct) return storeOwnerIdForNewProduct;
        return currentUser?.id || ADMIN_USER_ID; // Fallback to admin or current user
    };
    
    const ownerIdForForm = determineOwnerId();

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
            supplierProductCode: productToEdit?.supplierProductCode || '',
            department: productToEdit?.department || '',
            family: productToEdit?.family || '',
            physicalLocation: productToEdit?.physicalLocation || '',
            displayOnScreen: productToEdit?.displayOnScreen === undefined ? true : productToEdit.displayOnScreen,
            requiresSerialNumber: productToEdit?.requiresSerialNumber || false,
            creationDate: productToEdit?.creationDate || new Date().toISOString().split('T')[0],
            useKitchenPrinter: productToEdit?.useKitchenPrinter || false,
            useBarcodePrinter: productToEdit?.useBarcodePrinter || false,
            availableStock: productToEdit?.availableStock || 0,
        };
    };
    
    const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());
    const [newSkuInput, setNewSkuInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            const initialData = getInitialFormData();
             if (!initialData.category && modalCategories.length > 0) {
                initialData.category = modalCategories[0].name;
            }
            setFormData(initialData);
            setNewSkuInput('');
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
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
           const objectUrl = URL.createObjectURL(file);
           setFormData(prev => ({ ...prev, imageUrl: objectUrl }));
        } else {
            setFormData(prev => ({
                ...prev,
                imageUrl: productToEdit ? defaultEditProductImageUrl(productToEdit) : defaultNewProductImageUrl()
            }));
        }
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
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Modificar Inventario' : 'Crear Producto'} size="2xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                {/* Basic Info */}
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Básica</legend>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="productName" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Descripción (Nombre)</label>
                            <input type="text" name="name" id="productName" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label htmlFor="skus" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Referencia / SKU Principal</label>
                                <input type="text" value={formData.skus[0] || ''} onChange={(e) => setFormData(prev => ({...prev, skus: [e.target.value, ...prev.skus.slice(1)]})) } placeholder="SKU Principal" className={inputFormStyle}/>
                            </div>
                            <div>
                                <label htmlFor="barcode2" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Código Barras 2</label>
                                <input type="text" name="barcode2" id="barcode2" value={formData.barcode2} onChange={handleChange} className={inputFormStyle} />
                            </div>
                             <div>
                                <label htmlFor="barcode13Digits" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Código Barra 13 Dígitos</label>
                                <input type="text" name="barcode13Digits" id="barcode13Digits" value={formData.barcode13Digits} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                             <div>
                                <label htmlFor="productPrice" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Precio Base</label>
                                <input type="number" name="unitPrice" id="productPrice" value={formData.unitPrice} onChange={handleChange} className={inputFormStyle} required min="0" step="0.01" />
                            </div>
                            <div>
                                <label htmlFor="availableStock" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Inventario / Disponible</label>
                                <input type="number" name="availableStock" id="availableStock" value={formData.availableStock} onChange={handleChange} className={inputFormStyle} min="0" />
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Ajustar stock por sucursal en gestión de inventario detallada.</p>
                            </div>
                            <div className="flex items-center space-x-4 pt-4">
                                <label className="flex items-center text-xs">
                                    <input type="checkbox" name="isActive" checked={!!formData.isActive} onChange={handleChange} className="form-checkbox rounded mr-1"/> Activo
                                </label>
                                <label className="flex items-center text-xs">
                                    <input type="checkbox" name="isService" checked={!!formData.isService} onChange={handleChange} className="form-checkbox rounded mr-1"/> Servicio
                                </label>
                            </div>
                        </div>
                    </div>
                </fieldset>
                
                {/* Classification & Supplier Info */}
                 <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Clasificación y Proveedor</legend>
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="manufacturer" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Manufacturero</label>
                                <input type="text" name="manufacturer" id="manufacturer" value={formData.manufacturer} onChange={handleChange} className={inputFormStyle} />
                            </div>
                            <div>
                                <label htmlFor="chainCode" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Código Cadena</label>
                                <input type="text" name="chainCode" id="chainCode" value={formData.chainCode} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label htmlFor="supplierId" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Suplidor Principal</label>
                                <select name="supplierId" id="supplierId" value={formData.supplierId} onChange={handleChange} className={inputFormStyle}>
                                    <option value="">Seleccionar Suplidor</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="costPrice" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Costo Unidad Menor</label>
                                <input type="number" name="costPrice" id="costPrice" value={formData.costPrice} onChange={handleChange} className={inputFormStyle} min="0" step="0.01"/>
                            </div>
                             <div>
                                <label htmlFor="supplierProductCode" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Cód. Fact. Suplidor</label>
                                <input type="text" name="supplierProductCode" id="supplierProductCode" value={formData.supplierProductCode} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label htmlFor="department" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Departamento</label>
                                <input type="text" name="department" id="department" value={formData.department} onChange={handleChange} className={inputFormStyle} />
                            </div>
                            <div>
                                <label htmlFor="productCategory" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Categoría</label>
                                 <select name="category" id="productCategory" value={formData.category} onChange={handleChange} className={inputFormStyle}>
                                    <option value="">Sin categoría</option>
                                    {modalCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="family" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Familia</label>
                                <input type="text" name="family" id="family" value={formData.family} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Details & Settings */}
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Detalles Adicionales y Configuración</legend>
                     <div className="space-y-3">
                        <div>
                            <label htmlFor="productDescription" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Descripción Detallada</label>
                            <textarea name="description" id="productDescription" value={formData.description} onChange={handleChange} rows={2} className={inputFormStyle} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="physicalLocation" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Localización Física</label>
                                <input type="text" name="physicalLocation" id="physicalLocation" value={formData.physicalLocation} onChange={handleChange} className={inputFormStyle} />
                            </div>
                             <div>
                                <label htmlFor="productIvaRate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Tasa IVA (ej: 0.16)</label>
                                <input type="number" name="ivaRate" id="productIvaRate" value={formData.ivaRate} onChange={handleChange} className={inputFormStyle} step="0.01" min="0" max="1" />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="creationDate" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Fecha Creación</label>
                                <input type="date" name="creationDate" id="creationDate" value={formData.creationDate} onChange={handleChange} className={inputFormStyle} />
                            </div>
                             <div>
                                <label htmlFor="productImage" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Imagen</label>
                                <input type="file" id="productImage" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-xs text-neutral-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                {formData.imageUrl && <img key={formData.imageUrl} src={formData.imageUrl} alt="Vista previa" className="mt-1 w-16 h-16 object-cover rounded shadow"/>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                             <label className="flex items-center text-xs"><input type="checkbox" name="displayOnScreen" checked={!!formData.displayOnScreen} onChange={handleChange} className="form-checkbox rounded mr-1"/> Ilustrar en Pantalla</label>
                             <label className="flex items-center text-xs"><input type="checkbox" name="requiresSerialNumber" checked={!!formData.requiresSerialNumber} onChange={handleChange} className="form-checkbox rounded mr-1"/> Requiere Núm. Serie</label>
                             <label className="flex items-center text-xs"><input type="checkbox" name="useKitchenPrinter" checked={!!formData.useKitchenPrinter} onChange={handleChange} className="form-checkbox rounded mr-1"/> Impr. Cocina</label>
                             <label className="flex items-center text-xs"><input type="checkbox" name="useBarcodePrinter" checked={!!formData.useBarcodePrinter} onChange={handleChange} className="form-checkbox rounded mr-1"/> Impr. Barras</label>
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">Otros SKUs/Códigos Alternos</label>
                            <div className="flex items-center gap-2 mb-1">
                                <input type="text" value={newSkuInput} onChange={(e) => setNewSkuInput(e.target.value)} placeholder="Añadir SKU" className={inputFormStyle + " flex-grow !text-xs"}/>
                                <button type="button" onClick={handleAddSku} className={BUTTON_SECONDARY_SM_CLASSES + " !text-xs"}>Añadir</button>
                            </div>
                            {formData.skus.slice(1).length > 0 && ( // Show SKUs other than the primary one
                                <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-1.5 rounded text-xs">
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
                </fieldset>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Producto</button>
                </div>
            </form>
        </Modal>
    );
};
