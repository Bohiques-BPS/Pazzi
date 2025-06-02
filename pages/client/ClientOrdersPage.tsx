
import React, { useState, useMemo, useEffect } from 'react';
import { Order } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth }  from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { EyeIcon, Cog6ToothIcon } from '../../components/icons';
import { OrderDetailModal } from '../ecommerce/OrderDetailModal'; // Reusing admin detail modal
import { OrderStatusUpdateModal } from '../ecommerce/OrderStatusUpdateModal'; // Reusing admin status modal
import { INPUT_SM_CLASSES } from '../../constants';

export const ClientOrdersPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { orders, getOrdersByStoreOwner, updateOrderStatus: updateContextOrderStatus } = useData();
    
    const [clientOrders, setClientOrders] = useState<Order[]>([]);
    
    useEffect(() => {
        if (currentUser) {
            setClientOrders(getOrdersByStoreOwner(currentUser.id));
        }
    }, [currentUser, orders, getOrdersByStoreOwner]);

    const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
    const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Order['status'] | 'Todos'>('Todos');

    const orderStatusOptions: (Order['status'] | 'Todos')[] = ['Todos', 'Pendiente', 'Enviado', 'Completado', 'Cancelado'];

    const filteredOrders = useMemo(() => {
        return clientOrders
            .filter(order => 
                (order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 order.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 order.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'Todos' || order.status === statusFilter)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [clientOrders, searchTerm, statusFilter]);

    const handleOpenDetailModal = (order: Order) => setSelectedOrderForDetail(order);
    const handleCloseDetailModal = () => setSelectedOrderForDetail(null);

    const handleOpenStatusModal = (order: Order) => setSelectedOrderForStatus(order);
    const handleCloseStatusModal = () => setSelectedOrderForStatus(null);
    
    const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
        // Ensure the order belongs to the current client before updating
        if (currentUser && clientOrders.find(o => o.id === orderId && o.storeOwnerId === currentUser.id)) {
            updateContextOrderStatus(orderId, newStatus);
            // Optionally, refresh data or show a success message
        } else {
            alert("No tienes permiso para actualizar este pedido.");
        }
    };

    const columns: TableColumn<Order>[] = [
        { header: 'ID Pedido', accessor: (order) => order.id.substring(0, 8).toUpperCase() },
        { header: 'Fecha', accessor: (order) => new Date(order.date).toLocaleDateString('es-ES') },
        { header: 'Cliente Comprador', accessor: 'clientName' },
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
        return <p className="p-6 text-center">Inicia sesión para ver los pedidos de tu tienda.</p>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Pedidos de Mi Tienda</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar por ID, comprador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label="Buscar pedidos de mi tienda"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as Order['status'] | 'Todos')}
                        className={`${INPUT_SM_CLASSES} flex-shrink-0`}
                        aria-label="Filtrar por estado de pedido"
                    >
                        {orderStatusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <DataTable<Order>
                data={filteredOrders}
                columns={columns}
                actions={(order) => (
                    <div className="flex space-x-2">
                        <button onClick={() => handleOpenDetailModal(order)} className="text-primary hover:text-secondary p-1" aria-label={`Ver detalles de pedido ${order.id.substring(0,8)}`}>
                            <EyeIcon />
                        </button>
                        <button onClick={() => handleOpenStatusModal(order)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Actualizar estado de pedido ${order.id.substring(0,8)}`}>
                            <Cog6ToothIcon />
                        </button>
                    </div>
                )}
            />

            <OrderDetailModal 
                isOpen={!!selectedOrderForDetail}
                onClose={handleCloseDetailModal}
                order={selectedOrderForDetail}
            />
            <OrderStatusUpdateModal
                isOpen={!!selectedOrderForStatus}
                onClose={handleCloseStatusModal}
                order={selectedOrderForStatus}
                onUpdateStatus={handleUpdateStatus}
            />
        </div>
    );
};
