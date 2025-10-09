import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../Modal';
import { Sale, CartItem, UserRole } from '../../types';
import { useData } from '../../contexts/DataContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { MagnifyingGlassIcon, TrashIconMini } from '../icons';

interface ReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProcessReturn: (originalSaleId: string, itemsToReturn: CartItem[], reason: string, adminPassword: string) => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onProcessReturn }) => {
    const { sales, getClientById } = useData();
    const [saleIdInput, setSaleIdInput] = useState('');
    const [foundSale, setFoundSale] = useState<Sale | null>(null);
    const [itemsToReturn, setItemsToReturn] = useState<Map<string, CartItem>>(new Map());
    const [reason, setReason] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSaleIdInput('');
            setFoundSale(null);
            setItemsToReturn(new Map());
            setReason('');
            setAdminPassword('');
            setError('');
        }
    }, [isOpen]);

    const handleFindSale = () => {
        setError('');
        setFoundSale(null);
        setItemsToReturn(new Map());
        const sale = sales.find(s => s.id.toLowerCase() === saleIdInput.toLowerCase() || s.id.slice(-6).toUpperCase() === saleIdInput.toUpperCase());
        if (!sale) {
            setError('No se encontró ninguna venta con ese ID.');
            return;
        }
        if (sale.isReturn) {
            setError('No se puede realizar una devolución de otra devolución.');
            return;
        }
        if (sale.paymentStatus === 'Devolución Completa') {
            setError('Esta venta ya ha sido devuelta en su totalidad.');
            return;
        }
        setFoundSale(sale);
    };
    
    const handleToggleItem = (item: CartItem) => {
        const newItems = new Map(itemsToReturn);
        const originalItem = foundSale?.items.find(i => i.id === item.id);
        if (!originalItem) return;

        if (newItems.has(item.id)) {
            newItems.delete(item.id);
        } else {
            newItems.set(item.id, { ...item, quantity: originalItem.quantity });
        }
        setItemsToReturn(newItems);
    };

    const handleQuantityChange = (item: CartItem, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        const originalItem = foundSale?.items.find(i => i.id === item.id);
        if (!originalItem) return;

        const newItems = new Map(itemsToReturn);
        if (!isNaN(newQuantity) && newQuantity > 0 && newQuantity <= originalItem.quantity) {
            newItems.set(item.id, { ...item, quantity: newQuantity });
        } else {
            newItems.delete(item.id);
        }
        setItemsToReturn(newItems);
    };
    
    const handleSelectAll = () => {
        if (!foundSale) return;
        const newItems = new Map<string, CartItem>();
        foundSale.items.forEach(item => {
            newItems.set(item.id, { ...item, quantity: item.quantity });
        });
        setItemsToReturn(newItems);
    };

    const totalRefundAmount = useMemo(() => {
        let total = 0;
        itemsToReturn.forEach(item => {
            let itemPrice = item.unitPrice;
             if (item.discount) {
                if (item.discount.type === 'percentage') {
                    itemPrice *= (1 - item.discount.value / 100);
                } else {
                    itemPrice = Math.max(0, itemPrice - item.discount.value);
                }
            }
            total += itemPrice * item.quantity;
        });
        return total;
    }, [itemsToReturn]);

    const handleSubmit = () => {
        if (!foundSale || itemsToReturn.size === 0 || !adminPassword) {
            setError('Por favor, complete todos los campos: encuentre una venta, seleccione artículos, y ingrese la contraseña de admin.');
            return;
        }
        onProcessReturn(foundSale.id, Array.from(itemsToReturn.values()), reason, adminPassword);
    };

    const client = foundSale ? getClientById(foundSale.clientId || '') : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Procesar Devolución" size="3xl">
            <div className="space-y-4">
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="text-sm font-medium">ID de Venta Original</label>
                        <input type="text" value={saleIdInput} onChange={e => setSaleIdInput(e.target.value)} placeholder="Ingrese ID de venta completo o últimos 6 dígitos" className={inputFormStyle} />
                    </div>
                    <button onClick={handleFindSale} className={BUTTON_SECONDARY_SM_CLASSES}>
                        <MagnifyingGlassIcon className="w-4 h-4 mr-1.5"/> Buscar Venta
                    </button>
                </div>
                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                
                {foundSale && (
                    <div className="space-y-4 pt-4 border-t dark:border-neutral-600">
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-md text-sm">
                            <p><strong>Venta encontrada:</strong> {foundSale.id}</p>
                            <p><strong>Fecha:</strong> {new Date(foundSale.date).toLocaleString()}</p>
                            <p><strong>Cliente:</strong> {client ? `${client.name} ${client.lastName}` : 'Cliente Contado'}</p>
                            <p><strong>Total Original:</strong> ${foundSale.totalAmount.toFixed(2)}</p>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">Seleccione los artículos a devolver:</h3>
                                <button onClick={handleSelectAll} className={BUTTON_SECONDARY_SM_CLASSES}>Seleccionar Todo</button>
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 border dark:border-neutral-600 p-2 rounded-md">
                                {foundSale.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 p-2 bg-white dark:bg-neutral-700 rounded shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={itemsToReturn.has(item.id)}
                                            onChange={() => handleToggleItem(item)}
                                            className="form-checkbox h-5 w-5 text-primary rounded border-neutral-300 focus:ring-primary"
                                        />
                                        <div className="flex-grow">
                                            <p className="font-medium text-sm">{item.name}</p>
                                            <p className="text-xs text-neutral-500">Comprado: {item.quantity} @ ${item.unitPrice.toFixed(2)} c/u</p>
                                        </div>
                                        <input
                                            type="number"
                                            value={itemsToReturn.get(item.id)?.quantity || ''}
                                            onChange={e => handleQuantityChange(item, e.target.value)}
                                            disabled={!itemsToReturn.has(item.id)}
                                            max={item.quantity}
                                            min="1"
                                            className={`${inputFormStyle} !text-sm w-20 text-center disabled:bg-neutral-100 dark:disabled:bg-neutral-800`}
                                            placeholder="Cant."
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-right text-xl font-bold text-red-600 dark:text-red-400">
                            Total a Reembolsar: ${totalRefundAmount.toFixed(2)}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Razón de la Devolución (Opcional)</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className={inputFormStyle} />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Contraseña de Administrador para Autorizar</label>
                            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={inputFormStyle} required />
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4 border-t dark:border-neutral-600">
                            <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                            <button onClick={handleSubmit} className={BUTTON_PRIMARY_SM_CLASSES}>Procesar Devolución</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
