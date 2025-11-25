
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Sale, Client, SalePayment } from '../../types';
import { PrinterIcon, BanknotesIcon, EditIcon, TrashIconMini, EnvelopeIcon, DocumentArrowUpIcon, PhotoIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon, PaperAirplaneIcon, DocumentArrowDownIcon, SparklesIcon, DocumentTextIcon } from '../../components/icons';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { AdminAuthModal } from '../../components/ui/AdminAuthModal'; // Import Auth Modal
import { ReceivableEditModal } from './ReceivableEditModal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { DataTable, TableColumn } from '../../components/DataTable';
import { RecordSalePaymentModal } from '../../components/forms/RecordSalePaymentModal'; // Imported reusable modal

// ... Existing Single Reminder Modal ...
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
            const defaultMessage = `Estimado/a ${clientName},<br/><br/>Le recordamos amablemente que tiene un saldo pendiente de <b>$${sale.balance.toFixed(2)}</b> correspondiente a la venta <b>#${sale.id.slice(-6).toUpperCase()}</b> con fecha del ${new Date(sale.date).toLocaleDateString()}.<br/><br/>Adjuntamos copia de la factura para su referencia.<br/><br/>Atentamente,<br/>El equipo de Pazzi.`;
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
                
                <div className="flex items-center p-2 bg-neutral-100 dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600">
                    <DocumentTextIcon className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">Se adjuntará automáticamente: <strong>Factura_#{sale.id.slice(-6).toUpperCase()}.pdf</strong></span>
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

// --- NEW: Batch Reminder Modal with Attachments ---
interface BatchReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    sales: (Sale & { balance: number })[];
    clientName: string;
    onSend: (message: string) => void;
}

