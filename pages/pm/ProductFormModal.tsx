
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
import { BranchFormModal } from '../../components/forms/BranchFormModal';
import { ADVANCED_PRODUCT_FIELDS, ADVANCED_PRODUCT_GROUPS } from '../../config/advancedProductFields';
import { API_URL } from '../../services/api';
import { printBarcodeLabel } from '../../services/labelPrinter';
import { toast } from '../../hooks/useToast';
import { inventoryService } from '../../services/inventory';
import { ApiError } from '../../services/api';
import { z } from 'zod';
import { zodIssuesToFieldErrors } from '../../schemas/common.schema';

// Subset del productSchema centrado en los campos que el form maneja directamente.
// La validación de business (sucursales activas, fecha range, etc.) sigue en validateForm.
const productFormZodSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
    unitPrice: z.number({ message: 'Debe ser un número' }).nonnegative('No puede ser negativo'),
    costPrice: z.number().nonnegative('El costo no puede ser negativo').optional(),
    ivuRate: z.number().min(0, 'No puede ser negativo').max(1, 'Máximo 100%').optional(),
    barcode13Digits: z.string().max(13, 'Máximo 13 caracteres').optional().or(z.literal('')),
});

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit: Product | null;
    storeOwnerIdForNewProduct: string;
    /** Nombre inicial al crear (ej. desde una línea de factura "inventada"). */
    initialName?: string;
    /** Callback con el producto recién creado (para continuar flujos externos). */
    onCreated?: (product: Product) => void;
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

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, storeOwnerIdForNewProduct, initialName, onCreated }) => {
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
    // Stock por sucursal (solo al editar): cantidad ACTUAL local + delta a sumar por sucursal.
    const [localStock, setLocalStock] = useState<Record<string, number>>({});
    const [stockDeltas, setStockDeltas] = useState<Record<string, string>>({});
    const [applyingStock, setApplyingStock] = useState(false);
    useEffect(() => {
        if (isOpen && productToEdit) {
            const m: Record<string, number> = {};
            ((productToEdit as any).stockByBranch || []).forEach((s: any) => { m[s.branchId] = s.quantity; });
            setLocalStock(m); setStockDeltas({});
        }
    }, [isOpen, productToEdit]);
    const applyStock = async () => {
        if (!productToEdit) return;
        const changes = Object.entries(stockDeltas)
            .map(([branchId, v]) => ({ branchId, qty: Number(v) }))
            .filter(c => c.qty && !isNaN(c.qty));
        if (!changes.length) { toast.error('Ingresa una cantidad en al menos una sucursal.'); return; }
        setApplyingStock(true);
        try {
            for (const c of changes) {
                const res = await inventoryService.adjustStock(productToEdit.id, { branchId: c.branchId, quantity: c.qty, type: 'ADJUSTMENT_MANUAL', notes: 'Ajuste desde ficha de producto' });
                setLocalStock(s => ({ ...s, [c.branchId]: res.stockAfter }));
            }
            toast.success('Stock actualizado por sucursal.');
            setStockDeltas({});
        } catch (e) { toast.error(e instanceof ApiError ? e.message : 'No se pudo actualizar el stock.'); }
        finally { setApplyingStock(false); }
    };
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
    // % de ganancia sobre el costo para el nuevo nivel de precio (precio = costo * (1 + %/100)).
    const [newLevelMargin, setNewLevelMargin] = useState<string>('');
    const [newVariation, setNewVariation] = useState<Partial<ProductVariation>>({ name: '', sku: '', unitPrice: 0 });

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    ...initialFormData, // Ensure all fields exist
                    ...productToEdit,
                    category: productToEdit.categoryId || '',
                    // El backend usa `ivaRate`; el formulario usa `ivuRate`. Sin este mapeo, al reabrir
                    // el producto la tasa volvía al default (0.115) y "No cobra IVU" salía desmarcado.
                    ivuRate: (productToEdit as any).ivaRate != null ? Number((productToEdit as any).ivaRate) : ((productToEdit as any).ivuRate ?? initialFormData.ivuRate),
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
                setFormData({ ...initialFormData, storeOwnerId: storeOwnerIdForNewProduct, name: initialName || '' });
            }
            setActiveTab('Principal');
            setSkuInput('');
            setNewSpec({ name: '', value: '' });
            setNewPriceLevel({ levelName: '', price: 0 });
            setNewLevelMargin('');
            setNewVariation({ name: '', sku: '', unitPrice: 0 });
            setFieldErrors({});
            setGeneralError(null);
        }
    }, [isOpen, productToEdit, storeOwnerIdForNewProduct, initialName]);

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

    // Genera un código de barras EAN-13 válido (con dígito verificador correcto).
    // Prefijo "2" = rango de distribución restringida (códigos internos de la tienda).
    const handleGenerateBarcode = () => {
        let base = '2';
        for (let i = 0; i < 11; i++) base += Math.floor(Math.random() * 10);
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * Number(base[i]);
        const check = (10 - (sum % 10)) % 10;
        setFormData(prev => ({ ...prev, barcode13Digits: base + String(check) }));
    };

    // Imprime la etiqueta con el código actual del formulario (por QZ Tray o el navegador).
    const handlePrintBarcode = () => {
        printBarcodeLabel({
            name: formData.name,
            unitPrice: formData.unitPrice,
            barcode13Digits: formData.barcode13Digits,
            barcode2: formData.barcode2,
            skus: formData.skus,
        }).then(() => toast.success(t('pmx.product.label_sent')))
          .catch(err => toast.error(`${t('pmx.product.label')}: ${err?.message || t('pmx.product.label_print_error')}`));
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
    // El usuario escribe un % de ganancia → calculamos el precio = costo * (1 + %/100).
    const handleLevelMarginChange = (val: string) => {
        setNewLevelMargin(val);
        const m = parseFloat(val);
        const cost = formData.costPrice || 0;
        if (!isNaN(m) && cost > 0) {
            const price = Math.round(cost * (1 + m / 100) * 100) / 100;
            setNewPriceLevel(prev => ({ ...prev, price }));
        }
    };

    // Si escribe el precio directo, derivamos el % de ganancia contra el costo.
    const handleLevelPriceChange = (val: string) => {
        const price = parseFloat(val);
        setNewPriceLevel(prev => ({ ...prev, price: isNaN(price) ? 0 : price }));
        const cost = formData.costPrice || 0;
        if (!isNaN(price) && cost > 0) {
            const m = Math.round(((price / cost) - 1) * 100 * 100) / 100;
            setNewLevelMargin(String(m));
        }
    };

    const handleAddPriceLevel = () => {
        if (newPriceLevel.levelName && newPriceLevel.price !== undefined) {
            const newItem: ProductPriceLevel = {
                id: `pl-${Date.now()}`,
                levelName: newPriceLevel.levelName,
                price: newPriceLevel.price
            };
            setFormData(prev => ({ ...prev, priceLevels: [...(prev.priceLevels || []), newItem] }));
            setNewPriceLevel({ levelName: '', price: 0 });
            setNewLevelMargin('');
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
                unitPrice: newVariation.unitPrice,
                manualPrice: !!newVariation.manualPrice,
            };
            setFormData(prev => ({ ...prev, variations: [...(prev.variations || []), newItem] }));
            setNewVariation({ name: '', sku: '', unitPrice: 0, manualPrice: false });
        }
    };

    const handleRemoveVariation = (id: string) => {
        setFormData(prev => ({ ...prev, variations: prev.variations?.filter(v => v.id !== id) }));
    };

    // Alterna el "precio manual" de una variante existente.
    const handleToggleVariationManual = (id: string) => {
        setFormData(prev => ({ ...prev, variations: prev.variations?.map(v => v.id === id ? { ...v, manualPrice: !v.manualPrice } : v) }));
    };

    const validateForm = (): Record<string, string> => {
        // Validación con Zod para campos atómicos
        const zodResult = productFormZodSchema.safeParse({
            name: formData.name,
            unitPrice: Number(formData.unitPrice) || 0,
            costPrice: formData.costPrice != null ? Number(formData.costPrice) : undefined,
            ivuRate: formData.ivuRate != null ? Number(formData.ivuRate) : undefined,
            barcode13Digits: formData.barcode13Digits || '',
        });
        const errors: Record<string, string> = zodResult.success
            ? {}
            : zodIssuesToFieldErrors(zodResult.error.issues);

        // Reglas de negocio que no caben en el schema
        if (!formData.category) errors.category = t('pmx.product.err_category');

        const activeBranches = branches.filter(b => b.isActive);

        if (formData.unitPrice && formData.costPrice && formData.unitPrice < formData.costPrice) {
            errors.unitPrice = t('pmx.product.err_price_below_cost');
        }

        if (!productToEdit && (formData.availableStock || 0) > 0 && activeBranches.length === 0) {
            errors.availableStock = t('pmx.product.err_no_active_branch');
        }

        if (!formData.creationDate) {
            errors.creationDate = t('pmx.product.err_date_required');
        } else {
            const date = new Date(formData.creationDate + 'T00:00:00');
            const year = date.getFullYear();
            if (isNaN(date.getTime())) {
                errors.creationDate = t('pmx.product.err_date_invalid');
            } else if (year < 1900 || year > 2100) {
                errors.creationDate = t('pmx.product.err_year_range');
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
            
            setGeneralError(`${t('pmx.product.form_errors_prefix')}: ${Object.values(localErrors).join('. ')}`);
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

                const uploadResponse = await fetch(`${API_URL}/upload`, {
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
                ? `${API_URL}/products/${productToEdit.id}`
                : `${API_URL}/products`;
            
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

            // El servidor puede responder con un cuerpo no-JSON (502/504 de proxy, error de red).
            // Lo leemos como texto primero y sólo parseamos JSON si aplica, para no perder la causa real.
            const rawBody = await response.text();
            let result: any = {};
            try { result = rawBody ? JSON.parse(rawBody) : {}; } catch { result = { error: rawBody }; }

            if (response.ok) {
                // Normalizamos el producto guardado antes de actualizar el estado global
                const normalizedProduct = {
                    ...result,
                    // Extraemos solo el nombre si category es un objeto de Prisma (guard: typeof null === 'object')
                    category: (result.category && typeof result.category === 'object') ? result.category.name : result.category,
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
                    onCreated?.(normalizedProduct as any);
                }
                onClose();
            } else if (response.status === 400 && (Array.isArray(result.error) || Array.isArray(result.errors))) {
                // Manejo de errores de validación de Zod del backend (puede venir en .error o .errors)
                const issues: any[] = Array.isArray(result.error) ? result.error : result.errors;
                const backendErrors: Record<string, string> = {};
                issues.forEach((err: any) => {
                    const path = Array.isArray(err.path) ? err.path[0] : err.path;
                    if (path) backendErrors[path] = err.message;
                });
                setFieldErrors(backendErrors);

                    const firstErrorField = Object.keys(backendErrors)[0];
                    const targetTab = fieldToTabMap[firstErrorField];
                    if (targetTab) setActiveTab(targetTab);

                    // El BE ahora manda un `error` con TODOS los campos ("campo: motivo · …"); si viene,
                    // lo mostramos completo; si no, unimos lo de cada campo.
                    const fullMsg = (typeof result.error === 'string' && result.error) || Object.values(backendErrors).join('. ') || t('pmx.product.save_unexpected');
                    setGeneralError(`${t('pmx.product.server_error_prefix')}: ${fullMsg}`);
            } else {
                // Surface la causa REAL: prueba varias claves y, si no hay, incluye el status HTTP.
                const backendMsg =
                    (typeof result?.error === 'string' && result.error) ||
                    (typeof result?.message === 'string' && result.message) ||
                    (typeof result?.msg === 'string' && result.msg) ||
                    (Array.isArray(result?.errors) ? result.errors.map((e: any) => e?.message || e).join('. ') : '') ||
                    (typeof result?.error === 'object' && result?.error ? JSON.stringify(result.error) : '');
                setGeneralError(backendMsg || `${t('pmx.product.save_unexpected')} (HTTP ${response.status})`);
            }
        } catch (error) {
            console.error("Error submitting product:", error);
            setGeneralError(error instanceof Error && error.message ? `${t('pmx.product.conn_error_net')} (${error.message})` : t('pmx.product.conn_error_net'));
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
        { id: 'Avanzado', label: t('pmx.common.advanced') },
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
                                        <label htmlFor="product-image-input" className="w-32 h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-md flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors" title={t('pmx.product.choose_image_hint')}>
                                            <CameraIcon className="w-8 h-8 text-neutral-400" />
                                        </label>
                                    )}
                                    <div className="flex flex-col space-y-2">
                                        <label className={BUTTON_SECONDARY_SM_CLASSES + " cursor-pointer"}>
                                            {t('product.image_file') || 'Elegir Imagen'}
                                            <input id="product-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                        <p className="text-xs text-neutral-500">{t('pmx.product.image_optional')}</p>
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
                                    <input
                                        type="number"
                                        name="ivuRate"
                                        value={formData.ivuRate ?? ''}
                                        onChange={handleChange}
                                        className={inputFormStyle}
                                        step="0.001"
                                        min="0"
                                        disabled={Number(formData.ivuRate) === 0}
                                    />
                                    <label className="flex items-center gap-2 mt-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={Number(formData.ivuRate) === 0}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                ivuRate: e.target.checked ? 0 : (Number(settings.defaultTaxRate) || 0.115),
                                            }))}
                                            className="h-4 w-4"
                                        />
                                        {t('product.tax_exempt')}
                                    </label>
                                </div>
                                {!productToEdit && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium">{t('product.field.inventory')} ({t('pmx.product.initial')})</label>
                                            <input type="number" name="availableStock" value={formData.availableStock ?? ''} onChange={handleChange} className={inputFormStyle} min="0" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium">{t('pmx.product.initial_stock_branch')}</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    name="initialBranchId" 
                                                    value={formData.initialBranchId || ''} 
                                                    onChange={handleChange} 
                                                    className={inputFormStyle + " flex-grow"}
                                                >
                                                    <option value="">{t('pmx.product.default_active_branch')}</option>
                                                    {branches.filter(b => b.isActive).map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowAddBranchModal(true)}
                                                    className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                                    title={t('pmx.product.new_branch')}
                                                >
                                                    <PlusIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Stock por sucursal (solo al editar): sumar/restar por sucursal */}
                            {productToEdit && (
                                <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg p-3">
                                    <label className="block text-sm font-semibold mb-2">Stock por sucursal</label>
                                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                        {branches.filter(b => b.isActive).length === 0 ? (
                                            <p className="text-xs text-neutral-400">No hay sucursales activas.</p>
                                        ) : branches.filter(b => b.isActive).map(b => (
                                            <div key={b.id} className="flex items-center gap-2">
                                                <span className="flex-1 text-sm truncate">{b.name}</span>
                                                <span className="text-xs text-neutral-500 w-24 text-right">Actual: <strong>{localStock[b.id] ?? 0}</strong></span>
                                                <input
                                                    type="number"
                                                    value={stockDeltas[b.id] ?? ''}
                                                    onChange={e => setStockDeltas(d => ({ ...d, [b.id]: e.target.value }))}
                                                    placeholder="+/−"
                                                    className={`${inputFormStyle} !w-24 text-center`}
                                                    title="Cantidad a sumar (o negativa para restar)"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs text-neutral-400">Suma (o resta con negativo) unidades por sucursal.</p>
                                        <button type="button" onClick={applyStock} disabled={applyingStock} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50`}>
                                            {applyingStock ? 'Aplicando…' : 'Aplicar stock'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <input type="checkbox" name="isEmergencyTaxExempt" checked={formData.isEmergencyTaxExempt} onChange={handleChange} className="h-4 w-4" />
                                <label className="text-sm">{t('product.emergency_exempt')}</label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Identificación' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">{t('pmx.product.skus_alt')}</label>
                                <div className="flex gap-2 mb-2">
                                    <input type="text" value={skuInput} onChange={(e) => setSkuInput(e.target.value)} className={inputFormStyle} placeholder={t('pmx.product.new_sku')} />
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
                                    <label className="block text-sm font-medium">{t('product.field.barcode')} ({t('pmx.product.barcode_13')})</label>
                                    <div className="flex gap-2">
                                        <input type="text" name="barcode13Digits" value={formData.barcode13Digits} onChange={handleChange} className={inputFormStyle} placeholder={t('pmx.product.barcode_empty_ph')} />
                                        <button type="button" onClick={handleGenerateBarcode} className={`${BUTTON_SECONDARY_SM_CLASSES} whitespace-nowrap`} title={t('pmx.product.generate_ean_title')}>{t('pmx.common.generate')}</button>
                                        <button type="button" onClick={handlePrintBarcode} className={`${BUTTON_SECONDARY_SM_CLASSES} whitespace-nowrap`} title={t('pmx.product.print_label_title')}>🖨️ {t('pmx.product.label')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.barcode')} ({t('pmx.product.barcode_secondary')})</label>
                                    <input type="text" name="barcode2" value={formData.barcode2} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Clasificación' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Jerarquía: Departamento (padre) → Categoría (hija). */}
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.department')}</label>
                                    <div className="flex gap-2">
                                        <select
                                            name="departmentId"
                                            value={formData.departmentId || ''}
                                            onChange={(e) => {
                                                const depId = e.target.value;
                                                setFormData(p => {
                                                    const cat = categories.find(c => c.id === p.category);
                                                    // Si la categoría actual no pertenece al nuevo departamento, se limpia.
                                                    const keep = !depId || (cat && (cat.departmentId === depId || !cat.departmentId));
                                                    return { ...p, departmentId: depId, category: keep ? p.category : '' };
                                                });
                                            }}
                                            className={inputFormStyle + " flex-grow"}
                                        >
                                            <option value="">{t('pmx.product.select_department')}</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setShowAddDepartmentModal(true)} className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors" title={t('pmx.product.new_department')}>
                                            <PlusIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.category')}</label>
                                    <div className="flex gap-2">
                                        <select
                                            name="category" value={formData.category || ''}
                                            onChange={(e) => {
                                                const catId = e.target.value;
                                                setFormData(p => {
                                                    const cat = categories.find(c => c.id === catId);
                                                    // La categoría define el departamento (se deriva de ella).
                                                    return { ...p, category: catId, departmentId: cat?.departmentId || p.departmentId || '' };
                                                });
                                            }}
                                            className={`${inputFormStyle} ${fieldErrors.categoryId || fieldErrors.category ? 'border-red-500' : ''} flex-grow`}
                                        >
                                            <option value="">{t('pmx.product.select_category')}</option>
                                            {categories
                                                .filter(c => !formData.departmentId || c.departmentId === formData.departmentId || !c.departmentId)
                                                .map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                        </select>
                                        <button type="button" onClick={() => setShowAddCategoryModal(true)} className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors" title={t('pmx.product.new_category')}>
                                            <PlusIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                                        </button>
                                    </div>
                                    {(fieldErrors.categoryId || fieldErrors.category) && <p className="mt-1 text-xs text-red-500">{fieldErrors.categoryId || fieldErrors.category}</p>}
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
                                            <option value="">{t('pmx.product.select_supplier')}</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <button type="button" className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.search')}</button>
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
                                    <input type="text" name="quality" value={formData.quality} onChange={handleChange} className={inputFormStyle} placeholder={t('pmx.product.quality_ph')} />
                                </div>
                            </div>
                            <fieldset className="border p-3 rounded dark:border-neutral-600">
                                <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('product.field.dimensions_weight')}</legend>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-medium">{t('pmx.product.length_cm')}</label>
                                        <input type="number" name="length" value={formData.length ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">{t('pmx.product.width_cm')}</label>
                                        <input type="number" name="width" value={formData.width ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">{t('pmx.product.height_cm')}</label>
                                        <input type="number" name="height" value={formData.height ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">{t('pmx.product.weight_kg')}</label>
                                        <input type="number" name="weight" value={formData.weight ?? ''} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                </div>
                            </fieldset>
                            
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.compatibility')}</label>
                                <RichTextEditor value={formData.compatibility || ''} onChange={(val) => setFormData(prev => ({...prev, compatibility: val}))} />
                            </div>

                            <div className="border-t pt-4 dark:border-neutral-700">
                                <label className="block text-sm font-medium mb-2">{t('pmx.product.custom_specs')}</label>
                                <div className="flex gap-2 mb-3 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('pmx.product.spec_name_ex')}</label>
                                        <input
                                            type="text"
                                            value={newSpec.name}
                                            onChange={(e) => setNewSpec(prev => ({ ...prev, name: e.target.value }))}
                                            className={inputFormStyle}
                                            placeholder={t('common.name')}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('pmx.product.spec_value_ex')}</label>
                                        <input
                                            type="text"
                                            value={newSpec.value}
                                            onChange={(e) => setNewSpec(prev => ({ ...prev, value: e.target.value }))}
                                            className={inputFormStyle}
                                            placeholder={t('pmx.common.value')}
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
                                        <legend className="text-sm font-medium px-1">{t('pmx.product.add_price_level')}</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 items-end">
                                            <div>
                                                <label className="block text-xs font-medium">{t('product.field.price_level')}</label>
                                                <select
                                                    value={newPriceLevel.levelName}
                                                    onChange={e => setNewPriceLevel(prev => ({...prev, levelName: e.target.value}))}
                                                    className={inputFormStyle}
                                                >
                                                    <option value="">{t('pmx.common.select_ellipsis')}</option>
                                                    <option value="Precio Venta">Precio Venta</option>
                                                    <option value="Precio Mayorista">Precio Mayorista</option>
                                                    <option value="Precio Distribuidor">Precio Distribuidor</option>
                                                    <option value="Precio Empleado">Precio Empleado</option>
                                                </select>
                                            </div>
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-grow">
                                                    <label className="block text-xs font-medium">{t('pmx.product.price')}</label>
                                                    <input type="number" value={newPriceLevel.price} onChange={e => handleLevelPriceChange(e.target.value)} className={inputFormStyle} step="0.01" min="0" />
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-xs font-medium">{t('pmx.product.margin_pct')}</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={newLevelMargin}
                                                            onChange={e => handleLevelMarginChange(e.target.value)}
                                                            className={`${inputFormStyle} pr-6`}
                                                            step="0.1"
                                                            placeholder="10"
                                                            disabled={!formData.costPrice}
                                                            title={!formData.costPrice ? t('pmx.product.define_cost_first') : t('pmx.product.margin_over_cost')}
                                                        />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">%</span>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={handleAddPriceLevel} className={`${BUTTON_PRIMARY_SM_CLASSES} h-12`}>{t('common.add')}</button>
                                            </div>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 md:col-span-2">
                                                {formData.costPrice
                                                    ? <>{t('pmx.product.cost_colon')} <strong>${(formData.costPrice || 0).toFixed(2)}</strong>. {t('pmx.product.margin_auto_hint', { ex: ((formData.costPrice || 0) * 1.1).toFixed(2) })}</>
                                                    : <>{t('pmx.product.define_cost_pre')} <strong>{t('product.field.cost')}</strong> {t('pmx.product.define_cost_post')}</>}
                                            </p>
                                        </div>
                                    </fieldset>
                                    {formData.priceLevels && formData.priceLevels.length > 0 && (
                                        <div className="bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                                            <h4 className="text-sm font-medium mb-2">{t('product.field.price_levels_existing')}</h4>
                                            <ul className="space-y-2">
                                                {formData.priceLevels.map(pl => (
                                                    <li key={pl.id} className="flex justify-between items-center p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                                        <span>{pl.levelName}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-semibold">
                                                                ${pl.price.toFixed(2)}
                                                                {(formData.costPrice || 0) > 0 && (
                                                                    <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                                                                        ({(((pl.price / (formData.costPrice || 1)) - 1) * 100).toFixed(1)}%)
                                                                    </span>
                                                                )}
                                                            </span>
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
                                        <legend className="text-sm font-medium px-1">{t('pmx.product.add_variation')}</legend>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
                                            <div>
                                                <label className="block text-xs font-medium">{t('product.field.variation_name')}</label>
                                                <input type="text" value={newVariation.name} onChange={e => setNewVariation(prev => ({...prev, name: e.target.value}))} className={inputFormStyle} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium">{t('pmx.product.sku_optional')}</label>
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
                                        <label className="flex items-center gap-2 mt-3 text-sm">
                                            <input type="checkbox" checked={!!newVariation.manualPrice} onChange={e => setNewVariation(prev => ({ ...prev, manualPrice: e.target.checked }))} className="h-4 w-4" />
                                            {t('product.field.variation_manual_price')}
                                        </label>
                                    </fieldset>
                                    {formData.variations && formData.variations.length > 0 && (
                                        <div className="bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-md">
                                            <h4 className="text-sm font-medium mb-2">{t('product.field.variations_existing')}</h4>
                                            <ul className="space-y-2">
                                                {formData.variations.map(v => (
                                                    <li key={v.id} className="flex justify-between items-center p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                                        <span>{v.name} {v.sku ? `(${v.sku})` : ''}</span>
                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 cursor-pointer" title={t('product.field.variation_manual_price')}>
                                                                <input type="checkbox" checked={!!v.manualPrice} onChange={() => handleToggleVariationManual(v.id)} className="h-3.5 w-3.5" />
                                                                {t('product.field.manual_price_short')}
                                                            </label>
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
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="manualPrice" checked={!!(formData as any).manualPrice} onChange={handleChange} className="h-4 w-4 text-primary rounded" />
                                    <span className="text-sm">{t('product.field.pos_manual_price')}</span>
                                </label>
                                <p className="text-xs text-neutral-400 pl-6 -mt-1">{t('product.field.pos_manual_price_hint')}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Avanzado' && (
                        <div className="space-y-5">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {t('pmx.product.advanced_hint')}
                            </p>
                            {ADVANCED_PRODUCT_GROUPS.map(group => (
                                <fieldset key={group} className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                    <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">{group}</legend>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mt-1">
                                        {ADVANCED_PRODUCT_FIELDS.filter(f => f.group === group).map(f => {
                                            const val = (formData as any)[f.key];
                                            if (f.type === 'boolean') {
                                                return (
                                                    <label key={f.key} className="flex items-center gap-2 text-sm">
                                                        <input type="checkbox" checked={!!val} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.checked }))} className="h-4 w-4 rounded text-primary" />
                                                        <span>{f.label}</span>
                                                    </label>
                                                );
                                            }
                                            const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
                                            const inputValue = f.type === 'date' ? (val ? String(val).slice(0, 10) : '') : (val ?? '');
                                            return (
                                                <div key={f.key}>
                                                    <label className="block text-xs font-medium mb-0.5">{f.label}</label>
                                                    <input
                                                        type={inputType}
                                                        value={inputValue}
                                                        step={f.type === 'number' ? 'any' : undefined}
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            setFormData(prev => ({ ...prev, [f.key]: f.type === 'number' ? (v === '' ? undefined : parseFloat(v)) : (v === '' ? undefined : v) }));
                                                        }}
                                                        className={inputFormStyle}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? t('common.saving') : t('common.save')}
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
                onClose={(createdBranch) => {
                    if (createdBranch) {
                        setFormData(prev => ({ ...prev, initialBranchId: createdBranch.id }));
                    }
                    setShowAddBranchModal(false);
                }}
                branchToEdit={null}
            />
        </Modal>
    );
};
