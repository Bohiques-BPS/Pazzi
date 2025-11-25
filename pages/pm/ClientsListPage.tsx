
import React, { useState, useMemo, useEffect } from 'react';
import { Client, ClientFormData, Project } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { DataTable, TableColumn } from '../../components/DataTable'; 
import { ClientFormModal } from './ClientFormModal'; 
import { ConfirmationModal } from '../../components/Modal'; 
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon, EyeIcon, EllipsisVerticalIcon, BriefcaseIcon, ClipboardDocumentListIcon, BanknotesIcon, EnvelopeIcon, ListBulletIcon } from '../../components/icons'; 
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; 
import { AIImportModal } from '../../components/AIImportModal'; 
import { ClientAccountModal } from '../../components/ui/ClientAccountModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { ClientDetailViewModal } from '../../components/ui/ClientDetailViewModal';
import { ClientEstimatesModal } from '../../components/ui/ClientEstimatesModal';
import { ClientPOSReportModal } from '../../components/ui/ClientPOSReportModal';
import { ClientProjectsListModal } from '../../components/ui/ClientProjectsListModal';
import { ClientContactModal } from '../../components/ui/ClientContactModal';

export const ClientsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { clients, setClients, projects, sales } = useData();
    
    // --- Modal States ---
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [showAIImportModal, setShowAIImportModal] = useState(false);
    
    // Detail & Action Modals
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isEstimatesModalOpen, setIsEstimatesModalOpen] = useState(false);
    const [isPOSReportModalOpen, setIsPOSReportModalOpen] = useState(false);
    const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // --- Dropdown Management (Fixed Position Strategy) ---
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
    const [dropdownClient, setDropdownClient] = useState<Client | null>(null);

    const handleDropdownClick = (event: React.MouseEvent<HTMLButtonElement>, client: Client) => {
        event.stopPropagation();
        // Toggle functionality
        if (openDropdownId === client.id) {
            closeDropdown();
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 2, // Just below the button
                left: rect.right - 224 // Align right edge (w-56 is approx 224px)
            });
            setOpenDropdownId(client.id);
            setDropdownClient(client);
        }
    };

    const closeDropdown = () => {
        setOpenDropdownId(null);
        setDropdownClient(null);
    };

    // Close dropdown on scroll or resize to prevent it floating detached
    useEffect(() => {
        const handleScrollOrResize = () => {
            if (openDropdownId) {
                closeDropdown();
            }
        };
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [openDropdownId]);

    // --- Handlers ---
    const openModalForCreate = (initialData?: Partial<ClientFormData>) => { 
        setEditingClient(null); 
        if (initialData) {
            setEditingClient({ id: '', ...initialData } as Client); 
        }
        setShowFormModal(true); 
    };
    
    const openModalForEdit = (client: Client) => { 
        setEditingClient(client); 
        setShowFormModal(true); 
        closeDropdown();
    };
    
    const requestDelete = (clientId: string) => {
        setItemToDeleteId(clientId);
        setShowDeleteConfirmModal(true);
        closeDropdown();
    };
    
    const confirmDelete = () => {
        if(itemToDeleteId) {
            setClients(prev => prev.filter(c => c.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    // Helper to get client projects
    const getClientProjects = (clientId: string): Project[] => {
        return projects.filter(p => p.clientId === clientId);
    };

    const handleAiClientImportSuccess = (dataArray: any[]) => {
        console.log("AI Data Array for Client Import:", dataArray);
        if (!Array.isArray(dataArray)) {
            alert("La IA no devolvió un array de datos de clientes.");
            return;
        }
        let importedCount = 0;
        let failedCount = 0;
        const newClients: Client[] = [];
        dataArray.forEach((item, index) => {
            const name = item.nombre || item.name || '';
            const lastName = item.apellido || item.lastName || '';
            const email = item.email || '';
            if (!name || !lastName || !email) {
                failedCount++;
                return;
            }
            const newClient: Client = {
                id: `client-ai-${Date.now()}-${index}`,
                name, lastName, email,
                phone: item.telefono || item.phone || '',
                address: item.direccion || item.address || '',
                billingAddress: item.direccion_facturacion || item.billingAddress || '',
                clientType: item.tipoCliente || 'Particular',
                companyName: item.nombreEmpresa || '',
                taxId: item.idFiscal || '',
                contactPersonName: item.personaContacto || '',
                preferredCommunication: item.comunicacionPreferida || 'Email',
                clientNotes: item.notas || '',
                industry: item.industria || '',
                acquisitionSource: item.fuenteAdquisicion || '',
                isActive: true,
            };
            newClients.push(newClient);
            importedCount++;
        });
        if (newClients.length > 0) {
            setClients(prev => [...prev, ...newClients]);
        }
        alert(`${importedCount} clientes importados. ${failedCount} fallaron.`);
        setShowAIImportModal(false);
    };

    const columns: TableColumn<Client>[] = [
        { 
            header: t('common.name'), 
            accessor: (client) => (
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold mr-3">
                        {client.name.charAt(0)}{client.lastName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-semibold">{client.name} {client.lastName}</p>
                        {client.isLoss && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">Pérdida</span>}
                    </div>
                </div>
            ) 
        },
        { header: t('common.email'), accessor: 'email', className: 'hidden md:table-cell' },
        { header: t('common.phone'), accessor: 'phone', className: 'hidden sm:table-cell' },
        { header: t('client.field.type'), accessor: (client) => <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{client.clientType}</span>, className: 'hidden lg:table-cell' },
    ];

    return (
        <div onClick={closeDropdown} className="min-h-[80vh]"> {/* Wrapper to catch outside clicks */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">{t('client.list.title')}</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Gestione la información, proyectos y estados de cuenta de sus clientes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                        <SparklesIcon className="mr-1.5" /> {t('common.import_ai')}
                    </button>
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon className="mr-1.5"/> {t('client.list.create')}</button>
                </div>
            </div>

            <DataTable<Client> 
                data={clients} 
                columns={columns} 
                actions={(client) => (
                    <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => handleDropdownClick(e, client)} 
                            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                            aria-haspopup="true"
                            aria-expanded={openDropdownId === client.id}
                        >
                            <EllipsisVerticalIcon />
                        </button>
                        {/* Dropdown removed from here to avoid clipping */}
                    </div>
                )} 
            />

            {/* Detached Dropdown Menu (Fixed Position) */}
            {openDropdownId && dropdownClient && (
                <div 
                    className="fixed z-50 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1 max-h-[80vh] overflow-y-auto">
                        <div className="px-4 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b dark:border-neutral-700">Gestión</div>
                        <button onClick={() => { setSelectedClient(dropdownClient); setIsDetailModalOpen(true); closeDropdown(); }} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <EyeIcon className="w-4 h-4 mr-2 text-blue-500" /> Ver Perfil Completo
                        </button>
                        <button onClick={() => openModalForEdit(dropdownClient)} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <EditIcon className="w-4 h-4 mr-2 text-amber-500" /> Editar Información
                        </button>

                        <div className="px-4 py-2 mt-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-t dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30">Finanzas</div>
                        <button onClick={() => { setSelectedClient(dropdownClient); setIsAccountModalOpen(true); closeDropdown(); }} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <BanknotesIcon className="w-4 h-4 mr-2 text-green-600" /> Estado de Cuenta (CxC)
                        </button>
                        <button onClick={() => { setSelectedClient(dropdownClient); setIsPOSReportModalOpen(true); closeDropdown(); }} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <ListBulletIcon className="w-4 h-4 mr-2 text-purple-500" /> Historial Facturas / Payouts
                        </button>
                        <button onClick={() => { setSelectedClient(dropdownClient); setIsEstimatesModalOpen(true); closeDropdown(); }} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <ClipboardDocumentListIcon className="w-4 h-4 mr-2 text-teal-500" /> Ver Estimados
                        </button>

                        <div className="px-4 py-2 mt-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-t dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30">Operaciones</div>
                        <button onClick={() => { setSelectedClient(dropdownClient); setIsProjectsModalOpen(true); closeDropdown(); }} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <BriefcaseIcon className="w-4 h-4 mr-2 text-indigo-500" /> Ver Proyectos ({getClientProjects(dropdownClient.id).length})
                        </button>
                        <button onClick={() => { setSelectedClient(dropdownClient); setIsContactModalOpen(true); closeDropdown(); }} className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <EnvelopeIcon className="w-4 h-4 mr-2 text-orange-500" /> Enviar Notificación
                        </button>
                        
                        <div className="border-t dark:border-neutral-700 mt-1"></div>
                        <button onClick={() => requestDelete(dropdownClient.id)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <DeleteIcon className="w-4 h-4 mr-2" /> Eliminar Cliente
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <ClientFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} client={editingClient} />
            
            <ClientDetailViewModal 
                isOpen={isDetailModalOpen} 
                onClose={() => setIsDetailModalOpen(false)} 
                client={selectedClient} 
            />
            
            <ClientAccountModal 
                isOpen={isAccountModalOpen} 
                onClose={() => setIsAccountModalOpen(false)} 
                client={selectedClient} 
            />
            
            <ClientEstimatesModal 
                isOpen={isEstimatesModalOpen} 
                onClose={() => setIsEstimatesModalOpen(false)} 
                client={selectedClient} 
                onLoadItems={() => {}} 
                isCartEmpty={true} 
                onCreateFromCart={() => {}} 
            />
            
            <ClientPOSReportModal
                isOpen={isPOSReportModalOpen}
                onClose={() => setIsPOSReportModalOpen(false)}
                clientId={selectedClient?.id || ''}
                monthSales={sales.filter(s => s.clientId === selectedClient?.id)} 
            />

            <ClientProjectsListModal
                isOpen={isProjectsModalOpen}
                onClose={() => setIsProjectsModalOpen(false)}
                clientName={selectedClient ? `${selectedClient.name} ${selectedClient.lastName}` : ''}
                projects={selectedClient ? getClientProjects(selectedClient.id) : []}
            />

            <ClientContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                client={selectedClient}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiClientImportSuccess}
                entityName="Cliente"
                fieldsToExtract="nombre, apellido, email, telefono, direccion..."
                exampleFormat="{}"
            />
        </div>
    );
};
