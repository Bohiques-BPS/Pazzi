
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupplierOrder } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { SupplierOrderFormModal } from './SupplierOrderFormModal';
import { Modal, ConfirmationModal } from '../../components/Modal'; 
import { PlusIcon, EditIcon, EyeIcon, Cog6ToothIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, INPUT_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from '../../hooks/useToast';
import { ReceiveSupplierOrderModal } from '../../components/forms/ReceiveSupplierOrderModal';
import { SupplierPaymentModal } from '../../components/forms/SupplierPaymentModal';
import { PermissionGate } from '../../components/PermissionGate';
import { ArchiveBoxIcon, BanknotesIcon } from '../../components/icons';
import { suppliersService } from '../../services/suppliers';
import {
    supplierOrdersService,
    SUPPLIER_ORDER_MANUAL_STATUSES,
    SUPPLIER_ORDER_FILTER_STATUSES,
    isSupplierOrderReceived,
    displaySupplierOrderStatus,
    supplierOrderReceiveProgress,
    parseSupplierOrderDay,
    apiErrorMessage,
    type SupplierOrderRecord,
} from '../../services/supplierOrders';

interface UpdateStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    onUpdated: (updated: SupplierOrder) => void;
}

/** Fecha de día: el backend la envía como ISO completo ("2026-10-11T00:00:00.000Z"); se toma solo
 *  "YYYY-MM-DD" (a mediodía, para que la zona horaria no la corra un día). */
const fmtDay = (v?: string | null) => {
    const d = parseSupplierOrderDay(v);
    return d ? d.toLocaleDateString('es-ES') : '—';
};

const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({ isOpen, onClose, order, onUpdated }) => {
    const { t } = useTranslation();
    const [newStatus, setNewStatus] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (order && isOpen) {
            // Solo estados manuales; si la orden está en otro, el usuario elige uno.
            setNewStatus((SUPPLIER_ORDER_MANUAL_STATUSES as readonly string[]).includes(order.status) ? order.status : '');
        } else if (!isOpen) {
            setNewStatus('');
        }
    }, [order, isOpen]);

    if (!isOpen || !order) return null;

    // La mercancía ya entró al inventario: el estado solo lo cambia la recepción.
    const locked = isSupplierOrderReceived(order.status);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (locked || !newStatus || newStatus === order.status) { onClose(); return; }
        setSaving(true);
        try {
            const updated = await supplierOrdersService.updateStatus(order.id, newStatus as SupplierOrderRecord['status']);
            onUpdated(updated as unknown as SupplierOrder);
            toast.success(t('ecomx.supplier_orders.status_updated'));
            onClose();
        } catch (error) {
            // 400 USE_RECEIVE / ALREADY_RECEIVED traen un mensaje claro del backend: mostrarlo y NO cerrar.
            const msg = apiErrorMessage(error, t('ecomx.supplier_orders.status_update_error'));
            if (msg) toast.error(msg);
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={t('ecomx.order_status.title', { id: order.id.substring(0,8) })}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
                    {t('ecomx.supplier_orders.select_new_status')}
                </p>
                {locked ? (
                    <div className="my-4 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-sm text-amber-800 dark:text-amber-300">
                        {t('ecomx.supplier_orders.status_locked_received')}
                    </div>
                ) : (
                    <div className="my-4">
                        <label htmlFor="so_status_update" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('ecomx.order_status.new_status')}</label>
                        <select
                            id="so_status_update"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className={inputFormStyle + " w-full"}
                            required
                        >
                            <option value="" disabled>{t('ecomx.supplier_orders.choose_status')}</option>
                            {SUPPLIER_ORDER_MANUAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('ecomx.supplier_orders.status_receive_hint')}</p>
                    </div>
                )}
                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        className={BUTTON_PRIMARY_SM_CLASSES}
                        disabled={locked || saving || !newStatus || newStatus === order.status}
                    >
                        {saving ? t('common.saving') : t('ecomx.order_status.update_btn')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};


