
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SupplierOrder, SupplierOrderFormData, SupplierOrderItem, SupplierOrderStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { TrashIconMini, ExclamationTriangleIcon } from '../../components/icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from '../../hooks/useToast';
import { productsService } from '../../services/products';
import {
    supplierOrdersService,
    SUPPLIER_ORDER_MANUAL_STATUSES,
    SUPPLIER_ORDER_CREATE_STATUSES,
    isSupplierOrderReceived,
    displaySupplierOrderStatus,
    toDateInputValue,
    apiErrorMessage,
} from '../../services/supplierOrders';
import { SelectWithCreate } from '../../components/ui/SelectWithCreate';
import { SupplierFormModal } from './SupplierFormModal';
import { usePermissions } from '../../hooks/usePermissions';

interface SupplierOrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderToEdit: SupplierOrder | null;
    /** Solo lectura. Si se omite: lectura cuando el usuario no tiene `supplierOrders.manage`. */
    readOnly?: boolean;
}

// ── Autocomplete de producto (búsqueda en el servidor) ────────────────────────
/** Producto mínimo que necesita el formulario (viene del endpoint slim de /products). */
interface PickedProduct {
    id: string;
    name: string;
    stock: number;
    cost: number;
}

const toPicked = (p: any): PickedProduct => ({
    id: p.id,
    name: p.name,
    stock: Array.isArray(p.stockByBranch) ? p.stockByBranch.reduce((s: number, sb: any) => s + (Number(sb?.quantity) || 0), 0) : 0,
    cost: Number(p.lastCost ?? p.costPrice ?? 0) || 0,
});

interface ProductPickerProps {
    value: string;              // productId seleccionado
    selectedName: string;       // nombre del seleccionado (para mostrarlo en el input)
    onSelect: (product: PickedProduct | null) => void;
    className?: string;
}

/**
 * Busca en el servidor (nombre, códigos, SKU…) en lugar de filtrar la lista global de productos,
 * que solo trae una página: así se puede pedir CUALQUIER producto del catálogo.
 */
