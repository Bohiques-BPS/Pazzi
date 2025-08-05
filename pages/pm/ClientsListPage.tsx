import React, { useState } from 'react';
import { Client, ClientFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { ClientFormModal } from './ClientFormModal'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon, EyeIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { AIImportModal } from '../../components/AIImportModal'; // Adjusted path
import { ClientAccountModal } from '../../components/ui/ClientAccountModal';

export const ClientsListPage: React.FC = () => {
    const { clients, setClients } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [selectedClientForAccount, setSelectedClientForAccount] = useState<Client | null>(null);

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
    
    const confirmDelete = () => {
        if(itemToDeleteId) {
            setClients(prev => prev.filter(c => c.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
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
                console.warn(`Ítem ${index} omitido por falta de campos obligatorios (nombre, apellido, email):`, item);
                failedCount++;
                return;
            }

            const newClient: Client = {
                id: `client-ai-${Date.now()}-${index}`,
                name,
                lastName,
                email,
                phone: item.telefono || item.phone || '',
                address: item.direccion || item.address || '',
                billingAddress: item.direccion_facturacion || item.billingAddress || '',
                clientType: item.tipoCliente || item.clientType || 'Particular',
                companyName: item.nombreEmpresa || item.companyName || '',
                taxId: item.idFiscal || item.taxId || '',
                contactPersonName: item.personaContacto || item.contactPersonName || '',
                preferredCommunication: item.comunicacionPreferida || item.preferredCommunication || 'Email',
                clientNotes: item.notas || item.clientNotes || '',
                industry: item.industria || item.industry || '',
                acquisitionSource: item.fuenteAdquisicion || item.acquisitionSource || '',
                isActive: true,
            };
            newClients.push(newClient);
            importedCount++;
        });

        if (newClients.length > 0) {
            setClients(prev => [...prev, ...newClients]);
        }
        
        let message = `${importedCount} clientes importados correctamente.`;
        if (failedCount > 0) {
            message += ` ${failedCount} clientes no pudieron ser importados por falta de datos.`;
        }
        alert(message);
        setShowAIImportModal(false);
    };
    
    const openAccountModal = (client: Client) => {
        setSelectedClientForAccount(client);
        setIsAccountModalOpen(true);
    };

    const columns: TableColumn<Client>[] = [
        { header: 'Nombre', accessor: 'name' },
        { header: 'Apellido', accessor: 'lastName' },
        { header: 'Email', accessor: 'email' },
        { header: 'Teléfono', accessor: 'phone' },
        { header: 'Tipo', accessor: (client) => client.clientType || 'N/A' },
        { header: 'Empresa', accessor: (client) => client.companyName || 'N/A' },
        // { header: 'Dirección', accessor: (client) => client.address || 'N/A' },
        // { header: 'ID Fiscal', accessor: (client) => client.taxId || 'N/A' },
    ];
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Clientes</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                        <SparklesIcon /> Importar con IA
                    </button>
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon /> Crear Cliente</button>
                </div>
            </div>
            <DataTable<Client> data={clients} columns={columns} actions={(client) => (
                <>
                    <button onClick={() => openAccountModal(client)} className="text-gray-500 dark:text-gray-400 p-1" aria-label={`Ver estado de cuenta de ${client.name} ${client.lastName}`}><EyeIcon /></button>
                    <button onClick={() => openModalForEdit(client)} className="text-blue-600 dark:text-blue-400 p-1" aria-label={`Editar ${client.name} ${client.lastName}`}><EditIcon /></button>
                    <button onClick={() => requestDelete(client.id)} className="text-red-600 dark:text-red-400 p-1" aria-label={`Eliminar ${client.name} ${client.lastName}`}><DeleteIcon /></button>
                </>
            )} />
            <ClientFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} client={editingClient} />
             <ClientAccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} client={selectedClientForAccount} />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar este cliente? Esta acción no se puede deshacer."
                confirmButtonText="Sí, Eliminar"
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiClientImportSuccess}
                entityName="Cliente"
                fieldsToExtract="nombre (string), apellido (string), email (string), telefono (opcional), direccion (opcional), tipoCliente ('Particular' o 'Empresa', opcional), nombreEmpresa (opcional), idFiscal (opcional), personaContacto (opcional), comunicacionPreferida ('Email', 'Teléfono', 'WhatsApp', 'Otro', opcional), notas (opcional), industria (opcional), fuenteAdquisicion (opcional)"
                exampleFormat={`{
  "nombre": "Ana",
  "apellido": "García",
  "email": "ana.garcia@example.com",
  "telefono": "555-1234",
  "direccion": "Calle Sol 123, Ciudad Luz",
  "tipoCliente": "Empresa",
  "nombreEmpresa": "Soluciones Creativas S.A.",
  "idFiscal": "GAMA123456XYZ",
  "personaContacto": "Ana García",
  "comunicacionPreferida": "Email",
  "notas": "Cliente importante, requiere atención personalizada.",
  "industria": "Diseño Gráfico",
  "fuenteAdquisicion": "Referido por Juan Pérez"
}`}
            />
        </div>
    );
};