export const SupplierOrdersListPage: React.FC = () => {
    const { t } = useTranslation();
    const {
        setSupplierOrders,
        setSuppliers,
        supplierOrders,
    } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
    const [soSearchParams, setSoSearchParams] = useSearchParams();
    const [loadingData, setLoadingData] = useState(false);
    
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [orderForStatusUpdate, setOrderForStatusUpdate] = useState<SupplierOrder | null>(null);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    // M19: recepción y pagos
    const [orderForReceive, setOrderForReceive] = useState<SupplierOrderRecord | null>(null);
    const [orderForPayment, setOrderForPayment] = useState<SupplierOrderRecord | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>('Todos');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoadingData(true);
            try {
                const data = await supplierOrdersService.getAll();
                if (Array.isArray(data)) {
                    setSupplierOrders(data as unknown as SupplierOrder[]);
                }
            } catch (error) {
                console.error("Error al cargar pedidos:", error);
                const msg = apiErrorMessage(error, t('ecomx.common.server_connection_error'));
                if (msg) toast.error(msg);
            } finally {
                setLoadingData(false);
            }
        };
        fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setSupplierOrders]);

    // Los productos NO se cargan aquí: el selector del formulario busca en el servidor
    // (antes se pisaba la lista global de productos con una sola página de 50).

    // Carga de proveedores para el modal
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await suppliersService.getAll();
                if (Array.isArray(data)) {
                    setSuppliers(data as any);
                }
            } catch (error) {
                console.error("Error al cargar proveedores para órdenes:", error);
                toast.error(t('ecomx.suppliers.load_error'));
            }
        };
        fetchSuppliers();
    }, [setSuppliers]);

    const openModalForCreate = () => {
        setEditingOrder(null);
        setShowFormModal(true);
    };
    // Apertura directa del formulario de creación desde "+ Nuevo" del navbar (?new=1).
    useEffect(() => {
        if (soSearchParams.get('new') !== '1') return;
        openModalForCreate();
        soSearchParams.delete('new');
        setSoSearchParams(soSearchParams, { replace: true });
    }, [soSearchParams]); // eslint-disable-line

    const openModalForEdit = (order: SupplierOrder) => {
        setEditingOrder(order);
        setShowFormModal(true);
    };

    const openStatusUpdateModal = (order: SupplierOrder) => {
        setOrderForStatusUpdate(order);
        setShowStatusModal(true);
    };
    
    const handleStatusUpdated = (updated: SupplierOrder) => {
        setSupplierOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    };

    const requestDelete = (orderId: string) => {
        setItemToDeleteId(orderId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        const id = itemToDeleteId;
        setItemToDeleteId(null);
        setShowDeleteConfirmModal(false);
        if (!id) return;
        try {
            await supplierOrdersService.delete(id);
            setSupplierOrders(prev => prev.filter(o => o.id !== id));
            toast.success(t('ecomx.supplier_orders.deleted'));
        } catch (error) {
            // El backend explica por qué no (mercancía recibida o pagos registrados).
            const msg = apiErrorMessage(error, t('ecomx.supplier_orders.delete_error'));
            if (msg) toast.error(msg);
        }
    };

    const filteredOrders = useMemo(() => {
        return supplierOrders
            .filter(order =>
                (statusFilter === 'Todos' || displaySupplierOrderStatus(order.status) === statusFilter)
            )
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [supplierOrders, statusFilter]);


    const columns: TableColumn<SupplierOrder>[] = [
        { header: t('ecommerce.supplier_orders.col.id'), accessor: (order) => order.id.substring(0, 8).toUpperCase() },
        { header: t('ecommerce.supplier_orders.col.supplier'), accessor: (order) => order.supplier?.name || 'N/A' },
        { header: t('ecommerce.supplier_orders.col.date'), accessor: (order) => fmtDay(order.orderDate) },
        { header: t('ecommerce.supplier_orders.col.delivery_date'), accessor: (order) => order.expectedDeliveryDate ? fmtDay(order.expectedDeliveryDate) : 'N/A' },
        { header: t('ecommerce.supplier_orders.col.cost'), accessor: (order) => `$${order.totalCost.toFixed(2)}` },
        { 
            header: t('ecommerce.supplier_orders.col.status'), 
            accessor: (order) => {
                const status = displaySupplierOrderStatus(order.status);
                const progress = supplierOrderReceiveProgress(order);
                return (
                    <div className="flex flex-col gap-1">
                        <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${
                            status === 'Pedido' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                            status === 'Enviado' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-700 dark:text-indigo-100' :
                            status === 'Recibido Completo' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                            status === 'Recibido Parcialmente' ? 'bg-teal-100 text-teal-700 dark:bg-teal-700 dark:text-teal-100' :
                            status === 'Cancelado' ? 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100' // Borrador
                        }`}>{status}</span>
                        {status === 'Recibido Parcialmente' && progress.ordered > 0 && (
                            <div className="w-28" title={t('cmpx.receiveorder.progress', { received: progress.received, ordered: progress.ordered })}>
                                <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                                    <div className="h-full bg-teal-500" style={{ width: `${progress.pct}%` }} />
                                </div>
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{progress.received}/{progress.ordered}</span>
                            </div>
                        )}
                    </div>
                );
            }
        },
    ];

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('ecommerce.supplier_orders.title')}</h1>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end min-w-0">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-shrink-0`}
                        aria-label={t('ecommerce.orders.filter_status')}
                    >
                        <option value="Todos">{t('ecomx.supplier_orders.all_statuses')}</option>
                        {SUPPLIER_ORDER_FILTER_STATUSES.map(status => (
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
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">{t('ecomx.supplier_orders.loading')}</span>
                </div>
            )}

            {!loadingData && (
                <DataTable<SupplierOrder> onRowClick={openModalForEdit}
                    data={filteredOrders}
                    columns={columns}
                    actions={(order) => {
                        // "Recibir" sigue disponible mientras quede algo pendiente (recepción parcial).
                        const isFullyReceived = order.status === 'Recibido Completo' || supplierOrderReceiveProgress(order).pending <= 0;
                        const statusLocked = isSupplierOrderReceived(order.status);
                        const isPaidFull = order.paymentStatus === 'Pagado Completo';
                        return (
                            <div className="flex space-x-1 items-center">
                                <PermissionGate require="supplierOrders.manage">
                                    <button onClick={() => openModalForEdit(order)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" title={t('ecomx.supplier_orders.view_edit')}>
                                        <EditIcon className="w-5 h-5" />
                                    </button>
                                </PermissionGate>
                                <PermissionGate require="supplierOrders.receive">
                                    <button
                                        onClick={() => setOrderForReceive(order as unknown as SupplierOrderRecord)}
                                        className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={isFullyReceived ? t('ecomx.supplier_orders.already_received') : t('ecomx.supplier_orders.receive_title')}
                                        disabled={isFullyReceived || order.status === 'Cancelado'}
                                    >
                                        <ArchiveBoxIcon />
                                    </button>
                                </PermissionGate>
                                <PermissionGate require={['accounts.recordPayment', 'supplierOrders.manage']}>
                                    <button
                                        onClick={() => setOrderForPayment(order as unknown as SupplierOrderRecord)}
                                        className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={isPaidFull ? t('ecomx.supplier_orders.paid_full') : t('ecomx.supplier_orders.register_payment')}
                                        disabled={isPaidFull || order.status === 'Cancelado'}
                                    >
                                        <BanknotesIcon />
                                    </button>
                                </PermissionGate>
                                <PermissionGate require="supplierOrders.manage">
                                    <button
                                        onClick={() => openStatusUpdateModal(order)}
                                        className="text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={statusLocked ? t('ecomx.supplier_orders.status_locked_received') : t('ecomx.supplier_orders.change_status')}
                                        disabled={statusLocked}
                                    >
                                        <Cog6ToothIcon />
                                    </button>
                                </PermissionGate>
                                <PermissionGate require="supplierOrders.manage">
                                    <button onClick={() => requestDelete(order.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" title={t('common.delete')}>
                                        <DeleteIcon className="w-5 h-5" />
                                    </button>
                                </PermissionGate>
                            </div>
                        );
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('ecomx.confirm.delete_title')}
                message={t('confirm.delete.named_item', { item: t('confirm.delete.def.supplier_order'), name: `#${(itemToDeleteId || '').slice(-6).toUpperCase()}` })}
                confirmButtonText={t('ecomx.confirm.delete_yes')}
            />
            <SupplierOrderFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                orderToEdit={editingOrder}
            />
            <UpdateStatusModal
                isOpen={showStatusModal}
                onClose={() => setShowStatusModal(false)}
                order={orderForStatusUpdate}
                onUpdated={handleStatusUpdated}
            />
            <ReceiveSupplierOrderModal
                isOpen={!!orderForReceive}
                onClose={() => setOrderForReceive(null)}
                order={orderForReceive}
                onReceived={(updated) => {
                    setSupplierOrders(prev => prev.map(o => o.id === updated.id ? (updated as unknown as SupplierOrder) : o));
                    setOrderForReceive(null);
                }}
            />
            <SupplierPaymentModal
                isOpen={!!orderForPayment}
                onClose={() => setOrderForPayment(null)}
                order={orderForPayment}
                onPaid={(updated) => {
                    setSupplierOrders(prev => prev.map(o => o.id === updated.id ? (updated as unknown as SupplierOrder) : o));
                    setOrderForPayment(null);
                }}
            />
        </div>
    );
};
