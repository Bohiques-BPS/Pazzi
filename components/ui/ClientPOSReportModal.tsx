
import React from 'react';
import { Modal } from '../Modal'; 
import { Sale, Product } from '../../types';
import { useData } from '../../contexts/DataContext';

interface ClientPOSReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    monthSales: Sale[];
}

export const ClientPOSReportModal: React.FC<ClientPOSReportModalProps> = ({ isOpen, onClose, clientId, monthSales }) => {
    const { getClientById, getProductById } = useData();
    const client = getClientById(clientId);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reporte de Ventas POS para ${client?.name || 'Cliente'} (Este Mes)`} size="xl">
            {monthSales.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {monthSales.map(sale => (
                        <div key={sale.id} className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md shadow-sm">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-primary">Venta ID: {sale.id.substring(0,8)}</h4>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(sale.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300">Total Venta: <span className="font-medium">${sale.totalAmount.toFixed(2)}</span></p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300">Método de Pago: {sale.paymentMethod}</p>
                            <details className="mt-1 text-xs">
                                <summary className="cursor-pointer text-primary hover:underline">Ver Artículos ({sale.items.length})</summary>
                                <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-neutral-500 dark:text-neutral-400">
                                    {sale.items.map(item => {
                                        const product = getProductById(item.id);
                                        return (
                                            <li key={`${sale.id}-${item.id}`}>
                                                {product?.name || item.name} - Cant: {item.quantity} - Precio U: ${item.unitPrice.toFixed(2)}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </details>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">No hay ventas registradas para este cliente este mes.</p>
            )}
             <div className="mt-4 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 text-sm bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 rounded-md">Cerrar</button>
            </div>
        </Modal>
    );
};
