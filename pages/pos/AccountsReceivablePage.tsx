
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSortableRows, usePagination, SortableTh, PaginationFooter, useColumnChooser, ColumnChooserButton } from '../../components/ui/tableTools';
import { ClientNameLink } from '../../components/ui/EntityNameLink';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Sale, Client, SalePayment } from '../../types';
import { PrinterIcon, BanknotesIcon, EditIcon, TrashIconMini, EnvelopeIcon, DocumentArrowUpIcon, PhotoIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '../../components/icons';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { ReceivableEditModal } from './ReceivableEditModal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { ClientSearchModal } from '../../components/ClientSearchModal';
import { ClientCreditPaymentModal } from '../../components/ui/ClientCreditPaymentModal';
import { ReceiptModal, type ReceiptSale } from '../../components/pos/ReceiptModal';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { API_URL, ApiError } from '../../services/api';
import { salesService } from '../../services/sales';
import { toast } from 'react-hot-toast';

/** Comprobante de abono a crédito (para imprimir via ReceiptModal). */
function buildAbonoReceipt(clientName: string, total: number, method: string, reference: string | undefined, cashierName?: string): ReceiptSale {
    return {
        saleNumber: 'ABONO',
        date: new Date().toISOString(),
        items: [{ name: 'Abono a cuenta de crédito', quantity: 1, unitPrice: total, note: `Método: ${method}${reference ? ` · Ref: ${reference}` : ''}` }],
        subtotal: total, tax: 0, discount: 0, total,
        payments: [{ method, amount: total, reference }],
        clientName, cashierName,
    };
}

/** Reconstruye el recibo de una venta (para reimprimir su factura). */
function saleToReceipt(sale: any): ReceiptSale {
    const payments = Array.isArray(sale.payments) && sale.payments.length
        ? sale.payments.map((p: any) => ({ method: p.paymentMethodUsed, amount: p.amountPaid, reference: p.notes || undefined }))
        : [{ method: sale.paymentMethod || 'Pago', amount: sale.totalAmount }];
    return {
        saleNumber: sale.saleNumber != null ? String(sale.saleNumber) : String(sale.id).slice(0, 8),
        date: sale.date,
        items: (sale.items || []).map((it: any) => ({ name: it.name || it.product?.name || 'Artículo', quantity: it.quantity, unitPrice: it.unitPrice, note: it.note })),
        subtotal: sale.subtotal ?? (sale.totalAmount - (sale.taxAmount || 0)),
        tax: sale.taxAmount ?? 0,
        discount: sale.discountAmount ?? 0,
        total: sale.totalAmount,
        payments,
        clientName: sale.client ? `${sale.client.name} ${sale.client.lastName || ''}`.trim() : undefined,
    };
}

// ... (Keep RecordPaymentModal and PaymentReminderModal as they are) ...
interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: (Sale & { balance: number }) | null;
    onConfirm: (saleId: string, amount: number, method: string, notes: string, attachment?: string) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, sale, onConfirm }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Efectivo');
    const [notes, setNotes] = useState('');
    const [attachment, setAttachment] = useState<string | undefined>(undefined);
    const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (sale && isOpen) {
            setAmount(sale.balance.toFixed(2));
            setMethod('Efectivo');
            setNotes('');
            setAttachment(undefined);
            setAttachmentName(undefined);
        }
    }, [sale, isOpen]);

    if (!isOpen || !sale) return null;

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

    const handleConfirm = () => {
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > sale.balance + 0.001) {
            toast.error(t('posx.receivable.invalid_amount', { balance: sale.balance.toFixed(2) }));
            return;
        }
        onConfirm(sale.id, paymentAmount, method, notes, attachment);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('pos.receivable.payment_modal.title', { id: sale.id.substring(0,8) })}>
            <div className="space-y-4">
                <p>{t('pos.receivable.payment_modal.balance')}: <span className="font-bold text-red-500">${sale.balance.toFixed(2)}</span></p>
                <div>
                    <label className="block text-sm">{t('pos.receivable.payment_modal.amount')}</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputFormStyle} max={sale.balance.toFixed(2)} step="0.01" autoFocus />
                </div>
                <div>
                    <label className="block text-sm">{t('pos.receivable.payment_modal.method')}</label>
                    <select value={method} onChange={e => setMethod(e.target.value)} className={inputFormStyle}>
                        <option>Efectivo</option><option>Tarjeta</option><option>ATH Móvil</option><option>Cheque</option><option>Transferencia</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm">{t('pos.receivable.payment_modal.reference')}</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputFormStyle} placeholder={t('posx.receivable.reference_placeholder')} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pos.receivable.payment_modal.attachment')}</label>
                    <div className="mt-1 flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                        >
                            <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                            {t('common.search')}...
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
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="button" onClick={handleConfirm} className={BUTTON_PRIMARY_SM_CLASSES}>{t('pos.receivable.payment_modal.register')}</button>
                </div>
            </div>
        </Modal>
    );
};

