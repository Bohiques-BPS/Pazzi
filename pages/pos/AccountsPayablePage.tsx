
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSortableRows, usePagination, SortableTh, PaginationFooter, useColumnChooser, ColumnChooserButton } from '../../components/ui/tableTools';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { SupplierOrder, SupplierOrderStatus, Product as ProductType, Supplier } from '../../types';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { PrinterIcon, BanknotesIcon, EditIcon, TrashIconMini as CancelIcon, PhotoIcon, DocumentArrowUpIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '../../components/icons';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { SupplierOrderFormModal } from '../ecommerce/SupplierOrderFormModal';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

// ... (Keep RecordPaymentModal as is) ...
interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    onRecordPayment: (orderId: string, amount: number, invoiceRef?: string, attachment?: string) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, order, onRecordPayment }) => {
    const { getSupplierById } = useData();
    const { t } = useTranslation();
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
            toast.error(t('posx.payable.invalidAmount'));
            return;
        }
        if (amount > remainingBalance + 0.001) {
            toast.error(t('posx.payable.amountExceedsBalance', { amount: amount.toFixed(2), balance: remainingBalance.toFixed(2) }));
            return;
        }
        onRecordPayment(order.id, amount, invoiceRefInput, attachment);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('posx.payable.recordPaymentTitle', { id: order.id.substring(0,8) })} size="md">
            <form onSubmit={handleSubmitPayment} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {t('posx.payable.orderTo')} {getSupplierById(order.supplierId)?.name || order.supplierId} <br/>
                    {t('posx.payable.orderTotal')} ${order.totalCost.toFixed(2)} <br/>
                    {t('posx.payable.paidSoFar')} ${(order.amountPaid || 0).toFixed(2)} <br/>
                    <strong className="text-primary">{t('posx.payable.pendingBalance')} ${remainingBalance.toFixed(2)}</strong>
                </p>
                <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('posx.payable.amountToPay')}</label>
                    <input
                        type="number" id="paymentAmount" value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className={inputFormStyle} placeholder={t('posx.payable.maxPlaceholder', { max: remainingBalance.toFixed(2) })}
                        min="0.01" step="0.01" max={remainingBalance.toFixed(2)} required autoFocus
                    />
                </div>
                 <div>
                    <label htmlFor="invoiceRef" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('posx.payable.invoiceNumber')}</label>
                    <input
                        type="text" id="invoiceRef" value={invoiceRefInput}
                        onChange={(e) => setInvoiceRefInput(e.target.value)}
                        className={inputFormStyle} placeholder={t('posx.payable.invoicePlaceholder')}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('posx.payable.attachReceipt')}</label>
                    <div className="mt-1 flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                        >
                            <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                            {t('posx.payable.selectFile')}
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
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.payable.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('posx.payable.recordPayment')}</button>
                </div>
            </form>
        </Modal>
    );
};


