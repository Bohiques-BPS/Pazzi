
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SupplierOrder, SupplierOrderFormData, Product as ProductType, SupplierOrderStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, SUPPLIER_ORDER_STATUS_OPTIONS } from '../../constants';
import { TrashIconMini } from '../../components/icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../services/api';
import { SelectWithCreate } from '../../components/ui/SelectWithCreate';
import { SupplierFormModal } from './SupplierFormModal';

interface SupplierOrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderToEdit: SupplierOrder | null;
    storeOwnerId?: string;
}

// ── Autocomplete de producto ──────────────────────────────────────────────────
interface ProductAutocompleteProps {
    products: ProductType[];
    value: string;              // productId seleccionado
    onChange: (productId: string) => void;
    className?: string;
}

const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({ products, value, onChange, className }) => {
    const { t } = useTranslation();
    const selectedProduct = products.find(p => p.id === value);
    const [query, setQuery] = useState(selectedProduct?.name || '');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sincronizar cuando cambia el valor externo
    useEffect(() => {
        setQuery(selectedProduct?.name || '');
    }, [value, selectedProduct?.name]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                // Si no hay selección válida, limpiar
                if (!value) setQuery('');
                else setQuery(selectedProduct?.name || '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, selectedProduct?.name]);

    const filtered = useMemo(() => {
        if (!query.trim()) return products.slice(0, 50);
        const q = query.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && String(p.sku).toLowerCase().includes(q)) ||
            (p.skus && p.skus.some((s: string) => s.toLowerCase().includes(q)))
        ).slice(0, 50);
    }, [products, query]);

    const handleSelect = (p: ProductType) => {
        onChange(p.id);
        setQuery(p.name);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); }}
                onFocus={() => setOpen(true)}
                placeholder={t('ecomx.supplier_orders.product_search_ph')}
                className={className}
                autoComplete="off"
            />
            {open && (
                <ul className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg text-sm">
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{t('ecomx.common.no_results')}</li>
                    ) : filtered.map(p => {
                        const totalStock = p.stockByBranch?.reduce((s: number, sb: any) => s + sb.quantity, 0) ?? 0;
                        return (
                            <li
                                key={p.id}
                                onMouseDown={() => handleSelect(p)}
                                className="px-3 py-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 flex justify-between items-center gap-2"
                            >
                                <span className="truncate">{p.name}</span>
                                <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap shrink-0">
                                    {t('ecomx.common.stock', { n: totalStock })}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

export const SupplierOrderFormModal: React.FC<SupplierOrderFormModalProps> = ({ isOpen, onClose, orderToEdit, storeOwnerId }) => {
    const { t } = useTranslation();
    const {
        getSuppliersByStoreOwner,
        products,           // todos los productos, no filtrar por storeOwnerId (puede no coincidir)
        setSupplierOrders
    } = useData();

    const filteredSuppliers = useMemo(() => {
        return storeOwnerId ? getSuppliersByStoreOwner(storeOwnerId) : [];
    }, [getSuppliersByStoreOwner, storeOwnerId]);

    const initialFormData = useMemo((): SupplierOrderFormData => ({
        supplierId: filteredSuppliers[0]?.id || '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        items: [],
        status: SupplierOrderStatus.BORRADOR,
    }), [filteredSuppliers]);

    const [formData, setFormData] = useState<SupplierOrderFormData>(initialFormData);
    const [currentItem, setCurrentItem] = useState<{ productId: string; quantityOrdered: number; unitCost: number }>({
        productId: '',
        quantityOrdered: 1,
        unitCost: 0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCreateSupplier, setShowCreateSupplier] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (orderToEdit) {
                setFormData({
                    supplierId: orderToEdit.supplierId,
                    orderDate: orderToEdit.orderDate,
                    expectedDeliveryDate: orderToEdit.expectedDeliveryDate || '',
                    items: orderToEdit.items,
                    status: orderToEdit.status,
                });
            } else {
                setFormData({
                    ...initialFormData,
                    supplierId: filteredSuppliers[0]?.id || '',
                });
            }
            setCurrentItem({ productId: '', quantityOrdered: 1, unitCost: 0 });
        }
    // Solo al abrir o cambiar de orden. NO dependemos de `filteredSuppliers` para no reiniciar
    // el formulario cuando se crea un proveedor inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderToEdit, isOpen]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddItem = () => {
        if (!currentItem.productId) {
            toast.error(t('ecomx.supplier_orders.select_product'));
            return;
        }
        if (currentItem.quantityOrdered <= 0 || currentItem.unitCost < 0) {
            toast.error(t('ecomx.supplier_orders.qty_cost_invalid'));
            return;
        }
        if (formData.items.find(item => item.productId === currentItem.productId)) {
            toast.error(t('ecomx.supplier_orders.product_already'));
            return;
        }
        setFormData(prev => ({ ...prev, items: [...prev.items, currentItem] }));
        setCurrentItem({ productId: '', quantityOrdered: 1, unitCost: 0 });
    };

    const handleRemoveItem = (productIdToRemove: string) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productIdToRemove) }));
    };

    const totalCost = useMemo(() => {
        return formData.items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);
    }, [formData.items]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplierId) { toast.error(t('ecomx.supplier_orders.select_supplier')); return; }
        if (formData.items.length === 0) { toast.error(t('ecomx.supplier_orders.need_item')); return; }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('pazzi_token');
            const url = orderToEdit
                ? `${API_URL}/supplier-orders/${orderToEdit.id}`
                : `${API_URL}/supplier-orders`;

            const response = await fetch(url, {
                method: orderToEdit ? 'PUT' : 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, storeOwnerId: storeOwnerId || '' }),
            });

            const result = await response.json();

            if (response.ok) {
                if (orderToEdit) {
                    setSupplierOrders(prev => prev.map(o => o.id === orderToEdit.id ? result : o));
                } else {
                    setSupplierOrders(prev => [result, ...prev]);
                }
                toast.success(orderToEdit ? t('ecomx.supplier_orders.updated') : t('ecomx.supplier_orders.created'));
                onClose();
            } else {
                toast.error(result.error || t('ecomx.supplier_orders.save_error'));
            }
        } catch {
            toast.error(t('ecomx.common.server_connection_error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={orderToEdit ? t('ecommerce.supplier_orders.form.edit_title') : t('ecommerce.supplier_orders.form.create_title')} size="4xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectWithCreate
                        id="supplierId"
                        name="supplierId"
                        label={t('ecommerce.supplier_orders.col.supplier')}
                        value={formData.supplierId}
                        onChange={(v) => setFormData(prev => ({ ...prev, supplierId: v }))}
                        options={filteredSuppliers.map(s => ({ value: s.id, label: s.name }))}
                        onCreateClick={() => setShowCreateSupplier(true)}
                        required
                        placeholder={t('ecomx.supplier_orders.select_supplier_ph')}
                        emptyHint={t('ecomx.supplier_orders.empty_hint')}
                        createTitle={t('ecomx.supplier_orders.create_supplier_title')}
                    />
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.supplier_orders.col.status')}</label>
                        <select name="status" id="status" value={formData.status} onChange={handleFormChange} className={inputFormStyle}>
                            {SUPPLIER_ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="orderDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.supplier_orders.col.date')}</label>
                        <input type="date" name="orderDate" id="orderDate" value={formData.orderDate} onChange={handleFormChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.supplier_orders.col.delivery_date')}</label>
                        <input type="date" name="expectedDeliveryDate" id="expectedDeliveryDate" value={formData.expectedDeliveryDate || ''} onChange={handleFormChange} className={inputFormStyle} />
                    </div>
                </div>

                {/* ── Agregar artículos ── */}
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('ecommerce.supplier_orders.form.items')}</legend>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 items-end">
                        {/* Autocomplete de producto */}
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t('ecommerce.supplier_orders.form.item_product')}</label>
                            <ProductAutocomplete
                                products={products}
                                value={currentItem.productId}
                                onChange={productId => setCurrentItem(prev => ({ ...prev, productId }))}
                                className={inputFormStyle + " text-sm !py-1.5 w-full"}
                            />
                        </div>
                        <div>
                            <label htmlFor="itemQuantity" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t('ecommerce.supplier_orders.form.item_quantity')}</label>
                            <input
                                type="number" id="itemQuantity" value={currentItem.quantityOrdered}
                                onChange={e => setCurrentItem(prev => ({ ...prev, quantityOrdered: Math.max(1, parseInt(e.target.value) || 1) }))}
                                className={inputFormStyle + " text-sm !py-1.5"} min="1"
                            />
                        </div>
                        <div>
                            <label htmlFor="itemUnitCost" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t('ecommerce.supplier_orders.form.item_cost')}</label>
                            <input
                                type="number" id="itemUnitCost" value={currentItem.unitCost}
                                onChange={e => setCurrentItem(prev => ({ ...prev, unitCost: Math.max(0, parseFloat(e.target.value) || 0) }))}
                                className={inputFormStyle + " text-sm !py-1.5"} min="0" step="0.01"
                            />
                        </div>
                        <button type="button" onClick={handleAddItem} className={`${BUTTON_SECONDARY_SM_CLASSES} md:col-start-4 !text-sm`}>
                            {t('ecommerce.supplier_orders.form.add_item')}
                        </button>
                    </div>

                    {formData.items.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border dark:border-neutral-600 rounded">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-900 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-1 text-left">{t('ecommerce.supplier_orders.form.item_product')}</th>
                                        <th className="px-2 py-1 text-right">{t('ecomx.common.qty_short')}</th>
                                        <th className="px-2 py-1 text-right">{t('ecomx.common.unit_cost_short')}</th>
                                        <th className="px-2 py-1 text-right">{t('ecomx.common.subtotal')}</th>
                                        <th className="px-1 py-1"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-neutral-600">
                                    {formData.items.map(item => {
                                        const product = products.find(p => p.id === item.productId);
                                        return (
                                            <tr key={item.productId} className="hover:bg-neutral-100 dark:hover:bg-neutral-700/50">
                                                <td className="px-2 py-1">{product?.name || t('ecomx.common.unknown')}</td>
                                                <td className="px-2 py-1 text-right">{item.quantityOrdered}</td>
                                                <td className="px-2 py-1 text-right">${item.unitCost.toFixed(2)}</td>
                                                <td className="px-2 py-1 text-right">${(item.quantityOrdered * item.unitCost).toFixed(2)}</td>
                                                <td className="px-1 py-1 text-center">
                                                    <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700 p-0.5" aria-label={t('ecomx.supplier_orders.remove_item')}>
                                                        <TrashIconMini />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </fieldset>

                <div className="text-right font-semibold text-lg text-neutral-800 dark:text-neutral-100 mt-4">
                    {t('ecomx.supplier_orders.total_cost_label')}: ${totalCost.toFixed(2)}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? t('common.saving') : t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
        {showCreateSupplier && (
            <SupplierFormModal
                isOpen={showCreateSupplier}
                supplier={null}
                storeOwnerId={storeOwnerId}
                onClose={(createdSupplier) => {
                    if (createdSupplier) {
                        setFormData(prev => ({ ...prev, supplierId: createdSupplier.id }));
                        toast.success(t('ecomx.supplier_orders.supplier_created', { name: createdSupplier.name }));
                    }
                    setShowCreateSupplier(false);
                }}
            />
        )}
        </>
    );
};
