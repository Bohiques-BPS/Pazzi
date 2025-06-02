import React, { useState, useEffect } from 'react';
import { Order } from '../../types'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path

interface OrderStatusUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onUpdateStatus: (orderId: string, newStatus: Order['status']) => void;
}

export const OrderStatusUpdateModal: React.FC<OrderStatusUpdateModalProps> = ({ isOpen, onClose, order, onUpdateStatus }) => {
    const [newStatus, setNewStatus] = useState<Order['status'] | ''>('');

    useEffect(() => {
        if (order) {
            setNewStatus(order.status);
        } else {
            setNewStatus('');
        }
    }, [order, isOpen]);

    if (!isOpen || !order) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatus && newStatus !== order.status) {
            onUpdateStatus(order.id, newStatus);
        }
        onClose();
    };

    const orderStatusOptions: Order['status'][] = ['Pendiente', 'Enviado', 'Completado', 'Cancelado'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Actualizar Estado Pedido #${order.id.substring(0,8)}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    Estado actual: <span className="font-semibold">{order.status}</span>
                </p>
                <div>
                    <label htmlFor="newStatus" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        Nuevo Estado
                    </label>
                    <select
                        id="newStatus"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as Order['status'])}
                        className={inputFormStyle}
                        required
                    >
                        {orderStatusOptions.map(statusOpt => (
                            <option key={statusOpt} value={statusOpt}>{statusOpt}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>
                        Cancelar
                    </button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={!newStatus || newStatus === order.status}>
                        Actualizar Estado
                    </button>
                </div>
            </form>
        </Modal>
    );
};
