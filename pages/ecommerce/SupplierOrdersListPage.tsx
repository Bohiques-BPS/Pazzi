
import React, { useState, useMemo, useEffect } from 'react';
import { SupplierOrder, SupplierOrderStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { SupplierOrderFormModal } from './SupplierOrderFormModal';
import { Modal } from '../../components/Modal'; 
import { PlusIcon, EditIcon, EyeIcon, Cog6ToothIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, INPUT_SM_CLASSES, SUPPLIER_ORDER_STATUS_OPTIONS, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';

interface UpdateStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    onUpdate: (orderId: string, newStatus: SupplierOrderStatus) => void;
}

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({ isOpen, onClose, order, onUpdate }) => {
    const [newStatus, setNewStatus] = useState<SupplierOrderStatus | ''>('');

    useEffect(() => {
        if (order && isOpen) {
            setNewStatus(order.status);
        } else if (!isOpen) {
            setNewStatus(''); 
        }
    }, [order, isOpen]);

    if (!isOpen || !order) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatus && newStatus !== order.status) {
            onUpdate(order.id, newStatus);
        }
        onClose();
    };
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Actualizar Estado Pedido #${order.id.substring(0,8)}`}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
                    Seleccione el nuevo estado para el pedido.
                </p>
                <div className="my-4">
                    <label htmlFor="so_status_update" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nuevo Estado</label>
                    <select 
                        id="so_status_update"
                        value={newStatus} 
                        onChange={(e) => setNewStatus(e.target.value as SupplierOrderStatus)}
                        className={inputFormStyle + " w-full"}
                        required
                    >
                        <option value="" disabled>Seleccione un estado</option>
                        {SUPPLIER_ORDER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className={BUTTON_PRIMARY_SM_CLASSES} 
                        disabled={!newStatus || (order && newStatus === order.status)}
                    >
                        Actualizar Estado
                    </button>
                </div>
            </form>
        </Modal>
    );
};


export const SupplierOrdersListPage: React.FC = () => {
    const { supplierOrders, getSupplierById, updateSupplierOrderStatus } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
    
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [orderForStatusUpdate, setOrderForStatusUpdate] = useState<SupplierOrder | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | 'Todos'>('Todos');


    const openModalForCreate = () => {
        setEditingOrder(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (order: SupplierOrder) => {
        setEditingOrder(order);
        setShowFormModal(true);
    };

    const openStatusUpdateModal = (order: SupplierOrder) => {
        setOrderForStatusUpdate(order);
        setShowStatusModal(true);
    };
    
    const handleUpdateStatus = (orderId: string, newStatus: SupplierOrderStatus) => {
        updateSupplierOrderStatus(orderId, newStatus);
        setShowStatusModal(false);
    };

    const filteredOrders = useMemo(() => {
        return supplierOrders
            .filter(order => 
                (order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (getSupplierById(order.supplierId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'Todos' || order.status === statusFilter)
            )
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [supplierOrders, searchTerm, statusFilter, getSupplierById]);


    const columns: TableColumn<SupplierOrder>[] = [
        { header: 'ID Pedido', accessor: (order) => order.id.substring(0, 8).toUpperCase() },
        { header: 'Proveedor', accessor: (order) => getSupplierById(order.supplierId)?.name || 'N/A' },
        { header: 'Fecha Pedido', accessor: (order) => new Date(order.orderDate + 'T00:00:00').toLocaleDateString('es-ES') },
        { header: 'F. Entrega Est.', accessor: (order) => order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A' },
        { header: 'Costo Total', accessor: (order) => `$${order.totalCost.toFixed(2)}` },
        { 
            header: 'Estado', 
            accessor: (order) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'Pedido' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                    order.status === 'Enviado' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100' :
                    order.status === 'Recibido Completo' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                    order.status === 'Cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100' // Borrador, Recibido Parcialmente
                }`}>{order.status}</span>
            )
        },
    ];

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Pedidos a Proveedores</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                     <input
                        type="text"
                        placeholder="Buscar por ID, proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label="Buscar pedidos a proveedor"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SupplierOrderStatus | 'Todos')}
                        className={`${INPUT_SM_CLASSES} flex-shrink-0`}
                        aria-label="Filtrar por estado de pedido"
                    >
                        <option value="Todos">Todos los Estados</option>
                        {SUPPLIER_ORDER_STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                        <PlusIcon /> Crear Pedido
                    </button>
                </div>
            </div>
            <DataTable<SupplierOrder>
                data={filteredOrders}
                columns={columns}
                actions={(order) => (
                    <div className="flex space-x-2">
                        <button onClick={() => openModalForEdit(order)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Ver/Editar Pedido ${order.id.substring(0,8)}`}>
                            <EyeIcon /> {/* Using Eye for View/Edit combo */}
                        </button>
                         <button onClick={() => openStatusUpdateModal(order)} className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1" aria-label={`Actualizar Estado Pedido ${order.id.substring(0,8)}`}>
                            <Cog6ToothIcon />
                        </button>
                    </div>
                )}
            />
            <SupplierOrderFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} orderToEdit={editingOrder} />
            <UpdateStatusModal 
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                order={orderForStatusUpdate}
                onUpdate={handleUpdateStatus}
            />
        </div>
    );
};
