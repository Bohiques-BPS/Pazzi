
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { SupplierOrder, SupplierOrderStatus, Product as ProductType, Supplier } from '../../types';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { PrinterIcon, BanknotesIcon, EditIcon, TrashIconMini as CancelIcon, PhotoIcon, DocumentArrowUpIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '../../components/icons';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { SupplierOrderFormModal } from '../ecommerce/SupplierOrderFormModal';

// ... (Keep RecordPaymentModal as is) ...
interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    onRecordPayment: (orderId: string, amount: number, invoiceRef?: string, attachment?: string) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, order, onRecordPayment }) => {
    const { getSupplierById } = useData();
    const [amountPaidInput, setAmountPaidInput] = useState<string>('');
    const [invoiceRefInput, setInvoiceRefInput] = useState<string>('');
    const [attachment, setAttachment] = useState<string | undefined>(undefined);
    const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const remainingBalance = useMemo(() => {
        if (!order) return 0;
        return order.totalCost - (order.amountPaid || 0);
    }, [order]);

    useEffect(() => {
        if (isOpen && order) {
            setAmountPaidInput(remainingBalance > 0 ? remainingBalance.toFixed(2) : ''); 
            setInvoiceRefInput('');
            setAttachment(undefined);
            setAttachmentName(undefined);
        }
    }, [isOpen, order, remainingBalance]);

    if (!isOpen || !order) return null;
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment(reader.result as string);
                setAttachmentName(file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amountPaidInput);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, ingrese un monto de pago válido.");
            return;
        }
        if (amount > remainingBalance + 0.001) { // Epsilon for float issues
            alert(`El monto pagado ($${amount.toFixed(2)}) no puede exceder el saldo pendiente ($${remainingBalance.toFixed(2)}).`);
            return;
        }
        onRecordPayment(order.id, amount, invoiceRefInput, attachment);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Pago para Pedido #${order.id.substring(0,8)}`} size="md">
            <form onSubmit={handleSubmitPayment} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Pedido a: {getSupplierById(order.supplierId)?.name || order.supplierId} <br/>
                    Total Pedido: ${order.totalCost.toFixed(2)} <br/>
                    Pagado Hasta Ahora: ${(order.amountPaid || 0).toFixed(2)} <br/>
                    <strong className="text-primary">Saldo Pendiente: ${remainingBalance.toFixed(2)}</strong>
                </p>
                <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Monto a Pagar</label>
                    <input
                        type="number" id="paymentAmount" value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className={inputFormStyle} placeholder={`Máx. ${remainingBalance.toFixed(2)}`}
                        min="0.01" step="0.01" max={remainingBalance.toFixed(2)} required autoFocus
                    />
                </div>
                 <div>
                    <label htmlFor="invoiceRef" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nº de Factura (Opcional)</label>
                    <input
                        type="text" id="invoiceRef" value={invoiceRefInput}
                        onChange={(e) => setInvoiceRefInput(e.target.value)}
                        className={inputFormStyle} placeholder="Ej: F-12345"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Adjuntar Comprobante (Opcional)</label>
                    <div className="mt-1 flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                        >
                            <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                            Seleccionar archivo...
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf"
                        />
                        {attachmentName && (
                            <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-300">
                                <PhotoIcon className="w-4 h-4 text-green-500"/>
                                <span className="truncate max-w-xs">{attachmentName}</span>
                                <button type="button" onClick={() => {setAttachment(undefined); setAttachmentName(undefined); if(fileInputRef.current) fileInputRef.current.value = '';}} className="text-red-500 text-xs">X</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Registrar Pago</button>
                </div>
            </form>
        </Modal>
    );
};


