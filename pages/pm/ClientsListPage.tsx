import React, { useState, useEffect, useCallback } from 'react';
import { Client, ClientFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { ClientFormModal } from './ClientFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, EyeIcon, ClipboardDocumentListIcon, BanknotesIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { ClientAccountModal } from '../../components/ui/ClientAccountModal';
import { ClientDetailViewModal } from '../../components/ui/ClientDetailViewModal';
import { ClientPOSReportModal } from '../../components/ui/ClientPOSReportModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { clientsService } from '../../services/clients';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { PermissionGate } from '../../components/PermissionGate';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export const ClientsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { clients, setClients } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [clientForAccount, setClientForAccount] = useState<Client | null>(null);
    const [clientForDetail, setClientForDetail] = useState<Client | null>(null);
    const [clientForPOSReport, setClientForPOSReport] = useState<Client | null>(null);

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

    const confirmDelete = async () => {
        if (!itemToDeleteId) {
            setShowDeleteConfirmModal(false);
            return;
        }
        try {
            await clientsService.delete(itemToDeleteId);
            setClients(prev => prev.filter(c => c.id !== itemToDeleteId));
            toast.success('Cliente eliminado');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al eliminar cliente');
        } finally {
            setItemToDeleteId(null);
            setShowDeleteConfirmModal(false);
        }
    };

    const columns: TableColumn<Client>[] = [
        {
            header: t('common.name'),
            accessor: (client) => (
                <div className="flex items-center min-w-[120px]">
                    <span className="truncate sm:whitespace-normal">{client.name}</span>
                    {client.isLoss && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800">
                            Pérdida
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
                        <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                            <PlusIcon /> {t('client.list.create')}
                        </button>
                    </PermissionGate>
                </div>
            </div>

            {isLoading && <LoadingSkeleton variant="table" rows={6} />}

            {!isLoading && clients.length === 0 && (
                <EmptyState
                    title="Sin clientes"
                    description="Aún no hay clientes registrados. Crea el primero para empezar."
                    cta={
                        <PermissionGate require="clients.create">
                            <button onClick={() => openModalForCreate()} className={BUTTON_PRIMARY_SM_CLASSES}>
                                + Crear primer cliente
                            </button>
                        </PermissionGate>
                    }
                />
            )}

            {!isLoading && clients.length > 0 && (
                <DataTable<Client>
                    data={clients}
                    columns={columns}
                    actions={(client) => (
                        <div className="flex items-center gap-0.5">
                            <PermissionGate require="clients.view">
                                <button
                                    onClick={() => setClientForDetail(client)}
                                    className="text-teal-600 dark:text-teal-400 p-1 hover:text-teal-800"
                                    title="Ver detalles"
                                    aria-label={`Detalles de ${client.name}`}
                                >
                                    <EyeIcon />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.viewAccount">
                                <button
                                    onClick={() => setClientForAccount(client)}
                                    className="text-purple-600 dark:text-purple-400 p-1 hover:text-purple-800"
                                    title="Estado de cuenta (vista 360°)"
                                    aria-label={`Estado de cuenta de ${client.name}`}
                                >
                                    <BanknotesIcon className="w-4 h-4" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.viewAccount">
                                <button
                                    onClick={() => setClientForPOSReport(client)}
                                    className="text-emerald-600 dark:text-emerald-400 p-1 hover:text-emerald-800"
                                    title="Reporte de ventas POS"
                                    aria-label={`Reporte POS de ${client.name}`}
                                >
                                    <ClipboardDocumentListIcon className="w-4 h-4" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.edit">
                                <button
                                    onClick={() => openModalForEdit(client)}
                                    className="text-blue-600 dark:text-blue-400 p-1 hover:text-blue-800"
                                    title="Editar"
                                    aria-label={`Editar ${client.name} ${client.lastName}`}
                                >
                                    <EditIcon />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="clients.delete">
                                <button
                                    onClick={() => requestDelete(client.id)}
                                    className="text-red-600 dark:text-red-400 p-1 hover:text-red-800"
                                    title="Eliminar"
                                    aria-label={`Eliminar ${client.name} ${client.lastName}`}
                                >
                                    <DeleteIcon />
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

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
        </div>
    );
};
