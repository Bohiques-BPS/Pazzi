

import React from 'react';
import { Order, CartItem } from '../../types'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { CreditCardIcon, BanknotesIcon, AthMovilIcon } from '../../components/icons'; // Added icons

interface OrderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ isOpen, onClose, order }) => {
    if (!isOpen || !order) return null;

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const getPaymentMethodIcon = (method: string) => {
        if (method?.toLowerCase().includes('tarjeta')) return <CreditCardIcon className="inline mr-1.5"/>;
        if (method?.toLowerCase().includes('ath móvil')) return <AthMovilIcon className="inline mr-1.5"/>;
        // Could add more specific icons for PayPal
        return <BanknotesIcon className="inline mr-1.5"/>; // Generic for others
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalles del Pedido #${order.id.substring(0, 8)}`} size="xl">
            <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-primary mb-1">Información del Cliente</h3>
                        <p><strong>Nombre:</strong> {order.clientName}</p>
                        <p><strong>Email:</strong> {order.clientEmail}</p>
                        <p><strong>Dirección de Envío:</strong> {order.shippingAddress}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-primary mb-1">Información del Pedido</h3>
                        <p><strong>Fecha:</strong> {new Date(order.date).toLocaleString('es-ES')}</p>
                        <p><strong>Estado:</strong> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100' :
                            order.status === 'Enviado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                            order.status === 'Completado' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                            'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100'
                        }`}>{order.status}</span></p>
                        <p className="flex items-center">
                            <strong className="mr-1">Método de Pago:</strong> 
                            {getPaymentMethodIcon(order.paymentMethod)}
                            {order.paymentMethod || 'No especificado'}
                        </p>
                        <p><strong>Monto Total:</strong> <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(order.totalAmount)}</span></p>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-primary mb-2 pt-3 border-t dark:border-neutral-700">Artículos del Pedido</h3>
                    {order.items.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                                <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Producto</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Cantidad</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Precio Unit.</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                                    {order.items.map((item: CartItem) => (
                                        <tr key={item.id}>
                                            <td className="px-3 py-2 whitespace-nowrap">{item.name}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">{item.quantity}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>No hay artículos en este pedido.</p>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};