
import React, { useState, useEffect } from 'react';
import { Product, ProductFormData, CustomSpecification, ProductPriceLevel, ProductVariation } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { PlusIcon, TrashIconMini } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit: Product | null;
    storeOwnerIdForNewProduct: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, storeOwnerIdForNewProduct }) => {
    const { t } = useTranslation();
    const { addProduct, updateProduct, categories, departments, suppliers } = useData();
    
    const initialFormData: ProductFormData = {
        name: '',
        unitPrice: 0,
        description: '',
        imageUrl: '',
        skus: [],
        category: '',
        ivaRate: 0.16,
        storeOwnerId: storeOwnerIdForNewProduct,
        isEmergencyTaxExempt: false,
        costPrice: 0,
        profit: 0,
        supplierId: '',
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
    
    const [newSpec, setNewSpec] = useState<CustomSpecification>({ name: '', value: '' });
    const [newPriceLevel, setNewPriceLevel] = useState<Partial<ProductPriceLevel>>({ levelName: '', price: 0 });
    const [newVariation, setNewVariation] = useState<Partial<ProductVariation>>({ name: '', sku: '', unitPrice: 0 });

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    ...initialFormData, // Ensure all fields exist
                    ...productToEdit,
                    // Explicitly handle arrays and objects to avoid undefined references if checking properties
                    skus: productToEdit.skus || [],
                    customSpecifications: productToEdit.customSpecifications || [],
                    priceLevels: productToEdit.priceLevels || [],
                    variations: productToEdit.variations || [],
                    creationDate: productToEdit.creationDate || new Date().toISOString().split('T')[0],
                });
            } else {
                setFormData({ ...initialFormData, storeOwnerId: storeOwnerIdForNewProduct });
            }
            setActiveTab('Principal');
            setSkuInput('');
            setNewSpec({ name: '', value: '' });
            setNewPriceLevel({ levelName: '', price: 0 });
            setNewVariation({ name: '', sku: '', unitPrice: 0 });
        }
    }, [isOpen, productToEdit, storeOwnerIdForNewProduct]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (type === 'number') {
             setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert("El nombre del producto es obligatorio.");
            return;
        }

        if (productToEdit) {
            updateProduct(productToEdit.id, formData);
        } else {
            addProduct(formData);
        }
        onClose();
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? t('product.form.title.edit') : t('product.form.title.create')} size="7xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-[80vh]">
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4 overflow-x-auto flex-shrink-0">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id} 
                            type="button" 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {activeTab === 'Principal' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.name')}</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">{t('product.field.description')}</label>
                                <RichTextEditor value={formData.description || ''} onChange={(val) => setFormData(prev => ({...prev, description: val}))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">URL Imagen</label>
                                <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'Precios' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.price')}</label>
                                    <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} className={inputFormStyle} step="0.01" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.cost')}</label>
                                    <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className={inputFormStyle} step="0.01" min="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.profit')}</label>
                                    <input type="number" name="profit" value={formData.profit} onChange={handleChange} className={inputFormStyle} step="0.01" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">{t('product.tax_rate')}</label>
                                    <input type="number" name="ivaRate" value={formData.ivaRate} onChange={handleChange} className={inputFormStyle} step="0.01" min="0" />
                                </div>
                                {!productToEdit && (
                                    <div>
                                        <label className="block text-sm font-medium">{t('product.field.inventory')} (Inicial)</label>
                                        <input type="number" name="availableStock" value={formData.availableStock} onChange={handleChange} className={inputFormStyle} min="0" />
                                        <p className="text-xs text-neutral-500">Se asignará a la sucursal activa por defecto.</p>
                                    </div>
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
                                    <select name="category" value={formData.category} onChange={handleChange} className={inputFormStyle}>
                                        <option value="">Seleccionar Categoría</option>
                                        {categories.filter(c => !c.storeOwnerId || c.storeOwnerId === formData.storeOwnerId || c.storeOwnerId === 'admin-user').map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">{t('product.field.department')}</label>
                                    <select name="departmentId" value={formData.departmentId} onChange={handleChange} className={inputFormStyle}>
                                        <option value="">Seleccionar Departamento</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
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
                                        <select name="supplierId" value={formData.supplierId} onChange={handleChange} className={inputFormStyle}>
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
                                <input type="date" name="creationDate" value={formData.creationDate} onChange={handleChange} className={inputFormStyle} />
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
                                        <input type="number" name="length" value={formData.length} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">Ancho (cm)</label>
                                        <input type="number" name="width" value={formData.width} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">Alto (cm)</label>
                                        <input type="number" name="height" value={formData.height} onChange={handleChange} className={inputFormStyle} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium">Peso (kg)</label>
                                        <input type="number" name="weight" value={formData.weight} onChange={handleChange} className={inputFormStyle} />
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
                                        className="h-12 w-12 bg-primary hover:bg-secondary text-white rounded-md shadow-sm flex items-center justify-center transition-colors duration-150 flex-shrink-0"
                                        title={t('common.add')}
                                    >
                                        <PlusIcon className="w-6 h-6" />
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
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('common.save')}</button>
                </div>
            </form>
        </Modal>
    );
};
