import React, { useState, useEffect, useCallback } from 'react';
import { Client, ClientFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { ClientFormModal } from './ClientFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, EyeIcon, ClipboardDocumentListIcon, BanknotesIcon, DocumentTextIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ImportModal, type ImportFieldDef } from '../../components/ui/ImportModal';
import { firstName as wpFirstName, lastName as wpLastName } from '../../utils/wpImport';

// Alias/transformaciones incluyen columnas de WordPress/WooCommerce (user_email, billing_*, etc.).
const CLIENT_IMPORT_FIELDS: ImportFieldDef[] = [
    { key: 'name', label: 'Nombre', required: true, aliases: ['nombre', 'name', 'first_name', 'billing_first_name', 'display_name', 'cliente'], transform: wpFirstName },
    { key: 'lastName', label: 'Apellido', aliases: ['apellido', 'last_name', 'billing_last_name', 'lastname'], transform: wpLastName },
    { key: 'email', label: 'Email', aliases: ['email', 'correo', 'user_email', 'billing_email', 'e-mail'] },
    { key: 'phone', label: 'Teléfono', aliases: ['telefono', 'phone', 'billing_phone', 'tel', 'celular'] },
    { key: 'companyName', label: 'Empresa', aliases: ['empresa', 'company', 'billing_company', 'compania'] },
    { key: 'address', label: 'Dirección', aliases: ['direccion', 'address', 'billing_address_1', 'billing_address'] },
    { key: 'city', label: 'Ciudad', aliases: ['ciudad', 'city', 'billing_city'] },
    { key: 'country', label: 'País', aliases: ['pais', 'country', 'billing_country'] },
    { key: 'zip', label: 'Código postal', aliases: ['zip', 'codigo postal', 'postcode', 'billing_postcode', 'cp'] },
    { key: 'taxId', label: 'ID fiscal / RNC', aliases: ['taxid', 'rnc', 'nif', 'cif', 'tax id'] },
];
import { ClientAccountModal } from '../../components/ui/ClientAccountModal';
import { ClientDetailViewModal } from '../../components/ui/ClientDetailViewModal';
import { ClientPOSReportModal } from '../../components/ui/ClientPOSReportModal';
import { ClientInvoiceModal } from '../../components/ui/ClientInvoiceModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { clientsService } from '../../services/clients';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { deleteWithUndo } from '../../utils/deleteWithUndo';
import { PermissionGate } from '../../components/PermissionGate';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export const ClientsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { clients, setClients } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [clientForAccount, setClientForAccount] = useState<Client | null>(null);
    const [clientForDetail, setClientForDetail] = useState<Client | null>(null);
    const [clientForPOSReport, setClientForPOSReport] = useState<Client | null>(null);
    const [clientForInvoice, setClientForInvoice] = useState<Client | null>(null);

    const loadClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await clientsService.getAll();
            setClients(data as Client[]);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [setClients]);

    useEffect(() => { loadClients(); }, [loadClients]);

    const openModalForCreate = (initialData?: Partial<ClientFormData>) => {
        setEditingClient(null);
        if (initialData) {
            setEditingClient({
                id: '',
                ...initialData,
                address: initialData.address || '',
                billingAddress: initialData.billingAddress || '',
                clientType: initialData.clientType || 'Particular',
                companyName: initialData.companyName || '',
                taxId: initialData.taxId || '',
                contactPersonName: initialData.contactPersonName || '',
                preferredCommunication: initialData.preferredCommunication || 'Email',
                clientNotes: initialData.clientNotes || '',
                industry: initialData.industry || '',
                acquisitionSource: initialData.acquisitionSource || '',
            } as Client);
        }
        setShowFormModal(true);
    };

    const openModalForEdit = (client: Client) => {
        setEditingClient(client);
        setShowFormModal(true);
    };

    const requestDelete = (clientId: string) => {
        setItemToDeleteId(clientId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = () => {
        if (!itemToDeleteId) { setShowDeleteConfirmModal(false); return; }
        const id = itemToDeleteId;
        const item = clients.find(c => c.id === id);
        setItemToDeleteId(null);
        setShowDeleteConfirmModal(false);
        deleteWithUndo({
            label: t('entity.client'),
            optimisticRemove: () => setClients(prev => prev.filter(c => c.id !== id)),
            restore: () => setClients(prev => (item && !prev.some(c => c.id === id)) ? [item, ...prev] : prev),
            apiDelete: () => clientsService.delete(id),
            errorMessage: t('pmx.client.delete_error'),
        });
    };

    const columns: TableColumn<Client>[] = [
        {
            header: t('common.name'),
            accessor: (client) => (
                <div className="flex items-center min-w-[120px]">
                    <span className="truncate sm:whitespace-normal">{client.name}</span>
                    {client.isLoss && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800">
                            {t('pmx.client.loss_badge')}
                        </span>
                    )}
                </div>
            ),
        },
        { header: t('client.field.lastname'), accessor: 'lastName' },
        { header: t('common.email'), accessor: 'email', noWrap: false },
        { header: t('common.phone'), accessor: 'phone' },
        { header: t('client.field.type'), accessor: (client) => client.clientType || 'N/A' },
        { header: t('client.field.company'), accessor: (client) => client.companyName || 'N/A', noWrap: false },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">{t('client.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <PermissionGate require="clients.create">
                        <button onClick={() => setShowImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>{t('pmx.common.import')}</button>
                        <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                            <PlusIcon /> {t('client.list.create')}
                        </button>
                    </PermissionGate>
                </div>
            </div>

            {showImportModal && (
                <ImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title={t('pmx.client.import_title')}
                    fields={CLIENT_IMPORT_FIELDS}
                    onImport={(rows) => clientsService.bulkImport(rows)}
                    onDone={loadClients}
                />
            )}

            {isLoading && <LoadingSkeleton variant="table" rows={6} />}

            {!isLoading && clients.length === 0 && (
                <EmptyState
                    title={t('pmx.client.empty_title')}
                    description={t('pmx.client.empty_desc')}
                    cta={
                        <PermissionGate require="clients.create">
                            <button onClick={() => openModalForCreate()} className={BUTTON_PRIMARY_SM_CLASSES}>
                                {t('pmx.client.create_first')}
                            </button>
                        </PermissionGate>
                    }
                />
            )}

            {!isLoading && clients.length > 0 && (
                <DataTable<Client> onRowClick={openModalForEdit}
                    data={clients}
                    columns={columns}
                    actions={(client) => (
                        <div className="flex items-center gap-0.5">
                            <PermissionGate require="clients.view">
                                <button
                                    onClick={() => setClientForDetail(client)}
                                    className="text-teal-600 dark:text-teal-400 p-1 hover:text-teal-800"
                                    title={t('pmx.client.view_details')}
                                    aria-label={t('pmx.client.details_of', { name: client.name })}
                                >
                                    <EyeIcon className="w-5 h-5" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.viewAccount">
                                <button
                                    onClick={() => setClientForAccount(client)}
                                    className="text-purple-600 dark:text-purple-400 p-1 hover:text-purple-800"
                                    title={t('pmx.client.account_360')}
                                    aria-label={t('pmx.client.account_of', { name: client.name })}
                                >
                                    <BanknotesIcon className="w-5 h-5" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.viewAccount">
                                <button
                                    onClick={() => setClientForPOSReport(client)}
                                    className="text-emerald-600 dark:text-emerald-400 p-1 hover:text-emerald-800"
                                    title={t('pmx.client.pos_report')}
                                    aria-label={t('pmx.client.pos_report_of', { name: client.name })}
                                >
                                    <ClipboardDocumentListIcon className="w-5 h-5" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.viewAccount">
                                <button
                                    onClick={() => setClientForInvoice(client)}
                                    className="text-indigo-600 dark:text-indigo-400 p-1 hover:text-indigo-800"
                                    title={t('pmx.client.generate_invoice')}
                                    aria-label={t('pmx.client.generate_invoice_to', { name: client.name })}
                                >
                                    <DocumentTextIcon className="w-5 h-5" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.edit">
                                <button
                                    onClick={() => openModalForEdit(client)}
                                    className="text-blue-600 dark:text-blue-400 p-1 hover:text-blue-800"
                                    title={t('common.edit')}
                                    aria-label={t('pmx.client.edit_name', { name: `${client.name} ${client.lastName}` })}
                                >
                                    <EditIcon className="w-5 h-5" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.delete">
                                <button
                                    onClick={() => requestDelete(client.id)}
                                    className="text-red-600 dark:text-red-400 p-1 hover:text-red-800"
                                    title={t('common.delete')}
                                    aria-label={t('pmx.client.delete_name', { name: `${client.name} ${client.lastName}` })}
                                >
                                    <DeleteIcon className="w-5 h-5" />
                                </button>
                            </PermissionGate>
                        </div>
                    )}
                />
            )}

            <ClientFormModal
                isOpen={showFormModal}
                onClose={() => { setShowFormModal(false); loadClients(); }}
                client={editingClient}
            />
            <ClientAccountModal
                isOpen={!!clientForAccount}
                onClose={() => setClientForAccount(null)}
                client={clientForAccount}
            />
            <ClientDetailViewModal
                isOpen={!!clientForDetail}
                onClose={() => setClientForDetail(null)}
                client={clientForDetail}
            />
            <ClientPOSReportModal
                isOpen={!!clientForPOSReport}
                onClose={() => setClientForPOSReport(null)}
                clientId={clientForPOSReport?.id || ''}
                clientName={clientForPOSReport ? `${clientForPOSReport.name} ${clientForPOSReport.lastName || ''}` : undefined}
            />
            <ClientInvoiceModal
                isOpen={!!clientForInvoice}
                onClose={() => setClientForInvoice(null)}
                client={clientForInvoice}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => { setShowDeleteConfirmModal(false); setItemToDeleteId(null); }}
                onConfirm={confirmDelete}
                title={t('pmx.client.confirm_delete_title')}
                message={t('pmx.client.confirm_delete_msg')}
                confirmButtonText={t('pmx.common.yes_delete')}
                cancelButtonText={t('common.cancel')}
            />
        </div>
    );
};