interface PaymentReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: (Sale & { balance: number }) | null;
    clientName: string;
    onSend: (message: string) => void;
}

const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({ isOpen, onClose, sale, clientName, onSend }) => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (sale && isOpen) {
            // Generate default message
            const defaultMessage = t('posx.receivable.reminder_default_message', {
                clientName,
                balance: sale.balance.toFixed(2),
                saleId: sale.id.slice(-6).toUpperCase(),
                date: new Date(sale.date).toLocaleDateString(),
            });
            setMessage(defaultMessage);
        }
    }, [sale, clientName, isOpen]);

    const handleSend = () => {
        onSend(message);
        onClose();
    };

    if (!isOpen || !sale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('posx.receivable.reminder_modal_title')} size="lg">
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                        <strong>{t('posx.receivable.reminder_client')}:</strong> {clientName}<br/>
                        <strong>{t('posx.receivable.reminder_sale')}:</strong> #{sale.id.slice(-6).toUpperCase()}<br/>
                        <strong>{t('posx.receivable.reminder_balance')}:</strong> ${sale.balance.toFixed(2)}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('posx.receivable.reminder_message_label')}</label>
                    <RichTextEditor
                        value={message}
                        onChange={setMessage}
                        placeholder={t('posx.receivable.reminder_message_placeholder')}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button onClick={handleSend} className={BUTTON_PRIMARY_SM_CLASSES}>
                        <EnvelopeIcon className="w-4 h-4 mr-2" />
                        {t('posx.receivable.reminder_send_btn')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


export const AccountsReceivablePage: React.FC = () => {
    const { t } = useTranslation();
    const { sales, getClientById, clients, setSales, salePayments, addNotification } = useData();
    const { getDefaultSettings } = useECommerceSettings();

    const [paymentModalSale, setPaymentModalSale] = useState<(Sale & { balance: number }) | null>(null);
    const { settings } = useGlobalSettings();
    // Abono multi-factura: elegir cliente → repartir el pago entre sus facturas.
    const [showCreditSearch, setShowCreditSearch] = useState(false);
    const [creditClient, setCreditClient] = useState<Client | null>(null);
    // Recibo a imprimir (comprobante de abono o reimpresión de factura).
    const [receiptToPrint, setReceiptToPrint] = useState<ReceiptSale | null>(null);
    const reloadSales = async () => {
        try {
            const res = await fetch(`${API_URL}/sales?limit=200`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` } });
            const data = await res.json();
            if (Array.isArray(data)) setSales(data);
        } catch { /* noop */ }
    };
    const [showEditModal, setShowEditModal] = useState(false);
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
    const [showVoidConfirmModal, setShowVoidConfirmModal] = useState(false);
    const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<'Pendientes' | 'Pagadas' | 'Todas'>('Pendientes');
    const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | '7days' | '30days' | 'plus30'>('all');
    const [clientFilterId, setClientFilterId] = useState<string | null>(null);
    
    // Autocomplete Logic for Clients
    const [clientSearchInput, setClientSearchInput] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const clientInputRef = useRef<HTMLInputElement>(null);
    
    // Filtered Client suggestions for dropdown
    const clientSuggestions = useMemo(() => {
        if (!clientSearchInput) return clients.slice(0,10);
        const lower = clientSearchInput.toLowerCase();
        return clients.filter(c => c.name.toLowerCase().includes(lower) || c.lastName.toLowerCase().includes(lower)).slice(0, 10);
    }, [clients, clientSearchInput]);

    const handleSelectClient = (client: Client) => {
        setClientFilterId(client.id);
        setClientSearchInput(`${client.name} ${client.lastName}`);
        setIsClientDropdownOpen(false);
    };

    const clearClientFilter = () => {
        setClientFilterId(null);
        setClientSearchInput('');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRowExpansion = (saleId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(saleId)) {
                newSet.delete(saleId);
            } else {
                newSet.add(saleId);
            }
            return newSet;
        });
    };

    const receivableData = useMemo(() => {
        let creditSales = sales.filter(s => 
            (s.paymentMethod === 'Crédito C.' || (s.payments && s.payments.some(p => p.method === 'Crédito C.'))) && 
            s.paymentStatus !== 'Anulado' && 
            !s.isReturn
        );
        
        // Apply logic. El saldo se deriva de los pagos REALES de la venta (sale.payments, que vienen
        // del backend). Antes se usaba `salePayments` (estado local que nunca se llenaba) y por eso el
        // "Monto Pagado" siempre salía $0.
        let filteredSales = creditSales.map(sale => {
            const paymentsForSale = ((sale as any).payments && Array.isArray((sale as any).payments))
                ? (sale as any).payments
                : salePayments.filter(p => p.saleId === sale.id);
            const totalPaid = paymentsForSale.reduce((sum: number, p: any) => sum + (Number(p.amountPaid) || 0), 0);
            const balance = sale.totalAmount - totalPaid;
            const isPaid = balance < 0.01;
            return { ...sale, totalPaid, balance, effectiveStatus: isPaid ? 'Pagado' : 'Pendiente de Pago' };
        });

        // 1. Filter by Status
        if (statusFilter === 'Pendientes') {
            filteredSales = filteredSales.filter(s => s.effectiveStatus === 'Pendiente de Pago');
        } else if (statusFilter === 'Pagadas') {
            filteredSales = filteredSales.filter(s => s.effectiveStatus === 'Pagado');
        }

        // 2. Filter by Client (Using Autocomplete ID)
        if (clientFilterId) {
            filteredSales = filteredSales.filter(s => s.clientId === clientFilterId);
        }

        // 3. Filter by Due Date
        if (dueFilter !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            filteredSales = filteredSales.filter(s => {
                if (!s.dueDate) return false; // Exclude if no due date set
                const due = new Date(s.dueDate + 'T00:00:00');
                due.setHours(0, 0, 0, 0);
                
                const diffTime = due.getTime() - today.getTime();
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

        return filteredSales.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [sales, salePayments, statusFilter, clientFilterId, dueFilter]);

    // Orden por columna + paginación (conserva el acordeón de historial de pagos).
    const getReceivableSortValue = useCallback((sale: (typeof receivableData)[number], key: string): any => {
        switch (key) {
            case 'id': return sale.id;
            case 'date': return sale.date;
            case 'dueDate': return sale.dueDate || '';
            case 'client': return getClientById(sale.clientId || '')?.name || '';
            case 'total': return sale.totalAmount;
            case 'paid': return sale.totalPaid;
            case 'balance': return sale.balance;
            case 'status': return sale.effectiveStatus;
            default: return '';
        }
    }, [getClientById]);
    const { sorted: sortedReceivables, sort: receivableSort, toggle: toggleReceivableSort } = useSortableRows(receivableData, getReceivableSortValue);
    const salesPage = usePagination(sortedReceivables, 25);
    const colChooser = useColumnChooser('accounts-receivable', [
        { id: 'id', label: t('pos.receivable.col.id') },
        { id: 'date', label: t('pos.receivable.col.date') },
        { id: 'dueDate', label: t('pos.receivable.col.due_date') },
        { id: 'client', label: t('pos.receivable.col.client') },
        { id: 'total', label: t('pos.receivable.col.total') },
        { id: 'paid', label: t('pos.receivable.col.paid') },
        { id: 'balance', label: t('pos.receivable.col.balance') },
        { id: 'status', label: t('pos.receivable.col.status') },
    ]);
    const spanCols = 2 + colChooser.visibleCount; // expandir + acciones + columnas visibles

    const [saleForReminder, setSaleForReminder] = useState<(typeof receivableData)[0] | null>(null);

    const handleConfirmPayment = async (saleId: string, amount: number, method: string, notes: string, attachment?: string) => {
        try {
            // Persistir el abono en el backend (antes solo se guardaba en memoria y se perdía al recargar).
            await salesService.addPayment(saleId, {
                amountPaid: amount,
                paymentMethodUsed: method,
                notes: `Abono a CxC. ${notes}`.trim(),
                ...(attachment ? { attachment } : {}),
            } as any);
            // Refrescar la venta desde el servidor para que el saldo/estado se actualicen en pantalla.
            try {
                const updated = await salesService.getById(saleId);
                setSales(prev => prev.map(s => s.id === saleId ? { ...s, ...updated } : s));
            } catch { /* si falla el refresh, el polling/recarga lo corrige */ }
            toast.success('Abono registrado.');
            // Comprobante de abono (respeta el formato Recibo/Factura elegido).
            const s = sales.find(x => x.id === saleId);
            const cName = s?.clientId ? (getClientById(s.clientId)?.name || '') : '';
            setReceiptToPrint(buildAbonoReceipt(cName || 'Cliente', amount, method, notes || undefined));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo registrar el abono.');
        }
    };

    const handleEditReceivable = (sale: Sale) => { setSaleToEdit(sale); setShowEditModal(true); };
    const handleVoidReceivable = (sale: Sale) => { setSaleToVoid(sale); setShowVoidConfirmModal(true); };
    
    const confirmVoidReceivable = () => {
        if (saleToVoid) {
            setSales(prevSales => prevSales.map(s => s.id === saleToVoid.id ? { ...s, paymentStatus: 'Anulado' } : s));
        }
        setShowVoidConfirmModal(false);
        setSaleToVoid(null);
    };

    const requestSendReminder = (sale: (typeof receivableData)[0]) => {
        const client = sale.clientId ? getClientById(sale.clientId) : null;
        if (!client || !client.email) {
            toast.error(t('posx.receivable.no_email'));
            return;
        }
        setSaleForReminder(sale);
    };

    const handleConfirmSendReminder = (customMessage: string) => {
        if (!saleForReminder) return;
        const client = getClientById(saleForReminder.clientId);
        
        console.log(`Enviando recordatorio a ${client?.email}:`, customMessage);
        
        addNotification({
            title: t('posx.receivable.reminder_sent_title'),
            message: t('posx.receivable.reminder_sent_message', { name: client?.name || '' }),
            type: 'generic',
            link: '/pos/accounts-receivable'
        });
        setSaleForReminder(null);
    };
    
    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('pos.receivable.title')}</h1>
                    <button onClick={() => setShowCreditSearch(true)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex-shrink-0`}>💳 {t('posx.receivable.payments_credits')}</button>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <select id="arStatusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="Pendientes">{t('pos.receivable.filter.pending')}</option>
                            <option value="Pagadas">{t('pos.receivable.filter.paid')}</option>
                            <option value="Todas">{t('pos.receivable.filter.all')}</option>
                        </select>

                        {/* Client Autocomplete Filter */}
                        <div className="relative" ref={clientInputRef}>
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder={t('posx.receivable.filter_by_client')}
                                    value={clientSearchInput}
                                    onChange={(e) => { setClientSearchInput(e.target.value); if(e.target.value === '') setClientFilterId(null); }}
                                    onFocus={() => setIsClientDropdownOpen(true)}
                                    className={`${INPUT_SM_CLASSES} pr-8 w-full sm:w-64`}
                                />
                                {clientSearchInput && (
                                    <button 
                                        onClick={clearClientFilter}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {isClientDropdownOpen && (
                                <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    <li 
                                        onClick={() => { clearClientFilter(); setIsClientDropdownOpen(false); }}
                                        className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm"
                                    >
                                        {t('posx.receivable.all_clients')}
                                    </li>
                                    {clientSuggestions.map(c => (
                                        <li 
                                            key={c.id}
                                            onClick={() => handleSelectClient(c)}
                                            className="px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer text-sm"
                                        >
                                            {c.name} {c.lastName}
                                        </li>
                                    ))}
                                    {clientSuggestions.length === 0 && (
                                        <li className="px-3 py-2 text-neutral-500 text-sm">{t('posx.receivable.no_clients_found')}</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        <select value={dueFilter} onChange={e => setDueFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="all">{t('posx.receivable.due.all')}</option>
                            <option value="overdue">{t('posx.receivable.due.overdue')}</option>
                            <option value="today">{t('posx.receivable.due.today')}</option>
                            <option value="7days">{t('posx.receivable.due.7days')}</option>
                            <option value="30days">{t('posx.receivable.due.30days')}</option>
                            <option value="plus30">{t('posx.receivable.due.plus30')}</option>
                        </select>
                        <ColumnChooserButton chooser={colChooser} />
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-neutral-800 shadow-md rounded-lg">
                <PaginationFooter
                    position="top"
                    total={salesPage.total} page={salesPage.page} pageCount={salesPage.pageCount}
                    pageSize={salesPage.pageSize} from={salesPage.from} to={salesPage.to}
                    onPage={salesPage.setPage} onPageSize={salesPage.setPageSize}
                />
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-900">
                        <tr>
                            <th scope="col" className="w-12 px-4 py-2"></th>
                            {colChooser.visible('id') && <SortableTh label={t('pos.receivable.col.id')} colKey="id" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('date') && <SortableTh label={t('pos.receivable.col.date')} colKey="date" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('dueDate') && <SortableTh label={t('pos.receivable.col.due_date')} colKey="dueDate" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('client') && <SortableTh label={t('pos.receivable.col.client')} colKey="client" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('total') && <SortableTh label={t('pos.receivable.col.total')} colKey="total" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('paid') && <SortableTh label={t('pos.receivable.col.paid')} colKey="paid" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('balance') && <SortableTh label={t('pos.receivable.col.balance')} colKey="balance" sort={receivableSort} onSort={toggleReceivableSort} />}
                            {colChooser.visible('status') && <SortableTh label={t('pos.receivable.col.status')} colKey="status" sort={receivableSort} onSort={toggleReceivableSort} />}
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {salesPage.paged.length > 0 ? salesPage.paged.map((sale) => {
                            const isExpanded = expandedRows.has(sale.id);
                            const paymentsForSale = salePayments.filter(p => p.saleId === sale.id);
                            const vencimiento = () => {
                                if (!sale.dueDate) return <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">N/A</td>;
                                const today = new Date(); today.setHours(0,0,0,0);
                                const dueDate = new Date(sale.dueDate + 'T00:00:00');
                                const dayDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                                let colorClass = dayDiff < 0 ? 'text-red-600 dark:text-red-400 font-bold' : dayDiff <= 7 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-green-600 dark:text-green-400';
                                return <td className="px-4 py-2 whitespace-nowrap text-base"><span className={colorClass}>{new Date(sale.dueDate + 'T00:00:00').toLocaleDateString()}</span></td>;
                            };

                            return (
                                <React.Fragment key={sale.id}>
                                    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                                        <td className="px-4 py-2">
                                            {paymentsForSale.length > 0 && (
                                                <button onClick={() => toggleRowExpansion(sale.id)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600" aria-expanded={isExpanded}>
                                                    {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </td>
                                        {colChooser.visible('id') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{sale.id.substring(0, 8).toUpperCase()}</td>}
                                        {colChooser.visible('date') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{new Date(sale.date).toLocaleDateString()}</td>}
                                        {colChooser.visible('dueDate') && vencimiento()}
                                        {colChooser.visible('client') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{sale.clientId ? <ClientNameLink clientId={sale.clientId} name={getClientById(sale.clientId)?.name || t('posx.receivable.walk_in')} /> : (getClientById(sale.clientId || '')?.name || t('posx.receivable.walk_in'))}</td>}
                                        {colChooser.visible('total') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${sale.totalAmount.toFixed(2)}</td>}
                                        {colChooser.visible('paid') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${sale.totalPaid.toFixed(2)}</td>}
                                        {colChooser.visible('balance') && <td className="px-4 py-2 whitespace-nowrap text-base"><span className="font-semibold text-red-600 dark:text-red-400">${sale.balance.toFixed(2)}</span></td>}
                                        {colChooser.visible('status') && <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{sale.effectiveStatus}</td>}
                                        <td className="px-4 py-2 whitespace-nowrap text-base font-medium">
                                             <div className="flex space-x-1">
                                                <button onClick={() => requestSendReminder(sale)} className="text-orange-500 p-1" title={t('pos.receivable.action.reminder')}><EnvelopeIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleEditReceivable(sale)} className="text-blue-600 p-1" title={t('pos.receivable.action.edit')}><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => setReceiptToPrint(saleToReceipt(sale))} className="text-blue-600 p-1" title={t('posx.receivable.reprint_invoice')}><PrinterIcon className="w-4 h-4"/></button>
                                                <button onClick={() => setPaymentModalSale(sale)} className="text-green-600 p-1" title={t('pos.receivable.action.payment')} disabled={sale.balance <= 0}><BanknotesIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleVoidReceivable(sale)} className="text-red-600 p-1" title={t('pos.receivable.action.void')}><TrashIconMini className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && paymentsForSale.length > 0 && (
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <td colSpan={spanCols} className="p-3">
                                                <h4 className="text-sm font-semibold mb-2 text-neutral-600 dark:text-neutral-300">{t('posx.receivable.payment_history')}</h4>
                                                <table className="min-w-full bg-white dark:bg-neutral-800 rounded-md">
                                                    <thead className="bg-neutral-100 dark:bg-neutral-900 text-xs uppercase">
                                                        <tr>
                                                            <th className="px-3 py-1.5 text-left">{t('posx.receivable.hist.date')}</th>
                                                            <th className="px-3 py-1.5 text-right">{t('posx.receivable.hist.amount')}</th>
                                                            <th className="px-3 py-1.5 text-left">{t('posx.receivable.hist.method')}</th>
                                                            <th className="px-3 py-1.5 text-left">{t('posx.receivable.hist.reference')}</th>
                                                            <th className="px-3 py-1.5 text-center">{t('posx.receivable.hist.attachment')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paymentsForSale.map(payment => (
                                                            <tr key={payment.id} className="border-t dark:border-neutral-700 text-sm">
                                                                <td className="px-3 py-1.5">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                                                <td className="px-3 py-1.5 text-right font-medium">${payment.amountPaid.toFixed(2)}</td>
                                                                <td className="px-3 py-1.5">{payment.paymentMethodUsed}</td>
                                                                <td className="px-3 py-1.5">{payment.notes}</td>
                                                                <td className="px-3 py-1.5 text-center">
                                                                    {payment.attachment ? (
                                                                        <a href={payment.attachment} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-500 hover:text-blue-600" title={t('posx.receivable.view_attachment')}>
                                                                            <PhotoIcon className="w-5 h-5" />
                                                                        </a>
                                                                    ) : t('posx.receivable.no')}
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
                                    {t('posx.receivable.empty')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <PaginationFooter
                    total={salesPage.total} page={salesPage.page} pageCount={salesPage.pageCount}
                    pageSize={salesPage.pageSize} from={salesPage.from} to={salesPage.to}
                    onPage={salesPage.setPage} onPageSize={salesPage.setPageSize}
                />
            </div>

            <RecordPaymentModal isOpen={!!paymentModalSale} onClose={() => setPaymentModalSale(null)} sale={paymentModalSale} onConfirm={handleConfirmPayment} />

            {/* Abono multi-factura: elegir cliente (con balance) → repartir el pago. */}
            <ClientSearchModal
                isOpen={showCreditSearch}
                onClose={() => setShowCreditSearch(false)}
                clients={clients}
                onClientSelect={(c) => { setShowCreditSearch(false); setCreditClient(c); }}
                onOpenCreateClient={() => setShowCreditSearch(false)}
            />
            <ClientCreditPaymentModal
                isOpen={!!creditClient}
                onClose={() => setCreditClient(null)}
                clientId={creditClient?.id || ''}
                clientName={creditClient ? `${creditClient.name} ${creditClient.lastName || ''}`.trim() : undefined}
                onPaid={(info) => {
                    const name = creditClient ? `${creditClient.name} ${creditClient.lastName || ''}`.trim() : 'Cliente';
                    reloadSales();
                    setReceiptToPrint(buildAbonoReceipt(name, info.total, info.method, info.reference));
                }}
            />

            {/* Impresión de comprobante de abono / reimpresión de factura (respeta el formato Recibo/Factura). */}
            <ReceiptModal isOpen={!!receiptToPrint} onClose={() => setReceiptToPrint(null)} sale={receiptToPrint} config={settings.receiptConfig} />
            <ReceivableEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} saleToEdit={saleToEdit} />
            {saleToVoid && <ConfirmationModal isOpen={showVoidConfirmModal} onClose={() => setShowVoidConfirmModal(false)} onConfirm={confirmVoidReceivable} title={t('pos.receivable.confirm_void.title')} message={t('pos.receivable.confirm_void.message', { id: `VTA-${saleToVoid.id.slice(-6)}` })} confirmButtonText={t('pos.receivable.confirm_void.btn')} />}
            
            <PaymentReminderModal
                isOpen={!!saleForReminder}
                onClose={() => setSaleForReminder(null)}
                sale={saleForReminder}
                clientName={saleForReminder ? (getClientById(saleForReminder.clientId)?.name || '') : ''}
                onSend={handleConfirmSendReminder}
            />
        </div>
    );
};
