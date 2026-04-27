
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SupplierOrder, SupplierOrderStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { SupplierOrderFormModal } from './SupplierOrderFormModal';
import { Modal, ConfirmationModal } from '../../components/Modal'; 
import { PlusIcon, EditIcon, EyeIcon, Cog6ToothIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, INPUT_SM_CLASSES, SUPPLIER_ORDER_STATUS_OPTIONS, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle, ADMIN_USER_ID } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';

interface UpdateStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    onUpdate: (orderId: string, newStatus: SupplierOrderStatus) => void;
}

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({ isOpen, onClose, order, onUpdate }) => {
    const { t } = useTranslation();
    const [newStatus, setNewStatus] = useState<SupplierOrderStatus | ''>('');

    useEffect(() => {
        if (order && isOpen) {
            setNewStatus(order.status);
        } else if (!isOpen) {
            setNewStatus(''); 
        }
    }, [order, isOpen]);

    if (!isOpen || !order) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatus && newStatus !== order.status) {
            try {
                const response = await fetch(`http://localhost:3001/api/supplier-orders/${order.id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                if (response.ok) {
                    const updated = await response.json();
                    onUpdate(order.id, updated.status);
                    toast.success("Estado actualizado");
                }
            } catch (error) {
                console.error("Error updating status:", error);
            }
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
                        {t('common.cancel')}
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
    const { t } = useTranslation();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { 
        setSupplierOrders, 
        setProducts,
        setSuppliers,
        supplierOrders, 
        updateSupplierOrderStatus, 
        getSupplierOrdersByStoreOwner 
    } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [orderForStatusUpdate, setOrderForStatusUpdate] = useState<SupplierOrder | null>(null);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | 'Todos'>('Todos');

    const isTiendaModule = location.pathname.startsWith('/tienda');
    const storeOwnerId = isTiendaModule ? ADMIN_USER_ID : currentUser?.id;

    useEffect(() => {
        const fetchOrders = async () => {
            setLoadingData(true);
            try {
                const response = await fetch('http://localhost:3001/api/supplier-orders', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setSupplierOrders(data);
                }
            } catch (error) {
                console.error("Error al cargar pedidos:", error);
                toast.error("Error al conectar con el servidor");
            } finally {
                setLoadingData(false);
            }
        };
        fetchOrders();
    }, [setSupplierOrders]);

    // Carga de productos para que aparezcan en el modal de creación
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/products', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    const normalized = data.map((p: any) => ({
                        ...p,
                        category: typeof p.category === 'object' ? p.category.name : p.category,
                        skus: Array.isArray(p.skus) ? p.skus.map((s: any) => typeof s === 'string' ? s : s.sku) : [],
                        customSpecifications: p.customSpecs || []
                    }));
                    setProducts(normalized);
                }
            } catch (error) {
                console.error("Error al cargar productos para órdenes:", error);
            }
        };
        fetchProducts();
    }, [setProducts]);

    // Carga de proveedores para el modal
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/suppliers', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setSuppliers(data);
                }
            } catch (error) {
                console.error("Error al cargar proveedores para órdenes:", error);
            }
        };
        fetchSuppliers();
    }, [setSuppliers]);

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

    const requestDelete = (orderId: string) => {
        setItemToDeleteId(orderId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (itemToDeleteId) {
            try {
                const response = await fetch(`http://localhost:3001/api/supplier-orders/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                if (response.ok) {
                    setSupplierOrders(prev => prev.filter(o => o.id !== itemToDeleteId));
                    toast.success("Pedido eliminado");
                } else {
                    toast.error("No se pudo eliminar el pedido");
                }
            } catch (error) {
                console.error("Error deleting order:", error);
            } finally {
                setItemToDeleteId(null);
                setShowDeleteConfirmModal(false);
            }
        }
    };

    const filteredOrders = useMemo(() => {
        if (!storeOwnerId) return [];
        const ordersByOwner = getSupplierOrdersByStoreOwner(storeOwnerId);
        return ordersByOwner
            .filter(order => 
                (order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'Todos' || order.status === statusFilter)
            )
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [getSupplierOrdersByStoreOwner, storeOwnerId, searchTerm, statusFilter]);


    const columns: TableColumn<SupplierOrder>[] = [
        { header: t('ecommerce.supplier_orders.col.id'), accessor: (order) => order.id.substring(0, 8).toUpperCase() },
        { header: t('ecommerce.supplier_orders.col.supplier'), accessor: (order) => order.supplier?.name || 'N/A' },
        { header: t('ecommerce.supplier_orders.col.date'), accessor: (order) => new Date(order.orderDate + 'T00:00:00').toLocaleDateString('es-ES') },
        { header: t('ecommerce.supplier_orders.col.delivery_date'), accessor: (order) => order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A' },
        { header: t('ecommerce.supplier_orders.col.cost'), accessor: (order) => `$${order.totalCost.toFixed(2)}` },
        { 
            header: t('ecommerce.supplier_orders.col.status'), 
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
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('ecommerce.supplier_orders.title')}</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                     <input
                        type="text"
                        placeholder={t('ecommerce.supplier_orders.search_placeholder')}
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
                        <PlusIcon /> {t('ecommerce.supplier_orders.create')}
                    </button>
                </div>
            </div>
            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando pedidos...</span>
                </div>
            )}

            {!loadingData && (
                <DataTable<SupplierOrder>
                    data={filteredOrders}
                    columns={columns}
                    actions={(order) => (
                        <div className="flex space-x-2">
                            <button onClick={() => openModalForEdit(order)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" title="Ver/Editar">
                                <EditIcon />
                            </button>
                            <button onClick={() => openStatusUpdateModal(order)} className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1" title="Estado">
                                <Cog6ToothIcon />
                            </button>
                            <button onClick={() => requestDelete(order.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" title="Eliminar">
                                <DeleteIcon />
                            </button>
                        </div>
                    )}
                />
            )}

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
            <SupplierOrderFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                orderToEdit={editingOrder} 
                storeOwnerId={storeOwnerId}
            />
            <UpdateStatusModal 
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                order={orderForStatusUpdate}
                onUpdate={handleUpdateStatus}
            />
        </div>
    );
};
