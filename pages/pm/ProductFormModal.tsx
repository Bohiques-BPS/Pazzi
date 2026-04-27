
import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductFormData, CustomSpecification, ProductPriceLevel, ProductVariation } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { PlusIcon, TrashIconMini, CameraIcon, ExclamationTriangleIcon } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { CategoryFormModal } from './CategoryFormModal';
import { DepartmentFormModal } from './DepartmentFormModal';
import { BranchFormModal } from './BranchFormModal';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit: Product | null;
    storeOwnerIdForNewProduct: string;
}

// Mapeo de campos a sus respectivas pestañas para navegación automática en caso de error
const fieldToTabMap: Record<string, string> = {
    name: 'Principal',
    description: 'Principal',
    imageUrl: 'Principal',
    unitPrice: 'Precios',
    costPrice: 'Precios',
    profit: 'Precios',
    ivuRate: 'Precios',
    availableStock: 'Precios',
    initialStock: 'Precios',
    initialBranchId: 'Precios',
    isEmergencyTaxExempt: 'Precios',
    skus: 'Identificación',
    barcode13Digits: 'Identificación',
    barcode2: 'Identificación',
    category: 'Clasificación',
    categoryId: 'Clasificación',
    departmentId: 'Clasificación',
    family: 'Clasificación',
    manufacturer: 'Clasificación',
    supplierId: 'Clasificación',
    physicalLocation: 'Clasificación',
    creationDate: 'Clasificación',
    material: 'Especificaciones',
    quality: 'Especificaciones',
    length: 'Especificaciones',
    width: 'Especificaciones',
    height: 'Especificaciones',
    weight: 'Especificaciones',
    compatibility: 'Especificaciones',
    customSpecifications: 'Especificaciones',
    hasPriceLevels: 'Niveles de Precio',
    priceLevels: 'Niveles de Precio',
    hasVariations: 'Variaciones',
    variations: 'Variaciones',
    displayOnScreen: 'Configuración POS',
    requiresSerialNumber: 'Configuración POS',
    useKitchenPrinter: 'Configuración POS',
    useBarcodePrinter: 'Configuración POS',
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, storeOwnerIdForNewProduct }) => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const { addProduct, updateProduct, categories, departments, suppliers, setProducts, branches } = useData();
    
    const initialFormData: ProductFormData = {
        name: '',
        unitPrice: 0,
        description: '',
        imageUrl: '',
        skus: [],
        category: '',
        ivuRate: settings.defaultTaxRate || 0.115,
        storeOwnerId: storeOwnerIdForNewProduct,
        isEmergencyTaxExempt: false,
        costPrice: 0,
        profit: 0,
        supplierId: '',
        initialBranchId: '',
        departmentId: '',
        manufacturer: '',
        barcode13Digits: '',
        barcode2: '',
        availableStock: 0,
        material: '',
        quality: '',
        width: 0,
        length: 0,
        height: 0,
        weight: 0,
        customSpecifications: [],
        family: '',
        physicalLocation: '',
        hasPriceLevels: false,
        priceLevels: [],
        hasVariations: false,
        variations: [],
        displayOnScreen: true,
        requiresSerialNumber: false,
        useKitchenPrinter: false,
        useBarcodePrinter: false,
        creationDate: new Date().toISOString().split('T')[0]
    };

    const [formData, setFormData] = useState<ProductFormData>(initialFormData);
    const [activeTab, setActiveTab] = useState('Principal');
    const [skuInput, setSkuInput] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);
    
    const [newSpec, setNewSpec] = useState<CustomSpecification>({ name: '', value: '' });
    const [newPriceLevel, setNewPriceLevel] = useState<Partial<ProductPriceLevel>>({ levelName: '', price: 0 });
    const [newVariation, setNewVariation] = useState<Partial<ProductVariation>>({ name: '', sku: '', unitPrice: 0 });

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    ...initialFormData, // Ensure all fields exist
                    ...productToEdit,
                    category: productToEdit.categoryId || '',
                    // Explicitly handle arrays and objects to avoid undefined references if checking properties
                    skus: Array.isArray(productToEdit.skus) 
                        ? productToEdit.skus.map((s: any) => typeof s === 'string' ? s : s.sku) 
                        : [],
                    // Mapeamos customSpecs del backend a customSpecifications del formulario
                    customSpecifications: (productToEdit as any).customSpecs || productToEdit.customSpecifications || [],
                    priceLevels: productToEdit.priceLevels || [],
                    variations: productToEdit.variations || [],
                    creationDate: productToEdit.creationDate ? productToEdit.creationDate.split('T')[0] : new Date().toISOString().split('T')[0],
                });
            } else {
                setFormData({ ...initialFormData, storeOwnerId: storeOwnerIdForNewProduct });
            }
            setActiveTab('Principal');
            setSkuInput('');
            setNewSpec({ name: '', value: '' });
            setNewPriceLevel({ levelName: '', price: 0 });
            setNewVariation({ name: '', sku: '', unitPrice: 0 });
            setFieldErrors({});
            setGeneralError(null);
        }
    }, [isOpen, productToEdit, storeOwnerIdForNewProduct]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (type === 'number') {
             if (value === '') {
                 setFormData(prev => ({ ...prev, [name]: undefined }));
             } else {
                 setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
             }
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddSku = () => {
        if (skuInput.trim() && !formData.skus?.includes(skuInput.trim())) {
            setFormData(prev => ({ ...prev, skus: [...(prev.skus || []), skuInput.trim()] }));
            setSkuInput('');
        }
    };

    const handleRemoveSku = (sku: string) => {
        setFormData(prev => ({ ...prev, skus: prev.skus?.filter(s => s !== sku) }));
    };

    // Custom Specs Logic
    const handleAddCustomSpec = () => {
        if (newSpec.name.trim() && newSpec.value.trim()) {
            setFormData(prev => ({ 
                ...prev, 
                customSpecifications: [...(prev.customSpecifications || []), newSpec] 
            }));
            setNewSpec({ name: '', value: '' });
        }
    };

    const handleRemoveCustomSpec = (index: number) => {
        setFormData(prev => ({ 
            ...prev, 
            customSpecifications: prev.customSpecifications?.filter((_, i) => i !== index) 
        }));
    };

    // Price Levels Logic
    const handleAddPriceLevel = () => {
        if (newPriceLevel.levelName && newPriceLevel.price !== undefined) {
            const newItem: ProductPriceLevel = {
                id: `pl-${Date.now()}`,
                levelName: newPriceLevel.levelName,
                price: newPriceLevel.price
            };
            setFormData(prev => ({ ...prev, priceLevels: [...(prev.priceLevels || []), newItem] }));
            setNewPriceLevel({ levelName: '', price: 0 });
        }
    };

    const handleRemovePriceLevel = (id: string) => {
        setFormData(prev => ({ ...prev, priceLevels: prev.priceLevels?.filter(pl => pl.id !== id) }));
    };

    // Variations Logic
    const handleAddVariation = () => {
        if (newVariation.name && newVariation.unitPrice !== undefined) {
            const newItem: ProductVariation = {
                id: `var-${Date.now()}`,
                name: newVariation.name,
                sku: newVariation.sku,
                unitPrice: newVariation.unitPrice
            };
            setFormData(prev => ({ ...prev, variations: [...(prev.variations || []), newItem] }));
            setNewVariation({ name: '', sku: '', unitPrice: 0 });
        }
    };

    const handleRemoveVariation = (id: string) => {
        setFormData(prev => ({ ...prev, variations: prev.variations?.filter(v => v.id !== id) }));
    };

    const validateForm = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = "El nombre es requerido";
        if (!formData.category) errors.category = "Debe seleccionar una categoría";
        if ((formData.unitPrice || 0) < 0) errors.unitPrice = "El precio no puede ser negativo";
        
        const activeBranches = branches.filter(b => b.isActive);

        if (formData.unitPrice && formData.costPrice && formData.unitPrice < formData.costPrice) {
            errors.unitPrice = "El precio de venta es menor al costo";
        }

        if (!productToEdit && (formData.availableStock || 0) > 0 && activeBranches.length === 0) {
            errors.availableStock = "No puede asignar inventario inicial porque no tiene sucursales activas. Cree una sucursal primero o deje el stock en 0.";
        }

        if (!formData.creationDate) {
            errors.creationDate = "La fecha de creación es obligatoria";
        } else {
            // Añadimos T00:00:00 para evitar problemas de zona horaria al validar
            const date = new Date(formData.creationDate + 'T00:00:00');
            const year = date.getFullYear();
            if (isNaN(date.getTime())) {
                errors.creationDate = "El formato de la fecha es inválido";
            } else if (year < 1900 || year > 2100) {
                errors.creationDate = "El año debe estar entre 1900 y 2100";
            }
        }

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError(null);

        const localErrors = validateForm();
        setFieldErrors(localErrors);

        if (Object.keys(localErrors).length > 0) {
            const firstErrorField = Object.keys(localErrors)[0];
            const targetTab = fieldToTabMap[firstErrorField];
            if (targetTab) setActiveTab(targetTab);
            
            setGeneralError(`Existen errores en el formulario: ${Object.values(localErrors).join('. ')}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('pazzi_token');

            let finalImageUrl = formData.imageUrl;

            // Si se seleccionó un archivo nuevo, lo subimos al servidor
            if (imageFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile); 

                const uploadResponse = await fetch('http://localhost:3001/api/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadFormData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    finalImageUrl = uploadResult.url; 
                } else {
                    throw new Error("Error al subir la imagen al servidor");
                }
            }

            const url = productToEdit
                ? `http://localhost:3001/api/products/${productToEdit.id}`
                : 'http://localhost:3001/api/products';
            
            const method = productToEdit ? 'PUT' : 'POST';

            const activeBranches = branches.filter(b => b.isActive);

            // Mapeamos el objeto para que coincida con el backend controller
            const productPayload = {
                ...formData,
                imageUrl: finalImageUrl,
                categoryId: formData.category || null, // Usar null para que viaje en el JSON
                unitPrice: Number(formData.unitPrice),
                ivaRate: Number(formData.ivuRate), // Alineado con Prisma
                costPrice: Number(formData.costPrice || 0),
                profit: Number(formData.profit || 0),
                initialStock: Number(formData.availableStock || 0),
                initialBranchId: formData.initialBranchId || activeBranches[0]?.id || null, // Usar la seleccionada o la primera por defecto
                supplierId: formData.supplierId || null,
                departmentId: formData.departmentId || null,
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productPayload)
            });

            const result = await response.json();

            if (response.ok) {
                // Normalizamos el producto guardado antes de actualizar el estado global
                const normalizedProduct = {
                    ...result,
                    // Extraemos solo el nombre si category es un objeto de Prisma
                    category: typeof result.category === 'object' ? result.category.name : result.category,
                    // Convertimos el arreglo de objetos [{sku: '...'}] en arreglo de strings ['...']
                    skus: Array.isArray(result.skus) 
                        ? result.skus.map((s: any) => typeof s === 'string' ? s : s.sku) 
                        : [],
                    // Normalizamos las especificaciones devueltas por el servidor (Prisma usa customSpecs)
                    customSpecifications: result.customSpecs || result.customSpecifications || []
                };

                if (productToEdit) {
                    setProducts(prev => prev.map(p => p.id === productToEdit.id ? normalizedProduct : p));
                } else {
                    setProducts(prev => [normalizedProduct, ...prev]);
                }
                onClose();
            } else if (response.status === 400 && Array.isArray(result.error)) {
                // Manejo de errores de validación de Zod del backend
                const backendErrors: Record<string, string> = {};
                result.error.forEach((err: any) => {
                    const path = err.path[0];
                    backendErrors[path] = err.message;
                });
                setFieldErrors(backendErrors);
                    
                    const firstErrorField = Object.keys(backendErrors)[0];
                    const targetTab = fieldToTabMap[firstErrorField];
                    if (targetTab) setActiveTab(targetTab);

                    setGeneralError(`Error en el servidor: ${Object.values(backendErrors).join('. ')}`);
            } else {
                setGeneralError(result.error || result.msg || "Error inesperado al guardar el producto.");
            }
        } catch (error) {
            console.error("Error submitting product:", error);
            setGeneralError("Error de conexión con el servidor. Verifique su red.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'Principal', label: t('product.tab.main') },
        { id: 'Precios', label: t('product.tab.inventory') },
        { id: 'Identificación', label: t('product.tab.identification') },
        { id: 'Clasificación', label: t('product.tab.classification') },
        { id: 'Especificaciones', label: t('product.tab.specs') },
        { id: 'Niveles de Precio', label: t('product.tab.prices') },
        { id: 'Variaciones', label: t('product.tab.variations') },
        { id: 'Configuración POS', label: t('product.tab.pos') },
    ];

    const tabsWithErrors = useMemo(() => {
        const tabSet = new Set<string>();
        Object.keys(fieldErrors).forEach(field => {
            const tabName = fieldToTabMap[field];
            if (tabName) tabSet.add(tabName);
        });
        return tabSet;
    }, [fieldErrors]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? t('product.form.title.edit') : t('product.form.title.create')} size="7xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-[80vh]">
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4 overflow-x-auto flex-shrink-0">
                    {tabs.map(tab => {
                        const hasError = tabsWithErrors.has(tab.id);
                        return (
                            <button 
                                key={tab.id} 
                                type="button" 
                                onClick={() => setActiveTab(tab.id)} 
                                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-200 ${
                                    activeTab === tab.id 
                                        ? 'border-primary text-primary' 
                                        : hasError 
                                            ? 'border-red-500 text-red-600' 
                                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                }`}
                            >
                                {tab.label}
                                {hasError && <span className="ml-1 text-red-500 font-bold">*</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {generalError && (
                        <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                            <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                            {generalError}
                        </div>
                    )}

                    {activeTab === 'Principal' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.name')}</label>
                                <input 
                                    type="text" name="name" value={formData.name} onChange={handleChange} 
                                    className={`${inputFormStyle} ${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`} 
                                    required 
                                />
                                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.description')}</label>
                                <RichTextEditor value={formData.description || ''} onChange={(val) => setFormData(prev => ({...prev, description: val}))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">{t('product.tab.photo') || 'Foto del Producto'}</label>
                                <div className="mt-1 flex items-center space-x-4">
                                    {formData.imageUrl ? (
                                        <div className="relative w-32 h-32 border rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, imageUrl: '' }));
                                                    setImageFile(null);
                                                }}
                                                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md"
                                            >
                                                <TrashIconMini className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-md flex items-center justify-center bg-neutral-50 dark:bg-neutral-800">
                                            <CameraIcon className="w-8 h-8 text-neutral-400" />
                                        </div>
                                    )}
                                    <div className="flex flex-col space-y-2">
                                        <label className={BUTTON_SECONDARY_SM_CLASSES + " cursor-pointer"}>
                                            {t('product.image_file') || 'Elegir Imagen'}
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                        <p className="text-xs text-neutral-500">Opcional. PNG, JPG hasta 5MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Precios' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.price')}</label>
                                    <input 
                                        type="number" name="unitPrice" value={formData.unitPrice ?? ''} onChange={handleChange} 
                                        className={`${inputFormStyle} ${fieldErrors.unitPrice ? 'border-red-500 focus:ring-red-500' : ''}`} 
                                        step="0.01" min="0" 
                                    />
                                    {fieldErrors.unitPrice && <p className="mt-1 text-xs text-red-500">{fieldErrors.unitPrice}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.cost')}</label>
                                    <input type="number" name="costPrice" value={formData.costPrice ?? ''} onChange={handleChange} className={inputFormStyle} step="0.01" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.profit')}</label>
                                    <input type="number" name="profit" value={formData.profit ?? ''} onChange={handleChange} className={inputFormStyle} step="0.01" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.tax_rate')}</label>
                                    <input type="number" name="ivuRate" value={formData.ivuRate ?? ''} onChange={handleChange} className={inputFormStyle} step="0.001" min="0" />
                                </div>
                                {!productToEdit && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium">{t('product.field.inventory')} (Inicial)</label>
                                            <input type="number" name="availableStock" value={formData.availableStock ?? ''} onChange={handleChange} className={inputFormStyle} min="0" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">Sucursal para Stock Inicial</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    name="initialBranchId" 
                                                    value={formData.initialBranchId || ''} 
                                                    onChange={handleChange} 
                                                    className={inputFormStyle + " flex-grow"}
                                                >
                                                    <option value="">Sucursal Activa por Defecto</option>
                                                    {branches.filter(b => b.isActive).map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowAddBranchModal(true)}
                                                    className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                                    title="Nueva Sucursal"
                                                >
                                                    <PlusIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="isEmergencyTaxExempt" checked={formData.isEmergencyTaxExempt} onChange={handleChange} className="h-4 w-4" />
                                <label className="text-sm">{t('product.emergency_exempt')}</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Identificación' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">SKUs / Códigos Alternos</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" value={skuInput} onChange={(e) => setSkuInput(e.target.value)} className={inputFormStyle} placeholder="Nuevo SKU" />
                                    <button type="button" onClick={handleAddSku} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.add')}</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.skus?.map(sku => (
                                        <span key={sku} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded text-sm flex items-center">
                                            {sku}
                                            <button type="button" onClick={() => handleRemoveSku(sku)} className="ml-2 text-red-500"><TrashIconMini className="w-4 h-4" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.barcode')} (13 Dígitos)</label>
                                    <input type="text" name="barcode13Digits" value={formData.barcode13Digits} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.barcode')} (Secundario)</label>
                                    <input type="text" name="barcode2" value={formData.barcode2} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Clasificación' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.category')}</label>
                                    <div className="flex gap-2">
                                        <select 
                                            name="category" value={formData.category || ''} onChange={(e) => setFormData(p => ({...p, category: e.target.value}))} 
                                            className={`${inputFormStyle} ${fieldErrors.categoryId || fieldErrors.category ? 'border-red-500' : ''} flex-grow`}
                                        >
                                            <option value="">Seleccionar Categoría</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAddCategoryModal(true)}
                                            className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                            title="Nueva Categoría"
                                        >
                                            <PlusIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                                        </button>
                                    </div>
                                    {(fieldErrors.categoryId || fieldErrors.category) && <p className="mt-1 text-xs text-red-500">{fieldErrors.categoryId || fieldErrors.category}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.department')}</label>
                                    <div className="flex gap-2">
                                        <select name="departmentId" value={formData.departmentId || ''} onChange={handleChange} className={inputFormStyle + " flex-grow"}>
                                            <option value="">Seleccionar Departamento</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowAddDepartmentModal(true)}
                                            className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                            title="Nuevo Departamento"
                                        >
                                            <PlusIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.family')}</label>
                                    <input type="text" name="family" value={formData.family} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.manufacturer')}</label>
                                    <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.supplier')}</label>
                                    <div className="flex gap-2">
                                        <select name="supplierId" value={formData.supplierId || ''} onChange={handleChange} className={inputFormStyle}>
                                            <option value="">Seleccionar Proveedor</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <button type="button" className={BUTTON_SECONDARY_SM_CLASSES}>Buscar</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.location')}</label>
                                    <input type="text" name="physicalLocation" value={formData.physicalLocation} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.creation_date')}</label>
                                <input 
                                    type="date" name="creationDate" value={formData.creationDate} onChange={handleChange} 
                                    className={`${inputFormStyle} ${fieldErrors.creationDate ? 'border-red-500 focus:ring-red-500' : ''}`} 
                                />
                                {fieldErrors.creationDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.creationDate}</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Especificaciones' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.material')}</label>
                                    <input type="text" name="material" value={formData.material} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.quality')}</label>
                                    <input type="text" name="quality" value={formData.quality} onChange={handleChange} className={inputFormStyle} placeholder="Ej: Grado Comercial, Premium" />
                                </div>
                            </div>
                            <fieldset className="border p-3 rounded dark:border-neutral-600">
                                <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Dimensiones y Peso</legend>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-medium">Largo (cm)</label>
                                        <input type="number" name="length" value={formData.length ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">Ancho (cm)</label>
                                        <input type="number" name="width" value={formData.width ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">Alto (cm)</label>
                                        <input type="number" name="height" value={formData.height ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">Peso (kg)</label>
                                        <input type="number" name="weight" value={formData.weight ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                </div>
                            </fieldset>
                            
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.compatibility')}</label>
                                <RichTextEditor value={formData.compatibility || ''} onChange={(val) => setFormData(prev => ({...prev, compatibility: val}))} />
                            </div>

                            <div className="border-t pt-4 dark:border-neutral-700">
                                <label className="block text-sm font-medium mb-2">Especificaciones Personalizadas</label>
                                <div className="flex gap-2 mb-3 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Nombre (ej. Color)</label>
                                        <input 
                                            type="text" 
                                            value={newSpec.name} 
                                            onChange={(e) => setNewSpec(prev => ({ ...prev, name: e.target.value }))}
                                            className={inputFormStyle}
                                            placeholder="Nombre"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Valor (ej. Rojo)</label>
                                        <input 
                                            type="text" 
                                            value={newSpec.value} 
                                            onChange={(e) => setNewSpec(prev => ({ ...prev, value: e.target.value }))}
                                            className={inputFormStyle}
                                            placeholder="Valor"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleAddCustomSpec} 
                                        className="h-11 px-4 bg-primary hover:bg-secondary text-white rounded-md shadow-sm flex items-center justify-center transition-colors duration-150 flex-shrink-0 font-medium text-sm"
                                        title={t('common.add')}
                                    >
                                        <PlusIcon className="w-5 h-5 mr-1" />
                                        {t('common.add')}
                                    </button>
                                </div>
                                {formData.customSpecifications && formData.customSpecifications.length > 0 && (
                                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                                        {formData.customSpecifications.map((spec, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                                <span className="text-sm"><strong>{spec.name}:</strong> {spec.value}</span>
                                                <button type="button" onClick={() => handleRemoveCustomSpec(idx)} className="text-red-500 hover:text-red-700">
                                                    <TrashIconMini className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Niveles de Precio' && (
                        <div className="space-y-4">
                            <div className="flex items-center mb-4">
                                <input type="checkbox" name="hasPriceLevels" checked={formData.hasPriceLevels} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary rounded mr-2" />
                                <label className="text-sm font-medium">{t('product.field.enable_price_levels')}</label>
                            </div>
                            {formData.hasPriceLevels && (
                                <>
                                    <fieldset className="border p-3 rounded dark:border-neutral-600">
                                        <legend className="text-sm font-medium px-1">Añadir Nuevo Nivel de Precio</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 items-end">
                                            <div>
                                                <label className="block text-xs font-medium">Nivel</label>
                                                <select 
                                                    value={newPriceLevel.levelName} 
                                                    onChange={e => setNewPriceLevel(prev => ({...prev, levelName: e.target.value}))} 
                                                    className={inputFormStyle}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="Precio Venta">Precio Venta</option>
                                                    <option value="Precio Mayorista">Precio Mayorista</option>
                                                    <option value="Precio Distribuidor">Precio Distribuidor</option>
                                                    <option value="Precio Empleado">Precio Empleado</option>
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-grow">
                                                    <label className="block text-xs font-medium">Precio Base</label>
                                                    <input type="number" value={newPriceLevel.price} onChange={e => setNewPriceLevel(prev => ({...prev, price: parseFloat(e.target.value)}))} className={inputFormStyle} step="0.01" min="0" />
                                                </div>
                                                <button type="button" onClick={handleAddPriceLevel} className={`${BUTTON_PRIMARY_SM_CLASSES} h-12 mt-auto`}>{t('common.add')}</button>
                                            </div>
                                        </div>
                                    </fieldset>
                                    {formData.priceLevels && formData.priceLevels.length > 0 && (
                                        <div className="bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                                            <h4 className="text-sm font-medium mb-2">Niveles Existentes</h4>
                                            <ul className="space-y-2">
                                                {formData.priceLevels.map(pl => (
                                                    <li key={pl.id} className="flex justify-between items-center p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                                        <span>{pl.levelName}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-semibold">${pl.price.toFixed(2)}</span>
                                                            <button type="button" onClick={() => handleRemovePriceLevel(pl.id)} className="text-red-500 hover:text-red-700"><TrashIconMini/></button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'Variaciones' && (
                        <div className="space-y-4">
                            <div className="flex items-center mb-4">
                                <input type="checkbox" name="hasVariations" checked={formData.hasVariations} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary rounded mr-2" />
                                <label className="text-sm font-medium">{t('product.field.enable_variations')}</label>
                            </div>
                            {formData.hasVariations && (
                                <>
                                    <fieldset className="border p-3 rounded dark:border-neutral-600">
                                        <legend className="text-sm font-medium px-1">Añadir Nueva Variación</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
                                            <div>
                                                <label className="block text-xs font-medium">{t('product.field.variation_name')}</label>
                                                <input type="text" value={newVariation.name} onChange={e => setNewVariation(prev => ({...prev, name: e.target.value}))} className={inputFormStyle} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium">SKU (Opcional)</label>
                                                <input type="text" value={newVariation.sku} onChange={e => setNewVariation(prev => ({...prev, sku: e.target.value}))} className={inputFormStyle} />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-grow">
                                                    <label className="block text-xs font-medium">{t('product.field.variation_price')}</label>
                                                    <input type="number" value={newVariation.unitPrice} onChange={e => setNewVariation(prev => ({...prev, unitPrice: parseFloat(e.target.value)}))} className={inputFormStyle} step="0.01" min="0" />
                                                </div>
                                                <button type="button" onClick={handleAddVariation} className={`${BUTTON_PRIMARY_SM_CLASSES} h-12 mt-auto`}>{t('common.add')}</button>
                                            </div>
                                        </div>
                                    </fieldset>
                                    {formData.variations && formData.variations.length > 0 && (
                                        <div className="bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                                            <h4 className="text-sm font-medium mb-2">Variaciones Existentes</h4>
                                            <ul className="space-y-2">
                                                {formData.variations.map(v => (
                                                    <li key={v.id} className="flex justify-between items-center p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                                        <span>{v.name} {v.sku ? `(${v.sku})` : ''}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-semibold">${v.unitPrice.toFixed(2)}</span>
                                                            <button type="button" onClick={() => handleRemoveVariation(v.id)} className="text-red-500 hover:text-red-700"><TrashIconMini/></button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'Configuración POS' && (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="displayOnScreen" checked={formData.displayOnScreen} onChange={handleChange} className="h-4 w-4 text-primary rounded" />
                                    <span className="text-sm">{t('product.field.pos_display')}</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="requiresSerialNumber" checked={formData.requiresSerialNumber} onChange={handleChange} className="h-4 w-4 text-primary rounded" />
                                    <span className="text-sm">{t('product.field.pos_serial')}</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="useKitchenPrinter" checked={formData.useKitchenPrinter} onChange={handleChange} className="h-4 w-4 text-primary rounded" />
                                    <span className="text-sm">{t('product.field.pos_kitchen')}</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="useBarcodePrinter" checked={formData.useBarcodePrinter} onChange={handleChange} className="h-4 w-4 text-primary rounded" />
                                    <span className="text-sm">{t('product.field.pos_barcode')}</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : t('common.save')}
                    </button>
                </div>
            </form>
            <CategoryFormModal 
                isOpen={showAddCategoryModal} 
                onClose={() => setShowAddCategoryModal(false)} 
                category={null} 
            />
            <DepartmentFormModal 
                isOpen={showAddDepartmentModal} 
                onClose={() => setShowAddDepartmentModal(false)} 
                department={null} 
            />
            <BranchFormModal 
                isOpen={showAddBranchModal} 
                onClose={() => setShowAddBranchModal(false)} 
                branch={null} 
            />
        </Modal>
    );
};
