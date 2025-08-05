import React, { useState, useEffect, useMemo } from 'react';
import { SupplierOrder, SupplierOrderFormData, SupplierOrderItem, Product as ProductType, SupplierOrderStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, SUPPLIER_ORDER_STATUS_OPTIONS } from '../../constants';
import { TrashIconMini } from '../../components/icons';

interface SupplierOrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderToEdit: SupplierOrder | null;
}

export const SupplierOrderFormModal: React.FC<SupplierOrderFormModalProps> = ({ isOpen, onClose, orderToEdit }) => {
    const { suppliers, products: catalogProducts, addSupplierOrder, setSupplierOrders } = useData();
    
    const initialFormData: SupplierOrderFormData = {
        supplierId: suppliers[0]?.id || '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        items: [],
        status: SupplierOrderStatus.BORRADOR, // Changed from 'Borrador'
    };
    const [formData, setFormData] = useState<SupplierOrderFormData>(initialFormData);
    const [currentItem, setCurrentItem] = useState<{ productId: string; quantityOrdered: number; unitCost: number }>({
        productId: catalogProducts[0]?.id || '',
        quantityOrdered: 1,
        unitCost: 0,
    });

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
                    supplierId: suppliers[0]?.id || '', // Ensure supplierId is set if suppliers exist
                });
            }
            setCurrentItem({ productId: catalogProducts[0]?.id || '', quantityOrdered: 1, unitCost: 0 });
        }
    }, [orderToEdit, isOpen, suppliers, catalogProducts, initialFormData]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numValue = parseFloat(value);
        setCurrentItem(prev => ({ ...prev, [name]: name === 'productId' ? value : (numValue >=0 ? numValue : 0) }));
    };

    const handleAddItem = () => {
        if (!currentItem.productId || currentItem.quantityOrdered <= 0 || currentItem.unitCost < 0) {
            alert("Por favor, complete todos los campos del artículo correctamente.");
            return;
        }
        const productExists = formData.items.find(item => item.productId === currentItem.productId);
        if (productExists) {
            alert("Este producto ya está en el pedido. Edite la cantidad existente si es necesario.");
            return;
        }
        setFormData(prev => ({ ...prev, items: [...prev.items, currentItem] }));
        setCurrentItem({ productId: catalogProducts[0]?.id || '', quantityOrdered: 1, unitCost: 0 }); // Reset for next item
    };

    const handleRemoveItem = (productIdToRemove: string) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productIdToRemove) }));
    };
    
    const totalCost = useMemo(() => {
        return formData.items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);
    }, [formData.items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplierId) {
            alert("Por favor, seleccione un proveedor.");
            return;
        }
        if (formData.items.length === 0) {
            alert("El pedido debe contener al menos un artículo.");
            return;
        }

        if (orderToEdit) {
            const updatedOrder: SupplierOrder = { ...orderToEdit, ...formData, totalCost };
            setSupplierOrders(prev => prev.map(o => o.id === orderToEdit.id ? updatedOrder : o));
        } else {
            // totalCost is calculated inside addSupplierOrder for new orders
            addSupplierOrder(formData);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={orderToEdit ? 'Editar Pedido a Proveedor' : 'Crear Pedido a Proveedor'} size="4xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="supplierId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Proveedor</label>
                        <select name="supplierId" id="supplierId" value={formData.supplierId} onChange={handleFormChange} className={inputFormStyle} required>
                            <option value="">Seleccionar Proveedor</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
                        <select name="status" id="status" value={formData.status} onChange={handleFormChange} className={inputFormStyle}>
                            {SUPPLIER_ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="orderDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha del Pedido</label>
                        <input type="date" name="orderDate" id="orderDate" value={formData.orderDate} onChange={handleFormChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha Estimada Entrega (Opcional)</label>
                        <input type="date" name="expectedDeliveryDate" id="expectedDeliveryDate" value={formData.expectedDeliveryDate || ''} onChange={handleFormChange} className={inputFormStyle} />
                    </div>
                </div>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Artículos del Pedido</legend>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="itemProductId" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Producto</label>
                            <select name="productId" id="itemProductId" value={currentItem.productId} onChange={handleItemInputChange} className={inputFormStyle + " text-sm !py-1.5"}>
                                {catalogProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock Total: {p.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0)})</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="itemQuantity" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Cantidad</label>
                            <input type="number" name="quantityOrdered" id="itemQuantity" value={currentItem.quantityOrdered} onChange={handleItemInputChange} className={inputFormStyle + " text-sm !py-1.5"} min="1" />
                        </div>
                        <div>
                            <label htmlFor="itemUnitCost" className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Costo Unit.</label>
                            <input type="number" name="unitCost" id="itemUnitCost" value={currentItem.unitCost} onChange={handleItemInputChange} className={inputFormStyle + " text-sm !py-1.5"} min="0" step="0.01" />
                        </div>
                        <button type="button" onClick={handleAddItem} className={`${BUTTON_SECONDARY_SM_CLASSES} md:col-start-4 !text-sm`}>Añadir Artículo</button>
                    </div>
                    {formData.items.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border dark:border-neutral-600 rounded">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-700 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-1 text-left">Producto</th>
                                        <th className="px-2 py-1 text-right">Cant.</th>
                                        <th className="px-2 py-1 text-right">Costo U.</th>
                                        <th className="px-2 py-1 text-right">Subtotal</th>
                                        <th className="px-1 py-1"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-neutral-600">
                                    {formData.items.map(item => {
                                        const product = catalogProducts.find(p => p.id === item.productId);
                                        return (
                                            <tr key={item.productId} className="hover:bg-neutral-100 dark:hover:bg-neutral-700/50">
                                                <td className="px-2 py-1">{product?.name || 'Desconocido'}</td>
                                                <td className="px-2 py-1 text-right">{item.quantityOrdered}</td>
                                                <td className="px-2 py-1 text-right">${item.unitCost.toFixed(2)}</td>
                                                <td className="px-2 py-1 text-right">${(item.quantityOrdered * item.unitCost).toFixed(2)}</td>
                                                <td className="px-1 py-1 text-center">
                                                    <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700 p-0.5" aria-label="Quitar artículo"><TrashIconMini /></button>
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
                    Costo Total del Pedido: ${totalCost.toFixed(2)}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{orderToEdit ? 'Guardar Cambios' : 'Crear Pedido'}</button>
                </div>
            </form>
        </Modal>
    );
};