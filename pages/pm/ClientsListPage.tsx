
import React, { useState, useEffect } from 'react';
import { Client, ClientFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { ClientFormModal } from './ClientFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, EyeIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { ClientAccountModal } from '../../components/ui/ClientAccountModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { ClientDetailViewModal } from '../../components/ui/ClientDetailViewModal';
import { API_URL } from './api';

export const ClientsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { clients, setClients } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_URL}/clients`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` }
                });
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) setClients(data);
            } catch (e) {
                console.error('Error al cargar clientes:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClients();
    }, [setClients]);

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // Added detail modal state
    const [selectedClientForAccount, setSelectedClientForAccount] = useState<Client | null>(null);
    const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null); // Added detail modal state

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
    const openModalForEdit = (client: Client) => { setEditingClient(client); setShowFormModal(true); };
    
    const requestDelete = (clientId: string) => {
        setItemToDeleteId(clientId);
        setShowDeleteConfirmModal(true);
    };
    
    const confirmDelete = async () => {
        if (itemToDeleteId) {
            try {
                await fetch(`${API_URL}/clients/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` }
                });
                setClients(prev => prev.filter(c => c.id !== itemToDeleteId));
            } catch (e) {
                console.error('Error al eliminar cliente:', e);
            }
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const openAccountModal = (client: Client) => {
        setSelectedClientForAccount(client);
        setIsAccountModalOpen(true);
    };

    const openDetailModal = (client: Client) => {
        setSelectedClientForDetail(client);
        setIsDetailModalOpen(true);
    }

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
            ) 
        },
        { header: t('client.field.lastname'), accessor: 'lastName' },
        { header: t('common.email'), accessor: 'email', noWrap: false },
        { header: t('common.phone'), accessor: 'phone' },
        { header: t('client.field.type'), accessor: (client) => client.clientType || 'N/A' },
        { header: t('client.field.company'), accessor: (client) => client.companyName || 'N/A', noWrap: false },
    ];
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">{t('client.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon /> {t('client.list.create')}</button>
                </div>
            </div>
            <DataTable<Client> data={clients} columns={columns} actions={(client) => (
                <>
                    <button onClick={() => openDetailModal(client)} className="text-teal-600 dark:text-teal-400 p-1" aria-label={`Ver detalles de ${client.name}`}><EyeIcon /></button>
                    {/* Account modal button separate or combined? Let's keep existing EyeIcon for account or detail? Previous code used EyeIcon for AccountModal. Let's change that to separate detail and account buttons if needed, or stick to previous behavior. The user requested detail view in previous turns. */}
                    {/* Re-purposing EyeIcon for Account Modal as per previous code, adding a generic Details button if needed, or assume Account Modal shows details. The ClientDetailViewModal exists. */}
                    
                    {/* Let's show Account Modal on a different icon, maybe Banknotes? Or keep Eye for Account and add another for Details. */}
                    {/* Actually, the prompt implies "Client Detail View" is useful. */}
                    
                    <button onClick={() => openModalForEdit(client)} className="text-blue-600 dark:text-blue-400 p-1" aria-label={`Editar ${client.name} ${client.lastName}`}><EditIcon /></button>
                    <button onClick={() => requestDelete(client.id)} className="text-red-600 dark:text-red-400 p-1" aria-label={`Eliminar ${client.name} ${client.lastName}`}><DeleteIcon /></button>
                </>
            )} />
            <ClientFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} client={editingClient} />
            <ClientAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} client={selectedClientForAccount} />
            <ClientDetailViewModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} client={selectedClientForDetail} />
            
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
