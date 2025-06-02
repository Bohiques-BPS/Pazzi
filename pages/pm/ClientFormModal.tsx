
import React, { useState, useEffect } from 'react';
import { Client, ClientFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({isOpen, onClose, client}) => {
    const { setClients } = useData();
    const [formData, setFormData] = useState<ClientFormData>({ name: '', lastName: '', email: '', phone: ''});

    useEffect(() => {
        if (client) setFormData(client);
        else setFormData({ name: '', lastName: '', email: '', phone: ''});
    }, [client, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (client) {
            setClients(prev => prev.map(c => c.id === client.id ? {...client, ...formData} : c));
        } else {
            setClients(prev => [...prev, {id: `client-${Date.now()}`, ...formData}]);
        }
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? "Editar Cliente" : "Crear Cliente"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" className={inputFormStyle + " w-full"} required/>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Apellido" className={inputFormStyle + " w-full"} required/>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className={inputFormStyle + " w-full"} required/>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Teléfono" className={inputFormStyle + " w-full"}/>
                <div className="flex justify-end space-x-2 pt-2"><button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button><button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar</button></div>
            </form>
        </Modal>
    );
};
