
import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { Modal } from './Modal';
import { MagnifyingGlassIcon, UserPlusIcon } from './icons';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../constants';

interface ClientSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    onClientSelect: (client: Client) => void;
    onOpenCreateClient: () => void;
}

export const ClientSearchModal: React.FC<ClientSearchModalProps> = ({
    isOpen,
    onClose,
    clients,
    onClientSelect,
    onOpenCreateClient
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = useMemo(() => {
        if (!searchTerm.trim()) {
            return clients.slice(0, 10); // Show some initial clients or recently used ones if available
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.name.toLowerCase().includes(lowerSearchTerm) ||
            client.lastName.toLowerCase().includes(lowerSearchTerm) ||
            client.email.toLowerCase().includes(lowerSearchTerm) ||
            (client.phone && client.phone.includes(lowerSearchTerm)) ||
            (client.taxId && client.taxId.toLowerCase().includes(lowerSearchTerm)) ||
            (client.companyName && client.companyName.toLowerCase().includes(lowerSearchTerm))
        ).slice(0, 15); // Limit results
    }, [clients, searchTerm]);

    const handleSelect = (client: Client) => {
        onClientSelect(client);
        setSearchTerm(''); // Reset search
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buscar / Seleccionar Cliente" size="lg">
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email, teléfono, RFC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={inputFormStyle + " pl-9"}
                            autoFocus
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onOpenCreateClient}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} flex-shrink-0 flex items-center`}
                    >
                        <UserPlusIcon className="mr-1.5" /> Crear Nuevo
                    </button>
                </div>

                {filteredClients.length > 0 ? (
                    <ul className="max-h-80 overflow-y-auto space-y-1 pr-1">
                        {filteredClients.map(client => (
                            <li
                                key={client.id}
                                onClick={() => handleSelect(client)}
                                className="p-2.5 bg-neutral-50 dark:bg-neutral-700/60 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 cursor-pointer transition-colors"
                            >
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                    {client.name} {client.lastName} {client.companyName && `(${client.companyName})`}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {client.email} {client.phone && `| ${client.phone}`} {client.taxId && `| RFC: ${client.taxId}`}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-4">
                        {searchTerm ? 'No se encontraron clientes.' : 'Comience a escribir para buscar...'}
                    </p>
                )}
            </div>
        </Modal>
    );
};