const BatchReminderModal: React.FC<BatchReminderModalProps> = ({ isOpen, onClose, sales, clientName, onSend }) => {
    const [message, setMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [attachments, setAttachments] = useState<string[]>([]);
    
    const totalDebt = useMemo(() => sales.reduce((acc, s) => acc + s.balance, 0), [sales]);

    useEffect(() => {
        if (sales.length > 0 && isOpen) {
            // Simulate PDF Generation
            setIsGenerating(true);
            setAttachments([]);
            
            setTimeout(() => {
                const generatedFiles = sales.map(s => `Factura_${s.id.slice(-6).toUpperCase()}.pdf`);
                setAttachments(generatedFiles);
                setIsGenerating(false);
            }, 1500);

            const defaultMessage = `Estimado/a ${clientName},<br/><br/>Adjunto encontrará los archivos PDF de las facturas correspondientes a su saldo pendiente total de <strong style="color: #E11D48;">$${totalDebt.toFixed(2)}</strong>.<br/><br/>Agradecemos su gestión para regularizar este saldo lo antes posible.<br/><br/>Atentamente,<br/>El equipo de Pazzi.`;
            setMessage(defaultMessage);
        }
    }, [sales, clientName, isOpen, totalDebt]);

    const handleSend = () => {
        onSend(message);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Enviar Recordatorio Masivo (${sales.length} facturas)`} size="lg">
            <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md border border-orange-100 dark:border-orange-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                        Estás a punto de enviar un recordatorio a <strong>{clientName}</strong> por <strong>{sales.length}</strong> facturas seleccionadas.<br/>
                        Total acumulado de la selección: <strong className="text-red-600 dark:text-red-400">${totalDebt.toFixed(2)}</strong>
                    </p>
                </div>
                
                {/* Attachments Simulation Area */}
                <div className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3 bg-neutral-50 dark:bg-neutral-800/50">
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase mb-2 flex items-center">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                        Archivos Adjuntos ({sales.length})
                    </p>
                    
                    {isGenerating ? (
                        <div className="flex items-center justify-center py-4 text-sm text-primary animate-pulse">
                            <SparklesIcon className="w-5 h-5 mr-2 animate-spin" />
                            Generando facturas PDF...
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin">
                            {attachments.map((file, idx) => (
                                <div key={idx} className="flex items-center px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-xs text-neutral-700 dark:text-neutral-200 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> {/* Simulate PDF icon color */}
                                    {file}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Mensaje a Enviar</label>
                    <RichTextEditor 
                        value={message} 
                        onChange={setMessage} 
                        placeholder="Escriba el mensaje..." 
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-neutral-700">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button 
                        onClick={handleSend} 
                        className={BUTTON_PRIMARY_SM_CLASSES}
                        disabled={isGenerating}
                    >
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        {isGenerating ? 'Generando...' : 'Enviar con Adjuntos'}
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
    
    // Auth Modal State
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingSaleForPayment, setPendingSaleForPayment] = useState<(Sale & { balance: number }) | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'Pendientes' | 'Pagadas' | 'Todas'>('Pendientes');
    const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | '7days' | '30days' | 'plus30'>('all');
    const [clientFilterId, setClientFilterId] = useState<string | null>(null);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBatchModal, setShowBatchModal] = useState(false);

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
        setSelectedIds([]); // Clear selection on filter change
    };

    const clearClientFilter = () => {
        setClientFilterId(null);
        setClientSearchInput('');
        setSelectedIds([]); // Clear selection on filter change
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
        let creditSales = sales.filter(s => s.paymentMethod === 'Crédito C.' && s.paymentStatus !== 'Anulado' && !s.isReturn);
        
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

    const handleRequestPayment = (sale: (Sale & { balance: number })) => {
        setPendingSaleForPayment(sale);
        setShowAuthModal(true);
    };

    const handleAuthSuccess = () => {
        if (pendingSaleForPayment) {
            setPaymentModalSale(pendingSaleForPayment);
            setPendingSaleForPayment(null);
        }
    };

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
            message: `Se ha enviado el recordatorio con factura adjunta a ${client?.name}.`,
            type: 'generic',
            link: '/pos/accounts-receivable'
        });
        setSaleForReminder(null);
    };

    const handleBatchNotify = () => {
        if (selectedIds.length === 0 || !clientFilterId) return;
        setShowBatchModal(true);
    };

    const confirmBatchNotify = (customMessage: string) => {
        const client = getClientById(clientFilterId || '');
        console.log(`Enviando recordatorio masivo a ${client?.email}:`, customMessage);
        addNotification({
            title: 'Recordatorio Masivo Enviado',
            message: `Se han enviado ${selectedIds.length} facturas PDF a ${client?.name}.`,
            type: 'generic',
            link: '/pos/accounts-receivable'
        });
        setShowBatchModal(false);
        setSelectedIds([]);
    };
    
    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('pos.receivable.title')}</h1>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto items-center">
                        {/* Show Batch Button if Filter Active and Items Selected */}
                        {clientFilterId && selectedIds.length > 0 && (
                            <button 
                                onClick={handleBatchNotify}
                                className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center animate-pulse bg-orange-600 hover:bg-orange-700 border-orange-600`}
                            >
                                <EnvelopeIcon className="w-4 h-4 mr-2" />
                                Enviar Recordatorio Masivo ({selectedIds.length})
                            </button>
                        )}

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
                                    onChange={(e) => { setClientSearchInput(e.target.value); if(e.target.value === '') { setClientFilterId(null); setSelectedIds([]); } }}
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
                <DataTable<(typeof receivableData)[0]>
                    data={receivableData}
                    selectedIds={clientFilterId ? selectedIds : undefined} // Only enable selection if filtered by client
                    onSelectionChange={clientFilterId ? setSelectedIds : undefined}
                    expandedIds={Array.from(expandedRows)}
                    renderExpandedRow={(sale) => {
                        const payments = salePayments.filter(p => p.saleId === sale.id);
                        if (payments.length === 0) return <div className="p-4 text-center text-sm text-gray-500">No hay abonos registrados.</div>;
                        return (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Historial de Abonos</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                                                <th className="pb-2 font-medium">Fecha</th>
                                                <th className="pb-2 font-medium">Método</th>
                                                <th className="pb-2 font-medium">Nota</th>
                                                <th className="pb-2 font-medium text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map(p => (
                                                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-600/50 last:border-0">
                                                    <td className="py-2 text-gray-700 dark:text-gray-200">{new Date(p.paymentDate).toLocaleDateString()} {new Date(p.paymentDate).toLocaleTimeString()}</td>
                                                    <td className="py-2 text-gray-700 dark:text-gray-200">{p.paymentMethodUsed}</td>
                                                    <td className="py-2 text-gray-500 dark:text-gray-400 italic">{p.notes}</td>
                                                    <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">${p.amountPaid.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    }}
                    columns={[
                        { header: '', accessor: (sale) => {
                            const isExpanded = expandedRows.has(sale.id);
                            // Allow expansion regardless of payment count, to see "No payments" or add functionality later
                            return (
                                <button onClick={() => toggleRowExpansion(sale.id)} className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                    {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                </button>
                            );
                        }, className: "w-8 px-2" },
                        { header: t('pos.receivable.col.id'), accessor: (s) => s.id.substring(0, 8).toUpperCase() },
                        { header: t('pos.receivable.col.date'), accessor: (s) => new Date(s.date).toLocaleDateString() },
                        { header: t('pos.receivable.col.due_date'), accessor: (sale) => {
                            if (!sale.dueDate) return 'N/A';
                            const today = new Date(); today.setHours(0,0,0,0);
                            const dueDate = new Date(sale.dueDate + 'T00:00:00');
                            const dayDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                            let colorClass = dayDiff < 0 ? 'text-red-600 dark:text-red-400 font-bold' : dayDiff <= 7 ? 'text-yellow-600 dark:text-yellow-400 font-semibold' : 'text-green-600 dark:text-green-400';
                            return <span className={colorClass}>{dueDate.toLocaleDateString()}</span>;
                        }},
                        { header: t('pos.receivable.col.client'), accessor: (s) => getClientById(s.clientId || '')?.name || 'Contado' },
                        { header: t('pos.receivable.col.total'), accessor: (s) => `$${s.totalAmount.toFixed(2)}` },
                        { header: t('pos.receivable.col.paid'), accessor: (s) => `$${s.totalPaid.toFixed(2)}` },
                        { header: t('pos.receivable.col.balance'), accessor: (s) => <span className="font-semibold text-red-600 dark:text-red-400">${s.balance.toFixed(2)}</span> },
                        { header: t('pos.receivable.col.status'), accessor: 'effectiveStatus' },
                    ]}
                    actions={(sale) => (
                        <div className="flex space-x-1">
                            <button onClick={() => requestSendReminder(sale)} className="text-orange-500 p-1" title={t('pos.receivable.action.reminder')}><EnvelopeIcon className="w-4 h-4"/></button>
                            <button onClick={() => handleEditReceivable(sale)} className="text-blue-600 p-1" title={t('pos.receivable.action.edit')}><EditIcon className="w-4 h-4"/></button>
                            <button onClick={() => alert("Función de Imprimir no implementada.")} className="text-blue-600 p-1" title={t('pos.receivable.action.print')}><PrinterIcon className="w-4 h-4"/></button>
                            <button 
                                onClick={() => handleRequestPayment(sale)} // Updated to trigger auth
                                className="text-green-600 p-1" 
                                title={t('pos.receivable.action.payment')} 
                                disabled={sale.balance <= 0}
                            >
                                <BanknotesIcon className="w-4 h-4"/>
                            </button>
                            <button onClick={() => handleVoidReceivable(sale)} className="text-red-600 p-1" title={t('pos.receivable.action.void')}><TrashIconMini className="w-4 h-4"/></button>
                        </div>
                    )}
                />
            </div>

            <AdminAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onConfirm={handleAuthSuccess} />
            <RecordSalePaymentModal isOpen={!!paymentModalSale} onClose={() => setPaymentModalSale(null)} sale={paymentModalSale} onConfirm={handleConfirmPayment} />
            <ReceivableEditModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} saleToEdit={saleToEdit} />
            {saleToVoid && <ConfirmationModal isOpen={showVoidConfirmModal} onClose={() => setShowVoidConfirmModal(false)} onConfirm={confirmVoidReceivable} title={t('pos.receivable.confirm_void.title')} message={t('pos.receivable.confirm_void.message', { id: `VTA-${saleToVoid.id.slice(-6)}` })} confirmButtonText={t('pos.receivable.confirm_void.btn')} />}
            
            <PaymentReminderModal
                isOpen={!!saleForReminder}
                onClose={() => setSaleForReminder(null)}
                sale={saleForReminder}
                clientName={saleForReminder ? (getClientById(saleForReminder.clientId)?.name || '') : ''}
                onSend={handleConfirmSendReminder}
            />

            {/* Batch Reminder Modal */}
            <BatchReminderModal
                isOpen={showBatchModal}
                onClose={() => setShowBatchModal(false)}
                sales={receivableData.filter(s => selectedIds.includes(s.id))}
                clientName={clientFilterId ? (getClientById(clientFilterId)?.name || '') : ''}
                onSend={confirmBatchNotify}
            />
        </div>
    );
};