export const AccountsPayablePage: React.FC = () => {
    const { supplierOrders, getSupplierById, suppliers, recordSupplierOrderPayment, updateSupplierOrderStatus } = useData();
    const { getDefaultSettings } = useECommerceSettings();

    const [paymentModalOrder, setPaymentModalOrder] = useState<SupplierOrder | null>(null);
    const [showEditOrderModal, setShowEditOrderModal] = useState(false);
    const [orderToEdit, setOrderToEdit] = useState<SupplierOrder | null>(null);
    const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
    const [orderToCancelId, setOrderToCancelId] = useState<string | null>(null);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<'Pendientes' | 'Pagado Completo' | 'Todas'>('Pendientes');
    const [supplierFilterId, setSupplierFilterId] = useState<string | null>(null);
    const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | '7days' | '30days' | 'plus30'>('all');

    // Autocomplete Logic for Suppliers
    const [supplierSearchInput, setSupplierSearchInput] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const supplierInputRef = useRef<HTMLInputElement>(null);

    const supplierSuggestions = useMemo(() => {
        if (!supplierSearchInput) return suppliers.slice(0, 10);
        const lower = supplierSearchInput.toLowerCase();
        return suppliers.filter(s => s.name.toLowerCase().includes(lower)).slice(0, 10);
    }, [suppliers, supplierSearchInput]);

    const handleSelectSupplier = (supplier: Supplier) => {
        setSupplierFilterId(supplier.id);
        setSupplierSearchInput(supplier.name);
        setIsSupplierDropdownOpen(false);
    };

    const clearSupplierFilter = () => {
        setSupplierFilterId(null);
        setSupplierSearchInput('');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (supplierInputRef.current && !supplierInputRef.current.contains(event.target as Node)) {
                setIsSupplierDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRowExpansion = (orderId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const filteredOrders = useMemo(() => {
        let orders = supplierOrders.filter(o => o.status !== SupplierOrderStatus.CANCELADO);
        
        // 1. Status Filter
        if (statusFilter === 'Pendientes') {
            orders = orders.filter(o => o.paymentStatus !== 'Pagado Completo');
        } else if (statusFilter === 'Pagado Completo') {
            orders = orders.filter(o => o.paymentStatus === 'Pagado Completo');
        }

        // 2. Supplier Filter (Using Autocomplete ID)
        if (supplierFilterId) {
            orders = orders.filter(o => o.supplierId === supplierFilterId);
        }

        // 3. Due Date Filter (Assuming Net 30 for "Due Date")
        if (dueFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            orders = orders.filter(o => {
                const orderDate = new Date(o.orderDate + 'T00:00:00');
                // Assume Net 30 for calculation
                const dueDate = new Date(orderDate);
                dueDate.setDate(dueDate.getDate() + 30); 
                dueDate.setHours(0,0,0,0);

                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                switch (dueFilter) {
                    case 'overdue': return diffDays < 0;
                    case 'today': return diffDays === 0;
                    case '7days': return diffDays >= 0 && diffDays <= 7;
                    case '30days': return diffDays >= 0 && diffDays <= 30;
                    case 'plus30': return diffDays > 30;
                    default: return true;
                }
            });
        }

        return orders.map(o => ({
            ...o,
            balance: o.totalCost - o.amountPaid
        })).sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
    }, [supplierOrders, statusFilter, supplierFilterId, dueFilter]);

    const handleEditOrder = (order: SupplierOrder) => { setOrderToEdit(order); setShowEditOrderModal(true); };
    const handleCancelOrder = (orderId: string) => { setOrderToCancelId(orderId); setShowCancelConfirmModal(true); };
    const confirmCancelOrder = () => { if (orderToCancelId) { updateSupplierOrderStatus(orderToCancelId, SupplierOrderStatus.CANCELADO); } setOrderToCancelId(null); setShowCancelConfirmModal(false); };
    
    const generatePayablePDF = async (order: SupplierOrder) => {
        alert(`Generando PDF para pedido #${order.id.slice(0,8)}...`);
    };

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                 <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Cuentas por Pagar</h1>
                 <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <select id="apStatusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="Pendientes">Pendientes</option>
                            <option value="Pagado Completo">Pagado Completo</option>
                            <option value="Todas">Todas</option>
                        </select>

                        {/* Supplier Autocomplete Filter */}
                        <div className="relative" ref={supplierInputRef}>
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Filtrar por Proveedor..."
                                    value={supplierSearchInput}
                                    onChange={(e) => { setSupplierSearchInput(e.target.value); if(e.target.value === '') setSupplierFilterId(null); }}
                                    onFocus={() => setIsSupplierDropdownOpen(true)}
                                    className={`${INPUT_SM_CLASSES} pr-8 w-full sm:w-64`}
                                />
                                {supplierSearchInput && (
                                    <button 
                                        onClick={clearSupplierFilter}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {isSupplierDropdownOpen && (
                                <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    <li 
                                        onClick={() => { clearSupplierFilter(); setIsSupplierDropdownOpen(false); }}
                                        className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm"
                                    >
                                        Todos los Proveedores
                                    </li>
                                    {supplierSuggestions.map(s => (
                                        <li 
                                            key={s.id}
                                            onClick={() => handleSelectSupplier(s)}
                                            className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm"
                                        >
                                            {s.name}
                                        </li>
                                    ))}
                                    {supplierSuggestions.length === 0 && (
                                        <li className="px-3 py-2 text-neutral-500 text-sm">No se encontraron proveedores.</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        <select value={dueFilter} onChange={e => setDueFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="all">Vencimiento (Net 30): Todos</option>
                            <option value="overdue">Vencidas</option>
                            <option value="today">Vence Hoy</option>
                            <option value="7days">Próx. 7 Días</option>
                            <option value="30days">Próx. 30 Días</option>
                            <option value="plus30">+30 Días</option>
                        </select>
                    </div>
                </div>
            </div>
             <div className="overflow-x-auto bg-white dark:bg-neutral-800 shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-700">
                        <tr>
                            <th scope="col" className="w-12 px-4 py-2"></th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">ID Pedido</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Proveedor</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Fecha Pedido</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Costo Total</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Monto Pagado</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Saldo Pendiente</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Estado Pago</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {filteredOrders.length > 0 ? filteredOrders.map(order => {
                            const isExpanded = expandedRows.has(order.id);
                            const paymentNotesParsed = (order.paymentNotes || []).map(note => {
                                try {
                                    return JSON.parse(note);
                                } catch (e) {
                                    return { d: 'Error de formato', p: '0', i: note, a: null };
                                }
                            });
                            return (
                                <React.Fragment key={order.id}>
                                    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                                        <td className="px-4 py-2">
                                            {paymentNotesParsed.length > 0 && (
                                                <button onClick={() => toggleRowExpansion(order.id)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                                    {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{order.id.substring(0, 8).toUpperCase()}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{getSupplierById(order.supplierId)?.name || 'N/A'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{new Date(order.orderDate + 'T00:00:00').toLocaleDateString()}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${order.totalCost.toFixed(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${order.amountPaid.toFixed(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base"><span className="font-semibold text-red-600 dark:text-red-400">${order.balance.toFixed(2)}</span></td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{order.paymentStatus}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base font-medium">
                                            <div className="flex space-x-1">
                                                <button onClick={() => handleEditOrder(order)} className="text-blue-500 p-1" title="Editar Pedido"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => generatePayablePDF(order)} className="text-blue-500 p-1" title="Imprimir Estado de Cuenta"><PrinterIcon className="w-4 h-4" /></button>
                                                <button onClick={() => setPaymentModalOrder(order)} className="text-green-500 p-1" title="Registrar Pago" disabled={order.balance <= 0}><BanknotesIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleCancelOrder(order.id)} className="text-red-500 p-1" title="Cancelar Pedido" disabled={order.status === SupplierOrderStatus.RECIBIDO_COMPLETO}><CancelIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && paymentNotesParsed.length > 0 && (
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <td colSpan={9} className="p-3">
                                                <h4 className="text-sm font-semibold mb-2 text-neutral-600 dark:text-neutral-300">Historial de Pagos</h4>
                                                <table className="min-w-full bg-white dark:bg-neutral-800 rounded-md">
                                                    <thead className="bg-neutral-100 dark:bg-neutral-700 text-xs uppercase">
                                                        <tr>
                                                            <th className="px-3 py-1.5 text-left">Fecha</th>
                                                            <th className="px-3 py-1.5 text-right">Monto</th>
                                                            <th className="px-3 py-1.5 text-left">Ref. Factura</th>
                                                            <th className="px-3 py-1.5 text-center">Adjunto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paymentNotesParsed.map((payment, index) => (
                                                            <tr key={index} className="border-t dark:border-neutral-700 text-sm">
                                                                <td className="px-3 py-1.5">{payment.d}</td>
                                                                <td className="px-3 py-1.5 text-right font-medium">${parseFloat(payment.p).toFixed(2)}</td>
                                                                <td className="px-3 py-1.5">{payment.i || 'N/A'}</td>
                                                                <td className="px-3 py-1.5 text-center">
                                                                    {payment.a ? (
                                                                        <a href={payment.a} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-500 hover:text-blue-600" title="Ver adjunto">
                                                                            <PhotoIcon className="w-5 h-5" />
                                                                        </a>
                                                                    ) : 'No'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        }) : (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                                    No se encontraron cuentas por pagar con los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <RecordPaymentModal isOpen={!!paymentModalOrder} onClose={() => setPaymentModalOrder(null)} order={paymentModalOrder} onRecordPayment={recordSupplierOrderPayment}/>
            <SupplierOrderFormModal isOpen={showEditOrderModal} onClose={() => setShowEditOrderModal(false)} orderToEdit={orderToEdit} />
            {orderToCancelId && <ConfirmationModal isOpen={showCancelConfirmModal} onClose={() => setShowCancelConfirmModal(false)} onConfirm={confirmCancelOrder} title="Confirmar Cancelación" message={`¿Seguro que desea cancelar el pedido PO-${orderToCancelId.slice(-6).toUpperCase()}?`} confirmButtonText="Sí, Cancelar Pedido" />}
        </div>
    );
};