const ProductPicker: React.FC<ProductPickerProps> = ({ value, selectedName, onSelect, className }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState(selectedName);
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<PickedProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestIdRef = useRef(0);

    // Sincronizar cuando cambia la selección externa (p. ej. al agregar el artículo se limpia).
    // Si la limpió el propio input al teclear (dropdown abierto), no borrar lo que se escribe.
    useEffect(() => {
        if (value) setQuery(selectedName);
        else if (!open) setQuery('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, selectedName]);

    // Cerrar al hacer clic fuera.
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery(value ? selectedName : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, selectedName]);

    // Búsqueda remota con debounce (descarta respuestas viejas).
    useEffect(() => {
        if (!open) return;
        const term = query.trim();
        const requestId = ++requestIdRef.current;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await productsService.getAll({ search: term || undefined, limit: 20, slim: true });
                if (requestId !== requestIdRef.current) return;
                setResults((Array.isArray(data) ? data : []).map(toPicked));
            } catch {
                if (requestId === requestIdRef.current) setResults([]);
            } finally {
                if (requestId === requestIdRef.current) setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, open]);

    const handleSelect = (p: PickedProduct) => {
        onSelect(p);
        setQuery(p.name);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onSelect(null); }}
                onFocus={() => setOpen(true)}
                placeholder={t('ecomx.supplier_orders.product_search_ph')}
                className={className}
                autoComplete="off"
            />
            {open && (
                <ul className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md shadow-lg text-sm">
                    {loading ? (
                        <li className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{t('cmpx.common.searching')}</li>
                    ) : results.length === 0 ? (
                        <li className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{t('ecomx.common.no_results')}</li>
                    ) : results.map(p => (
                        <li
                            key={p.id}
                            onMouseDown={() => handleSelect(p)}
                            className="px-3 py-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 flex justify-between items-center gap-2"
                        >
                            <span className="truncate">{p.name}</span>
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap shrink-0">
                                {t('ecomx.common.stock', { n: p.stock })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_ITEM = { productId: '', quantityOrdered: 1, unitCost: 0 };

export const SupplierOrderFormModal: React.FC<SupplierOrderFormModalProps> = ({ isOpen, onClose, orderToEdit, readOnly: readOnlyProp }) => {
    const { t } = useTranslation();
    const { can } = usePermissions();
    // Sin permiso de gestión el modal es de solo lectura (el backend rechazaría el guardado).
    const readOnly = readOnlyProp ?? !can('supplierOrders.manage');
    // El "+" para crear proveedor inline solo si puede gestionar proveedores.
    const canCreateSupplier = !readOnly && can('suppliers.manage');
    // Proveedores directamente del contexto (el backend ya los limita al negocio).
    const { suppliers, products, setSupplierOrders } = useData();

    const initialFormData = (): SupplierOrderFormData => ({
        supplierId: suppliers[0]?.id || '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        items: [],
        status: SupplierOrderStatus.BORRADOR,
    });

    const [formData, setFormData] = useState<SupplierOrderFormData>(initialFormData);
    const [currentItem, setCurrentItem] = useState<{ productId: string; quantityOrdered: number; unitCost: number }>(EMPTY_ITEM);
    const [currentName, setCurrentName] = useState('');
    // Nombres de productos de las líneas (los productos buscados pueden no estar en la lista global).
    const [productNames, setProductNames] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCreateSupplier, setShowCreateSupplier] = useState(false);

    // Reglas del backend: una orden recibida (total o parcial) o cancelada no cambia sus productos;
    // una recibida tampoco cambia de estado (eso lo hace "Recibir mercancía").
    const isEdit = !!orderToEdit;
    const isReceived = isEdit && isSupplierOrderReceived(orderToEdit!.status);
    const isCancelled = isEdit && orderToEdit!.status === SupplierOrderStatus.CANCELADO;
    const hasReceivedQty = isEdit && (orderToEdit!.items || []).some(i => (i.quantityReceived || 0) > 0);
    const itemsLocked = isReceived || isCancelled || hasReceivedQty;
    const statusLocked = isReceived;
    const statusOptions: readonly string[] = isEdit ? SUPPLIER_ORDER_MANUAL_STATUSES : SUPPLIER_ORDER_CREATE_STATUSES;

    useEffect(() => {
        if (!isOpen) return;
        if (orderToEdit) {
            setFormData({
                supplierId: orderToEdit.supplierId,
                // El backend manda ISO completo; <input type="date"> necesita YYYY-MM-DD.
                orderDate: toDateInputValue(orderToEdit.orderDate),
                expectedDeliveryDate: toDateInputValue(orderToEdit.expectedDeliveryDate),
                items: orderToEdit.items || [],
                status: orderToEdit.status,
            });
            const names: Record<string, string> = {};
            (orderToEdit.items || []).forEach(i => { if (i.product?.name) names[i.productId] = i.product.name; });
            setProductNames(names);
        } else {
            setFormData(initialFormData());
            setProductNames({});
        }
        setCurrentItem(EMPTY_ITEM);
        setCurrentName('');
    // Solo al abrir o cambiar de orden. NO dependemos de `suppliers` para no reiniciar
    // el formulario cuando se crea un proveedor inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderToEdit, isOpen]);

    // Si los proveedores llegan después de abrir (creación), preseleccionar el primero.
    useEffect(() => {
        if (isOpen && !orderToEdit && !formData.supplierId && suppliers[0]?.id) {
            setFormData(prev => ({ ...prev, supplierId: suppliers[0].id }));
        }
    }, [isOpen, orderToEdit, suppliers, formData.supplierId]);

    const supplierOptions = useMemo(() => {
        const opts = suppliers.map(s => ({ value: s.id, label: s.name }));
        // La orden puede traer su proveedor embebido aunque la lista aún no cargue.
        if (orderToEdit?.supplier && !opts.some(o => o.value === orderToEdit.supplierId)) {
            opts.push({ value: orderToEdit.supplierId, label: orderToEdit.supplier.name });
        }
        return opts;
    }, [suppliers, orderToEdit]);

    const productName = (item: SupplierOrderItem) =>
        productNames[item.productId] || item.product?.name || products.find(p => p.id === item.productId)?.name || t('ecomx.common.unknown');

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectProduct = (p: PickedProduct | null) => {
        if (!p) {
            setCurrentItem(prev => ({ ...prev, productId: '' }));
            setCurrentName('');
            return;
        }
        setCurrentItem(prev => ({ ...prev, productId: p.id, unitCost: prev.unitCost > 0 ? prev.unitCost : p.cost }));
        setCurrentName(p.name);
        setProductNames(prev => ({ ...prev, [p.id]: p.name }));
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
        setCurrentItem(EMPTY_ITEM);
        setCurrentName('');
    };

    const handleRemoveItem = (productIdToRemove: string) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productIdToRemove) }));
    };

    const totalCost = useMemo(() => {
        return formData.items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);
    }, [formData.items]);

    const amountPaid = orderToEdit?.amountPaid || 0;
    const totalBelowPaid = !readOnly && isEdit && !itemsLocked && totalCost < amountPaid - 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) { onClose(); return; }
        if (!formData.supplierId) { toast.error(t('ecomx.supplier_orders.select_supplier')); return; }
        if (!itemsLocked && formData.items.length === 0) { toast.error(t('ecomx.supplier_orders.need_item')); return; }
        if (totalBelowPaid) {
            toast.error(t('ecomx.supplier_orders.total_below_paid', { total: totalCost.toFixed(2), paid: amountPaid.toFixed(2) }));
            return;
        }

        // Sin storeOwnerId: el backend lo resuelve con la sesión.
        const payload: any = {
            supplierId: formData.supplierId,
            orderDate: formData.orderDate || undefined,
            expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        };
        if (!statusLocked) payload.status = formData.status;
        if (!itemsLocked) {
            payload.items = formData.items.map(i => ({ productId: i.productId, quantityOrdered: i.quantityOrdered, unitCost: i.unitCost }));
        }

        setIsSubmitting(true);
        try {
            if (orderToEdit) {
                const result = await supplierOrdersService.update(orderToEdit.id, payload);
                setSupplierOrders(prev => prev.map(o => o.id === orderToEdit.id ? (result as unknown as SupplierOrder) : o));
            } else {
                const result = await supplierOrdersService.create(payload);
                setSupplierOrders(prev => [result as unknown as SupplierOrder, ...prev]);
            }
            toast.success(orderToEdit ? t('ecomx.supplier_orders.updated') : t('ecomx.supplier_orders.created'));
            onClose();
        } catch (err) {
            const msg = apiErrorMessage(err, t('ecomx.supplier_orders.save_error'));
            if (msg) toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const footer = readOnly ? (
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.close')}</button>
        </div>
    ) : (
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
            <button type="submit" form="supplier-order-form" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
        </div>
    );

    const modalTitle = readOnly
        ? t('ecomx.supplier_orders.view_title')
        : orderToEdit ? t('ecommerce.supplier_orders.form.edit_title') : t('ecommerce.supplier_orders.form.create_title');

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="4xl" footer={footer}>
            <form id="supplier-order-form" onSubmit={handleSubmit}>
                {/* En solo lectura el fieldset deshabilita todos los controles del formulario. */}
                <fieldset disabled={readOnly} className="space-y-4 min-w-0 border-0 p-0 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectWithCreate
                        id="supplierId"
                        name="supplierId"
                        label={t('ecommerce.supplier_orders.col.supplier')}
                        value={formData.supplierId}
                        onChange={(v) => setFormData(prev => ({ ...prev, supplierId: v }))}
                        options={supplierOptions}
                        onCreateClick={canCreateSupplier ? () => setShowCreateSupplier(true) : undefined}
                        required
                        placeholder={t('ecomx.supplier_orders.select_supplier_ph')}
                        emptyHint={t('ecomx.supplier_orders.empty_hint')}
                        createTitle={t('ecomx.supplier_orders.create_supplier_title')}
                    />
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.supplier_orders.col.status')}</label>
                        {statusLocked ? (
                            <>
                                <input id="status" type="text" value={displaySupplierOrderStatus(formData.status)} readOnly disabled className={`${inputFormStyle} opacity-70 cursor-not-allowed`} />
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('ecomx.supplier_orders.status_locked_received')}</p>
                            </>
                        ) : (
                            <>
                                <select name="status" id="status" value={formData.status} onChange={handleFormChange} className={inputFormStyle}>
                                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('ecomx.supplier_orders.status_receive_hint')}</p>
                            </>
                        )}
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

                {/* ── Artículos ── */}
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('ecommerce.supplier_orders.form.items')}</legend>

                    {itemsLocked ? (
                        <div className="mb-3 p-2 rounded flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-xs text-amber-800 dark:text-amber-300">
                            <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{isCancelled ? t('ecomx.supplier_orders.items_locked_cancelled') : t('ecomx.supplier_orders.items_locked_received')}</span>
                        </div>
                    ) : readOnly ? null : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 items-end">
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t('ecommerce.supplier_orders.form.item_product')}</label>
                                <ProductPicker
                                    value={currentItem.productId}
                                    selectedName={currentName}
                                    onSelect={handleSelectProduct}
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
                    )}

                    {formData.items.length > 0 && (
                        <div className="max-h-56 overflow-y-auto border dark:border-neutral-600 rounded">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-900 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-1 text-left">{t('ecommerce.supplier_orders.form.item_product')}</th>
                                        <th className="px-2 py-1 text-right">{t('ecomx.common.qty_short')}</th>
                                        {isEdit && <th className="px-2 py-1 text-right">{t('ecomx.supplier_orders.received_short')}</th>}
                                        <th className="px-2 py-1 text-right">{t('ecomx.common.unit_cost_short')}</th>
                                        <th className="px-2 py-1 text-right">{t('ecomx.common.subtotal')}</th>
                                        {!itemsLocked && !readOnly && <th className="px-1 py-1"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-neutral-600">
                                    {formData.items.map(item => (
                                        <tr key={item.productId} className="hover:bg-neutral-100 dark:hover:bg-neutral-700/50">
                                            <td className="px-2 py-1">{productName(item)}</td>
                                            <td className="px-2 py-1 text-right">{item.quantityOrdered}</td>
                                            {isEdit && <td className="px-2 py-1 text-right">{item.quantityReceived || 0}</td>}
                                            <td className="px-2 py-1 text-right">${item.unitCost.toFixed(2)}</td>
                                            <td className="px-2 py-1 text-right">${(item.quantityOrdered * item.unitCost).toFixed(2)}</td>
                                            {!itemsLocked && !readOnly && (
                                                <td className="px-1 py-1 text-center">
                                                    <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0.5" aria-label={t('ecomx.supplier_orders.remove_item')}>
                                                        <TrashIconMini />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </fieldset>

                {totalBelowPaid && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-right">
                        {t('ecomx.supplier_orders.total_below_paid', { total: totalCost.toFixed(2), paid: amountPaid.toFixed(2) })}
                    </p>
                )}
                <div className="text-right font-semibold text-lg text-neutral-800 dark:text-neutral-100 mt-4">
                    {t('ecomx.supplier_orders.total_cost_label')}: ${totalCost.toFixed(2)}
                </div>
                </fieldset>
            </form>
        </Modal>
        {showCreateSupplier && (
            <SupplierFormModal
                isOpen={showCreateSupplier}
                supplier={null}
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