export const AccountsPayablePage: React.FC = () => {
    const { supplierOrders, getSupplierById, suppliers, recordSupplierOrderPayment, updateSupplierOrderStatus } = useData();
    const { getDefaultSettings } = useECommerceSettings();
    const { t } = useTranslation();

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

    // Orden por columna + paginación (conserva el acordeón de historial de pagos).
    const getOrderSortValue = useCallback((o: SupplierOrder & { balance: number }, key: string): any => {
        switch (key) {
            case 'id': return o.id;
            case 'supplier': return getSupplierById(o.supplierId)?.name || '';
            case 'orderDate': return o.orderDate;
            case 'totalCost': return o.totalCost;
            case 'amountPaid': return o.amountPaid;
            case 'balance': return o.balance;
            case 'paymentStatus': return o.paymentStatus;
            default: return '';
        }
    }, [getSupplierById]);
    const { sorted: sortedOrders, sort: orderSort, toggle: toggleOrderSort } = useSortableRows(filteredOrders, getOrderSortValue);
    const ordersPage = usePagination(sortedOrders, 25);
    const colChooser = useColumnChooser('accounts-payable', [
        { id: 'id', label: t('posx.payable.colOrderId') },
        { id: 'supplier', label: t('posx.payable.colSupplier') },
        { id: 'orderDate', label: t('posx.payable.colOrderDate') },
        { id: 'totalCost', label: t('posx.payable.colTotalCost') },
        { id: 'amountPaid', label: t('posx.payable.colAmountPaid') },
        { id: 'balance', label: t('posx.payable.colPendingBalance') },
        { id: 'paymentStatus', label: t('posx.payable.colPaymentStatus') },
    ]);
    const spanCols = 2 + colChooser.visibleCount;

    const handleEditOrder = (order: SupplierOrder) => { setOrderToEdit(order); setShowEditOrderModal(true); };
    const handleCancelOrder = (orderId: string) => { setOrderToCancelId(orderId); setShowCancelConfirmModal(true); };
    const confirmCancelOrder = () => { if (orderToCancelId) { updateSupplierOrderStatus(orderToCancelId, SupplierOrderStatus.CANCELADO); toast.success(t('posx.payable.orderCancelled')); } setOrderToCancelId(null); setShowCancelConfirmModal(false); };

    const generatePayablePDF = async (order: SupplierOrder) => {
        toast(t('posx.payable.generatingPdf', { id: order.id.slice(0,8) }), { icon: '🖨️' });
    };

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                 <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.payable.title')}</h1>
                 <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <select id="apStatusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="Pendientes">{t('posx.payable.statusPending')}</option>
                            <option value="Pagado Completo">{t('posx.payable.statusPaidFull')}</option>
                            <option value="Todas">{t('posx.payable.statusAll')}</option>
                        </select>

                        {/* Supplier Autocomplete Filter */}
                        <div className="relative" ref={supplierInputRef}>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('posx.payable.filterBySupplier')}
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
                                        {t('posx.payable.allSuppliers')}
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
                                        <li className="px-3 py-2 text-neutral-500 text-sm">{t('posx.payable.noSuppliersFound')}</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        <select value={dueFilter} onChange={e => setDueFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="all">{t('posx.payable.dueAll')}</option>
                            <option value="overdue">{t('posx.payable.dueOverdue')}</option>
                            <option value="today">{t('posx.payable.dueToday')}</option>
                            <option value="7days">{t('posx.payable.dueNext7')}</option>
                            <option value="30days">{t('posx.payable.dueNext30')}</option>
                            <option value="plus30">{t('posx.payable.duePlus30')}</option>
                        </select>
                        <ColumnChooserButton chooser={colChooser} />
                    </div>
                </div>
            </div>
             <div className="overflow-x-auto bg-white dark:bg-neutral-800 shadow-md rounded-lg">
                <PaginationFooter
                    position="top"
                    total={ordersPage.total} page={ordersPage.page} pageCount={ordersPage.pageCount}
                    pageSize={ordersPage.pageSize} from={ordersPage.from} to={ordersPage.to}
                    onPage={ordersPage.setPage} onPageSize={ordersPage.setPageSize}
                />
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-900">
                        <tr>
                            <th scope="col" className="w-12 px-4 py-2"></th>
                            {colChooser.visible('id') && <SortableTh label={t('posx.payable.colOrderId')} colKey="id" sort={orderSort} onSort={toggleOrderSort} />}
                            {colChooser.visible('supplier') && <SortableTh label={t('posx.payable.colSupplier')} colKey="supplier" sort={orderSort} onSort={toggleOrderSort} />}
                            {colChooser.visible('orderDate') && <SortableTh label={t('posx.payable.colOrderDate')} colKey="orderDate" sort={orderSort} onSort={toggleOrderSort} />}
                            {colChooser.visible('totalCost') && <SortableTh label={t('posx.payable.colTotalCost')} colKey="totalCost" sort={orderSort} onSort={toggleOrderSort} />}
                            {colChooser.visible('amountPaid') && <SortableTh label={t('posx.payable.colAmountPaid')} colKey="amountPaid" sort={orderSort} onSort={toggleOrderSort} />}
                            {colChooser.visible('balance') && <SortableTh label={t('posx.payable.colPendingBalance')} colKey="balance" sort={orderSort} onSort={toggleOrderSort} />}
                            {colChooser.visible('paymentStatus') && <SortableTh label={t('posx.payable.colPaymentStatus')} colKey="paymentStatus" sort={orderSort} onSort={toggleOrderSort} />}
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('posx.payable.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {ordersPage.paged.length > 0 ? ordersPage.paged.map(order => {
                            const isExpanded = expandedRows.has(order.id);
                            const paymentNotesParsed = (order.paymentNotes || []).map(note => {
                                try {
                                    return JSON.parse(note);
                                } catch (e) {
                                    return { d: t('posx.payable.formatError'), p: '0', i: note, a: null };
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
                                        {colChooser.visible('id') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{order.id.substring(0, 8).toUpperCase()}</td>}
                                        {colChooser.visible('supplier') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{getSupplierById(order.supplierId)?.name || 'N/A'}</td>}
                                        {colChooser.visible('orderDate') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{new Date(order.orderDate + 'T00:00:00').toLocaleDateString()}</td>}
                                        {colChooser.visible('totalCost') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${order.totalCost.toFixed(2)}</td>}
                                        {colChooser.visible('amountPaid') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${order.amountPaid.toFixed(2)}</td>}
                                        {colChooser.visible('balance') && <td className="px-4 py-2 whitespace-nowrap text-base"><span className="font-semibold text-red-600 dark:text-red-400">${order.balance.toFixed(2)}</span></td>}
                                        {colChooser.visible('paymentStatus') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{order.paymentStatus}</td>}
                                        <td className="px-4 py-2 whitespace-nowrap text-base font-medium">
                                            <div className="flex space-x-1">
                                                <button onClick={() => handleEditOrder(order)} className="text-blue-500 p-1" title={t('posx.payable.editOrder')}><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => generatePayablePDF(order)} className="text-blue-500 p-1" title={t('posx.payable.printStatement')}><PrinterIcon className="w-4 h-4" /></button>
                                                <button onClick={() => setPaymentModalOrder(order)} className="text-green-500 p-1" title={t('posx.payable.recordPayment')} disabled={order.balance <= 0}><BanknotesIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleCancelOrder(order.id)} className="text-red-500 p-1" title={t('posx.payable.cancelOrder')} disabled={order.status === SupplierOrderStatus.RECIBIDO_COMPLETO}><CancelIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && paymentNotesParsed.length > 0 && (
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <td colSpan={spanCols} className="p-3">
                                                <h4 className="text-sm font-semibold mb-2 text-neutral-600 dark:text-neutral-300">{t('posx.payable.paymentHistory')}</h4>
                                                <table className="min-w-full bg-white dark:bg-neutral-800 rounded-md">
                                                    <thead className="bg-neutral-100 dark:bg-neutral-900 text-xs uppercase">
                                                        <tr>
                                                            <th className="px-3 py-1.5 text-left">{t('posx.payable.histDate')}</th>
                                                            <th className="px-3 py-1.5 text-right">{t('posx.payable.histAmount')}</th>
                                                            <th className="px-3 py-1.5 text-left">{t('posx.payable.histInvoiceRef')}</th>
                                                            <th className="px-3 py-1.5 text-center">{t('posx.payable.histAttachment')}</th>
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
                                                                        <a href={payment.a} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-500 hover:text-blue-600" title={t('posx.payable.viewAttachment')}>
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
                                <td colSpan={spanCols} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                                    {t('posx.payable.noResults')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <PaginationFooter
                    total={ordersPage.total} page={ordersPage.page} pageCount={ordersPage.pageCount}
                    pageSize={ordersPage.pageSize} from={ordersPage.from} to={ordersPage.to}
                    onPage={ordersPage.setPage} onPageSize={ordersPage.setPageSize}
                />
            </div>
            <RecordPaymentModal isOpen={!!paymentModalOrder} onClose={() => setPaymentModalOrder(null)} order={paymentModalOrder} onRecordPayment={recordSupplierOrderPayment}/>
            <SupplierOrderFormModal isOpen={showEditOrderModal} onClose={() => setShowEditOrderModal(false)} orderToEdit={orderToEdit} />
            {orderToCancelId && <ConfirmationModal isOpen={showCancelConfirmModal} onClose={() => setShowCancelConfirmModal(false)} onConfirm={confirmCancelOrder} title={t('posx.payable.confirmCancelTitle')} message={t('posx.payable.confirmCancelMessage', { po: orderToCancelId.slice(-6).toUpperCase() })} confirmButtonText={t('posx.payable.confirmCancelButton')} />}
        </div>
    );
};
