
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSortableRows, usePagination, SortableTh, PaginationFooter, useColumnChooser, ColumnChooserButton } from '../../components/ui/tableTools';
import { SupplierOrder, SupplierOrderStatus, Supplier } from '../../types';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { PrinterIcon, BanknotesIcon, EditIcon, EyeIcon, TrashIconMini as CancelIcon, PhotoIcon, DocumentArrowUpIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '../../components/icons';
import { usePermissions } from '../../hooks/usePermissions';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { SupplierOrderFormModal } from '../ecommerce/SupplierOrderFormModal';
import {
    supplierOrdersService,
    isSupplierOrderReceived,
    displaySupplierPaymentStatus,
    parseSupplierOrderDay,
    apiErrorMessage,
} from '../../services/supplierOrders';
import { uploadImage } from '../../services/upload';
import { toast } from '../../hooks/useToast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/** URL dentro del texto de una nota de pago (el comprobante subido). */
const URL_RE = /https?:\/\/[^\s]+/;

/** Nota de pago normalizada para el historial. El backend manda objetos { id, note, createdAt };
 *  se tolera el formato local viejo (string JSON { p, d, i, a }). */
interface PaymentHistoryRow {
    key: string;
    date: string;
    amount: number | null;
    detail: string;
    attachment: string | null;
}

const normalizePaymentNote = (raw: any, index: number): PaymentHistoryRow => {
    const fromLegacy = (o: any): PaymentHistoryRow => ({
        key: `legacy-${index}`,
        date: String(o?.d ?? ''),
        amount: o?.p != null && !isNaN(parseFloat(o.p)) ? parseFloat(o.p) : null,
        detail: String(o?.i ?? ''),
        attachment: typeof o?.a === 'string' ? o.a : null,
    });
    if (typeof raw === 'string') {
        try { return fromLegacy(JSON.parse(raw)); } catch { return { key: `s-${index}`, date: '', amount: null, detail: raw, attachment: null }; }
    }
    const text = String(raw?.note ?? '');
    const created = raw?.createdAt ? new Date(raw.createdAt) : null;
    const attachment = text.match(URL_RE)?.[0] ?? null;
    // El backend agrega el monto al final: "… — $12.34" o "Pago de $12.34".
    const amountMatch = text.match(/\$\s?([\d,]+(?:\.\d+)?)\s*$/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    const detail = text
        .replace(/\s*·?\s*[^\s·:]+:\s*https?:\/\/\S+/, '') // "Comprobante: <url>"
        .replace(URL_RE, '')
        .replace(/\s*—\s*\$\s?[\d,]+(?:\.\d+)?\s*$/, '')    // " — $12.34" que agrega el backend
        .replace(/^Pago de \$\s?[\d,]+(?:\.\d+)?$/, '')     // nota automática sin detalle
        .replace(/\s*·\s*$/, '')
        .trim();
    return {
        key: raw?.id || `n-${index}`,
        date: created && !isNaN(created.getTime()) ? created.toLocaleString() : '',
        amount,
        detail,
        attachment,
    };
};

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    /** Devuelve true si se registró (el modal se cierra); false deja el modal abierto. */
    onRecordPayment: (orderId: string, amount: number, note?: string) => Promise<boolean>;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, order, onRecordPayment }) => {
    const { getSupplierById } = useData();
    const { t } = useTranslation();
    const [amountPaidInput, setAmountPaidInput] = useState<string>('');
    const [invoiceRefInput, setInvoiceRefInput] = useState<string>('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const remainingBalance = useMemo(() => {
        if (!order) return 0;
        return order.totalCost - (order.amountPaid || 0);
    }, [order]);

    useEffect(() => {
        if (isOpen && order) {
            setAmountPaidInput(remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
            setInvoiceRefInput('');
            setAttachmentFile(null);
            setSubmitting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [isOpen, order, remainingBalance]);

    if (!isOpen || !order) return null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAttachmentFile(event.target.files?.[0] || null);
    };

    const clearAttachment = () => {
        setAttachmentFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
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
        setSubmitting(true);
        try {
            // El comprobante se sube primero (Cloudinary/servidor) y su URL queda en la nota del pago.
            let attachmentUrl: string | undefined;
            if (attachmentFile) {
                try {
                    attachmentUrl = await uploadImage(attachmentFile);
                } catch {
                    toast.error(t('posx.payable.attachmentUploadError'));
                    return;
                }
            }
            const parts: string[] = [];
            if (invoiceRefInput.trim()) parts.push(`${t('posx.payable.noteInvoiceLabel')}: ${invoiceRefInput.trim()}`);
            if (attachmentUrl) parts.push(`${t('posx.payable.noteAttachmentLabel')}: ${attachmentUrl}`);
            const note = parts.join(' · ').slice(0, 450) || undefined;
            const ok = await onRecordPayment(order.id, amount, note);
            if (ok) onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('posx.payable.recordPaymentTitle', { id: order.id.substring(0,8) })} size="md">
            <form onSubmit={handleSubmitPayment} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {t('posx.payable.orderTo')} {getSupplierById(order.supplierId)?.name || order.supplier?.name || order.supplierId} <br/>
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
                        maxLength={100}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('posx.payable.attachReceipt')}</label>
                    <div className="mt-1 flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                            disabled={submitting}
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
                        {attachmentFile && (
                            <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-300 min-w-0">
                                <PhotoIcon className="w-4 h-4 text-green-500 flex-shrink-0"/>
                                <span className="truncate max-w-xs">{attachmentFile.name}</span>
                                <button type="button" onClick={clearAttachment} className="text-red-500 dark:text-red-400 hover:text-red-700 p-0.5" aria-label={t('common.delete')} disabled={submitting}>
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>{t('posx.payable.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? t('cmpx.common.registering') : t('posx.payable.recordPayment')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};



export const AccountsPayablePage: React.FC = () => {
    const { supplierOrders, getSupplierById, suppliers, setSupplierOrders } = useData();
    // Editar/cancelar = gestión de pedidos; registrar pago = accounts.recordPayment o gestión (igual que el backend).
    const { can, canAny } = usePermissions();
    const canManageOrders = can('supplierOrders.manage');
    const canRecordPayment = canAny('accounts.recordPayment', 'supplierOrders.manage');

    // Registrar pago al proveedor EN EL BACKEND (antes solo mutaba estado local y se perdía al recargar).
    // (Atómico en el backend; 400 PAYMENT_OVERFLOW si excede el saldo.)
    const handleRecordPayment = async (orderId: string, amount: number, note?: string): Promise<boolean> => {
        try {
            const { order } = await supplierOrdersService.recordPayment(orderId, { amount, note });
            setSupplierOrders(prev => prev.map(o => o.id === orderId ? (order as unknown as SupplierOrder) : o));
            toast.success(t('posx.payable.paymentRecorded'));
            return true;
        } catch (err) {
            const msg = apiErrorMessage(err, t('cmpx.common.err_payment_save'));
            if (msg) toast.error(msg);
            return false;
        }
    };
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
                // orderDate llega como ISO completo: se toma el día (a mediodía) para no correrlo por zona horaria.
                const orderDate = parseSupplierOrderDay(o.orderDate);
                if (!orderDate) return false;
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
    const confirmCancelOrder = async () => {
        const id = orderToCancelId;
        setOrderToCancelId(null); setShowCancelConfirmModal(false);
        if (!id) return;
        try {
            const updated = await supplierOrdersService.updateStatus(id, 'Cancelado');
            setSupplierOrders(prev => prev.map(o => o.id === id ? (updated as unknown as SupplierOrder) : o));
            toast.success(t('posx.payable.orderCancelled'));
        } catch (err) {
            // p. ej. 400 ALREADY_RECEIVED: la mercancía ya entró al inventario.
            const msg = apiErrorMessage(err, t('posx.payable.cancelError'));
            if (msg) toast.error(msg);
        }
    };

    const generatePayablePDF = async (order: SupplierOrder) => {
        toast.info(t('posx.payable.generatingPdf', { id: order.id.slice(0,8) }));
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
                            // Las notas llegan como objetos { id, note, createdAt } (antes: JSON.parse → crash).
                            const paymentNotesParsed = (order.paymentNotes || []).map((note: unknown, i: number) => normalizePaymentNote(note, i));
                            const receivedGoods = isSupplierOrderReceived(order.status);
                            const orderDay = parseSupplierOrderDay(order.orderDate);
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
                                        {colChooser.visible('supplier') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{getSupplierById(order.supplierId)?.name || order.supplier?.name || 'N/A'}</td>}
                                        {colChooser.visible('orderDate') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{orderDay ? orderDay.toLocaleDateString() : '—'}</td>}
                                        {colChooser.visible('totalCost') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${order.totalCost.toFixed(2)}</td>}
                                        {colChooser.visible('amountPaid') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${order.amountPaid.toFixed(2)}</td>}
                                        {colChooser.visible('balance') && <td className="px-4 py-2 whitespace-nowrap text-base"><span className="font-semibold text-red-600 dark:text-red-400">${order.balance.toFixed(2)}</span></td>}
                                        {colChooser.visible('paymentStatus') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{displaySupplierPaymentStatus(order.paymentStatus)}</td>}
                                        <td className="px-4 py-2 whitespace-nowrap text-base font-medium">
                                            <div className="flex space-x-1">
                                                {/* Sin supplierOrders.manage el pedido se abre en solo lectura. */}
                                                <button onClick={() => handleEditOrder(order)} className="text-blue-500 p-1" title={canManageOrders ? t('posx.payable.editOrder') : t('ecomx.supplier_orders.view_title')}>
                                                    {canManageOrders ? <EditIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => generatePayablePDF(order)} className="text-blue-500 p-1" title={t('posx.payable.printStatement')}><PrinterIcon className="w-4 h-4" /></button>
                                                {canRecordPayment && (
                                                    <button onClick={() => setPaymentModalOrder(order)} className="text-green-500 p-1 disabled:opacity-30 disabled:cursor-not-allowed" title={t('posx.payable.recordPayment')} disabled={order.balance <= 0}><BanknotesIcon className="w-4 h-4" /></button>
                                                )}
                                                {canManageOrders && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        className="text-red-500 p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={receivedGoods ? t('ecomx.supplier_orders.status_locked_received') : t('posx.payable.cancelOrder')}
                                                        disabled={receivedGoods}
                                                    ><CancelIcon className="w-4 h-4" /></button>
                                                )}
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
                                                            <th className="px-3 py-1.5 text-left">{t('posx.payable.histNote')}</th>
                                                            <th className="px-3 py-1.5 text-center">{t('posx.payable.histAttachment')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paymentNotesParsed.map((payment) => (
                                                            <tr key={payment.key} className="border-t dark:border-neutral-700 text-sm">
                                                                <td className="px-3 py-1.5 whitespace-nowrap">{payment.date || '—'}</td>
                                                                <td className="px-3 py-1.5 text-right font-medium">{payment.amount != null ? `$${payment.amount.toFixed(2)}` : '—'}</td>
                                                                <td className="px-3 py-1.5 break-words">{payment.detail || '—'}</td>
                                                                <td className="px-3 py-1.5 text-center">
                                                                    {payment.attachment ? (
                                                                        <a href={payment.attachment} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" title={t('posx.payable.viewAttachment')}>
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
            <RecordPaymentModal isOpen={!!paymentModalOrder} onClose={() => setPaymentModalOrder(null)} order={paymentModalOrder} onRecordPayment={handleRecordPayment}/>
            <SupplierOrderFormModal isOpen={showEditOrderModal} onClose={() => setShowEditOrderModal(false)} orderToEdit={orderToEdit} />
            {orderToCancelId && <ConfirmationModal isOpen={showCancelConfirmModal} onClose={() => setShowCancelConfirmModal(false)} onConfirm={confirmCancelOrder} title={t('posx.payable.confirmCancelTitle')} message={t('posx.payable.confirmCancelMessage', { po: orderToCancelId.slice(-6).toUpperCase() })} confirmButtonText={t('posx.payable.confirmCancelButton')} />}
        </div>
    );
};
