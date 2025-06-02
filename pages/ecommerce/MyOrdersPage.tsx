
import React, { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Order } from '../../types';
import { OrderDetailModal } from './OrderDetailModal';
import { EyeIcon } from '../../components/icons';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BUTTON_PRIMARY_CLASSES } from '../../constants';

export const MyOrdersPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { orders } = useData();
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (currentUser) {
            const filtered = orders.filter(o => o.clientEmail === currentUser.email);
            setUserOrders(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    }, [currentUser, orders]);

    const handleOpenDetailModal = (order: Order) => {
        setSelectedOrder(order);
    };

    const handleCloseDetailModal = () => {
        setSelectedOrder(null);
    };

    const columns: TableColumn<Order>[] = [
        { header: 'ID Pedido', accessor: (order) => order.id.substring(0, 8).toUpperCase() },
        { header: 'Fecha', accessor: (order) => new Date(order.date).toLocaleDateString('es-ES') },
        { header: 'Total', accessor: (order) => `$${order.totalAmount.toFixed(2)}` },
        { 
            header: 'Estado', 
            accessor: (order) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100' :
                    order.status === 'Enviado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                    order.status === 'Completado' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                    'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100'
                }`}>{order.status}</span>
            )
        },
    ];

    if (!currentUser) {
        return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Por favor, inicie sesión para ver sus pedidos.</p>;
    }

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Mis Pedidos</h1>
                <RouterLink to="/store" className={`${BUTTON_PRIMARY_CLASSES} mt-3 sm:mt-0 !py-1.5 !px-3 text-sm`}>
                    Ir a la Tienda
                </RouterLink>
            </div>

            {userOrders.length > 0 ? (
                <DataTable<Order>
                    data={userOrders}
                    columns={columns}
                    actions={(order) => (
                        <button 
                            onClick={() => handleOpenDetailModal(order)} 
                            className="text-primary hover:text-secondary p-1"
                            aria-label={`Ver detalles del pedido ${order.id.substring(0,8)}`}
                        >
                            <EyeIcon />
                        </button>
                    )}
                />
            ) : (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                    Aún no has realizado ningún pedido.
                </p>
            )}

            <OrderDetailModal
                isOpen={!!selectedOrder}
                onClose={handleCloseDetailModal}
                order={selectedOrder}
            />
        </div>
    );
};
