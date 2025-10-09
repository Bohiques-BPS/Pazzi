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
            return clients.slice(0, 10);
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return clients.filter(client =>
            client.name.toLowerCase().includes(lowerSearchTerm) ||
            client.lastName.toLowerCase().includes(lowerSearchTerm) ||
            client.email.toLowerCase().includes(lowerSearchTerm) ||
            (client.phone && client.phone.includes(lowerSearchTerm)) ||
            (client.taxId && client.taxId.toLowerCase().includes(lowerSearchTerm)) ||
            (client.companyName && client.companyName.toLowerCase().includes(lowerSearchTerm))
        ).slice(0, 15);
    }, [clients, searchTerm]);

    const handleSelect = (client: Client) => {
        onClientSelect(client);
        setSearchTerm('');
    };
    
    // Clear search term when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buscar / Seleccionar Cliente" size="lg">
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MagnifyingGlassIcon className="w-5 h-5 text-neutral-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email, teléfono"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={inputFormStyle + " pl-10 !text-lg"}
                            autoFocus
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onOpenCreateClient}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex-shrink-0 flex items-center`}
                    >
                        <UserPlusIcon className="mr-1.5" /> Crear Nuevo
                    </button>
                </div>

                {filteredClients.length > 0 ? (
                    <ul className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                        {filteredClients.map(client => (
                            <li
                                key={client.id}
                                onClick={() => handleSelect(client)}
                                className="p-4 bg-white dark:bg-neutral-700/60 rounded-md border border-neutral-200 dark:border-neutral-600 hover:bg-primary/5 dark:hover:bg-primary/20 hover:border-primary/50 cursor-pointer transition-colors"
                            >
                                <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                                    {client.name} {client.lastName} {client.companyName && <span className="text-base font-normal text-neutral-500">- {client.companyName}</span>}
                                </p>
                                <p className="text-base text-neutral-600 dark:text-neutral-300">
                                    {client.email} {client.phone && `| ${client.phone}`}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-lg text-center text-neutral-500 dark:text-neutral-400 py-8">
                        {searchTerm ? 'No se encontraron clientes.' : 'Comience a escribir para buscar...'}
                    </p>
                )}
            </div>
        </Modal>
    );
};