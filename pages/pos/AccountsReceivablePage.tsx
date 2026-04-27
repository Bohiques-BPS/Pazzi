
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Sale, Client, SalePayment } from '../../types';
import { PrinterIcon, BanknotesIcon, EditIcon, TrashIconMini, EnvelopeIcon, DocumentArrowUpIcon, PhotoIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '../../components/icons';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { ReceivableEditModal } from './ReceivableEditModal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

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
            alert(`Monto inválido. No puede ser mayor al balance de $${sale.balance.toFixed(2)}.`);
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
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputFormStyle} placeholder="Factura #12345" />
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
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (sale && isOpen) {
            // Generate default message
            const defaultMessage = `Estimado/a ${clientName},<br/><br/>Le recordamos amablemente que tiene un saldo pendiente de <b>$${sale.balance.toFixed(2)}</b> correspondiente a la venta <b>#${sale.id.slice(-6).toUpperCase()}</b> con fecha del ${new Date(sale.date).toLocaleDateString()}.<br/><br/>Agradecemos su pronto pago.<br/><br/>Atentamente,<br/>El equipo de Pazzi.`;
            setMessage(defaultMessage);
        }
    }, [sale, clientName, isOpen]);

    const handleSend = () => {
        onSend(message);
        onClose();
    };

    if (!isOpen || !sale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enviar Notificación de Cobro" size="lg">
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                        <strong>Cliente:</strong> {clientName}<br/>
                        <strong>Venta:</strong> #{sale.id.slice(-6).toUpperCase()}<br/>
                        <strong>Saldo Pendiente:</strong> ${sale.balance.toFixed(2)}
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Mensaje a Enviar</label>
                    <RichTextEditor 
                        value={message} 
                        onChange={setMessage} 
                        placeholder="Escriba el mensaje de recordatorio aquí..." 
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={handleSend} className={BUTTON_PRIMARY_SM_CLASSES}>
                        <EnvelopeIcon className="w-4 h-4 mr-2" />
                        Sí, Enviar Mensaje
                    </button>
                </div>
            </div>
        </Modal>
    );
};


export const AccountsReceivablePage: React.FC = () => {
    const { t } = useTranslation();
    const { sales, getClientById, clients, addSalePayment, setSales, salePayments, addNotification } = useData();
    const { getDefaultSettings } = useECommerceSettings();

    const [paymentModalSale, setPaymentModalSale] = useState<(Sale & { balance: number }) | null>(null);
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
        
        // Apply logic
        let filteredSales = creditSales.map(sale => {
            const paymentsForSale = salePayments.filter(p => p.saleId === sale.id);
            const totalPaid = paymentsForSale.reduce((sum, p) => sum + p.amountPaid, 0);
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

    const [saleForReminder, setSaleForReminder] = useState<(typeof receivableData)[0] | null>(null);

    const handleConfirmPayment = (saleId: string, amount: number, method: string, notes: string, attachment?: string) => {
        addSalePayment({
            saleId,
            amountPaid: amount,
            paymentMethodUsed: method,
            paymentDate: new Date().toISOString(),
            notes: `Abono a CxC. ${notes}`.trim(),
            attachment: attachment
        });
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
            alert("El cliente no tiene un correo electrónico registrado para enviar un recordatorio.");
            return;
        }
        setSaleForReminder(sale);
    };

    const handleConfirmSendReminder = (customMessage: string) => {
        if (!saleForReminder) return;
        const client = getClientById(saleForReminder.clientId);
        
        console.log(`Enviando recordatorio a ${client?.email}:`, customMessage);
        
        addNotification({
            title: 'Mensaje Enviado',
            message: `Se ha enviado el recordatorio a ${client?.name}.`,
            type: 'generic',
            link: '/pos/accounts-receivable'
        });
        setSaleForReminder(null);
    };
    
    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('pos.receivable.title')}</h1>
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
                                    placeholder="Filtrar por Cliente..."
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
                                        Todos los Clientes
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
                                        <li className="px-3 py-2 text-neutral-500 text-sm">No se encontraron clientes.</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        <select value={dueFilter} onChange={e => setDueFilter(e.target.value as any)} className={INPUT_SM_CLASSES}>
                            <option value="all">Vencimiento: Todos</option>
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
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.id')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.date')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.due_date')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.client')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.total')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.paid')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.balance')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('pos.receivable.col.status')}</th>
                            <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {receivableData.length > 0 ? receivableData.map((sale) => {
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
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{sale.id.substring(0, 8).toUpperCase()}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{new Date(sale.date).toLocaleDateString()}</td>
                                        {vencimiento()}
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{getClientById(sale.clientId || '')?.name || 'Contado'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${sale.totalAmount.toFixed(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">${sale.totalPaid.toFixed(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base"><span className="font-semibold text-red-600 dark:text-red-400">${sale.balance.toFixed(2)}</span></td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base text-neutral-700 dark:text-neutral-200">{sale.effectiveStatus}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-base font-medium">
                                             <div className="flex space-x-1">
                                                <button onClick={() => requestSendReminder(sale)} className="text-orange-500 p-1" title={t('pos.receivable.action.reminder')}><EnvelopeIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleEditReceivable(sale)} className="text-blue-600 p-1" title={t('pos.receivable.action.edit')}><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => alert("Función de Imprimir no implementada.")} className="text-blue-600 p-1" title={t('pos.receivable.action.print')}><PrinterIcon className="w-4 h-4"/></button>
                                                <button onClick={() => setPaymentModalSale(sale)} className="text-green-600 p-1" title={t('pos.receivable.action.payment')} disabled={sale.balance <= 0}><BanknotesIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleVoidReceivable(sale)} className="text-red-600 p-1" title={t('pos.receivable.action.void')}><TrashIconMini className="w-4 h-4"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && paymentsForSale.length > 0 && (
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <td colSpan={10} className="p-3">
                                                <h4 className="text-sm font-semibold mb-2 text-neutral-600 dark:text-neutral-300">Historial de Abonos</h4>
                                                <table className="min-w-full bg-white dark:bg-neutral-800 rounded-md">
                                                    <thead className="bg-neutral-100 dark:bg-neutral-700 text-xs uppercase">
                                                        <tr>
                                                            <th className="px-3 py-1.5 text-left">Fecha</th>
                                                            <th className="px-3 py-1.5 text-right">Monto</th>
                                                            <th className="px-3 py-1.5 text-left">Método</th>
                                                            <th className="px-3 py-1.5 text-left">Referencia/Notas</th>
                                                            <th className="px-3 py-1.5 text-center">Adjunto</th>
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
                                                                        <a href={payment.attachment} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-500 hover:text-blue-600" title="Ver adjunto">
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
                                <td colSpan={10} className="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
                                    No se encontraron cuentas por cobrar con los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <RecordPaymentModal isOpen={!!paymentModalSale} onClose={() => setPaymentModalSale(null)} sale={paymentModalSale} onConfirm={handleConfirmPayment} />
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
