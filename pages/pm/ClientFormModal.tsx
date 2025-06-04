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
    const { setClients, clients: allClients } = useData(); // Added allClients for validation
    const initialFormState: ClientFormData = { 
        name: '', 
        lastName: '', 
        email: '', 
        phone: '',
        address: '',
        billingAddress: '',
        clientType: 'Particular',
        companyName: '',
        taxId: '',
        contactPersonName: '',
        preferredCommunication: 'Email',
        clientNotes: '',
        industry: '',
        acquisitionSource: '',
    };
    const [formData, setFormData] = useState<ClientFormData>(initialFormState);

    useEffect(() => {
        if (client && isOpen) {
            setFormData({
                name: client.name,
                lastName: client.lastName,
                email: client.email,
                phone: client.phone,
                address: client.address || '',
                billingAddress: client.billingAddress || '',
                clientType: client.clientType || 'Particular',
                companyName: client.companyName || '',
                taxId: client.taxId || '',
                contactPersonName: client.contactPersonName || '',
                preferredCommunication: client.preferredCommunication || 'Email',
                clientNotes: client.clientNotes || '',
                industry: client.industry || '',
                acquisitionSource: client.acquisitionSource || '',
            });
        } else if (!client && isOpen) {
            setFormData(initialFormState);
        }
    }, [client, isOpen, initialFormState]); // Added initialFormState to dependencies
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic validation for duplicate email
        const isDuplicateEmail = allClients.some(
            c => c.email.toLowerCase() === formData.email.toLowerCase() && (!client || c.id !== client.id)
        );
        if (isDuplicateEmail) {
            alert("Ya existe un cliente con este correo electrónico.");
            return;
        }
        
        // Conditional Tax ID requirement for companies
        if (formData.clientType === 'Empresa' && !formData.taxId?.trim()) {
            alert("El ID Fiscal (RFC/NIF/etc.) es requerido para clientes de tipo 'Empresa'.");
            return;
        }


        if (client) {
            setClients(prev => prev.map(c => c.id === client.id ? {...client, ...formData} : c));
        } else {
            setClients(prev => [...prev, {id: `client-${Date.now()}`, ...formData}]);
        }
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? "Editar Cliente" : "Crear Cliente"} size="xl"> {/* Changed size to xl */}
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Básica</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="clientName" className="block text-xs font-medium">Nombre</label>
                            <input type="text" name="name" id="clientName" value={formData.name} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                        <div>
                            <label htmlFor="clientLastName" className="block text-xs font-medium">Apellido</label>
                            <input type="text" name="lastName" id="clientLastName" value={formData.lastName} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                        <div>
                            <label htmlFor="clientEmail" className="block text-xs font-medium">Email</label>
                            <input type="email" name="email" id="clientEmail" value={formData.email} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                        <div>
                            <label htmlFor="clientPhone" className="block text-xs font-medium">Teléfono Principal</label>
                            <input type="tel" name="phone" id="clientPhone" value={formData.phone} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                    </div>
                </fieldset>
                
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                     <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Detalles Adicionales</legend>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="clientType" className="block text-xs font-medium">Tipo de Cliente</label>
                            <select name="clientType" id="clientType" value={formData.clientType} onChange={handleChange} className={inputFormStyle}>
                                <option value="Particular">Particular</option>
                                <option value="Empresa">Empresa</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="preferredCommunication" className="block text-xs font-medium">Comunicación Preferida</label>
                            <select name="preferredCommunication" id="preferredCommunication" value={formData.preferredCommunication} onChange={handleChange} className={inputFormStyle}>
                                <option value="Email">Email</option>
                                <option value="Teléfono">Teléfono</option>
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                         <div>
                            <label htmlFor="acquisitionSource" className="block text-xs font-medium">Fuente de Adquisición</label>
                            <input type="text" name="acquisitionSource" id="acquisitionSource" placeholder="Ej: Referido, Web, Publicidad" value={formData.acquisitionSource} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                </fieldset>

                {formData.clientType === 'Empresa' && (
                    <fieldset className="border dark:border-neutral-600 p-3 rounded">
                        <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información de Empresa</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="companyName" className="block text-xs font-medium">Nombre de la Empresa</label>
                                <input type="text" name="companyName" id="companyName" value={formData.companyName} onChange={handleChange} className={inputFormStyle} required={formData.clientType === 'Empresa'}/>
                            </div>
                            <div>
                                <label htmlFor="taxId" className="block text-xs font-medium">ID Fiscal (RFC, NIF, etc.)</label>
                                <input type="text" name="taxId" id="taxId" value={formData.taxId} onChange={handleChange} className={inputFormStyle} required={formData.clientType === 'Empresa'}/>
                            </div>
                            <div>
                                <label htmlFor="contactPersonName" className="block text-xs font-medium">Persona de Contacto Principal</label>
                                <input type="text" name="contactPersonName" id="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                            <div>
                                <label htmlFor="industry" className="block text-xs font-medium">Industria / Sector</label>
                                <input type="text" name="industry" id="industry" placeholder="Ej: Restauración, Retail" value={formData.industry} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                        </div>
                    </fieldset>
                )}
                
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Direcciones</legend>
                    <div>
                        <label htmlFor="clientAddress" className="block text-xs font-medium">Dirección Principal (Envío/Servicio)</label>
                        <textarea name="address" id="clientAddress" value={formData.address} onChange={handleChange} rows={2} placeholder="Calle, Número, Colonia, Ciudad, Estado, CP" className={inputFormStyle}/>
                    </div>
                    <div className="mt-3">
                        <label htmlFor="clientBillingAddress" className="block text-xs font-medium">Dirección de Facturación (si es diferente)</label>
                        <textarea name="billingAddress" id="clientBillingAddress" value={formData.billingAddress} onChange={handleChange} rows={2} className={inputFormStyle}/>
                    </div>
                </fieldset>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Notas Adicionales</legend>
                    <div>
                        <label htmlFor="clientNotes" className="sr-only">Notas sobre el cliente</label>
                        <textarea name="clientNotes" id="clientNotes" value={formData.clientNotes} onChange={handleChange} rows={3} placeholder="Anotaciones importantes, historial, preferencias específicas..." className={inputFormStyle}/>
                    </div>
                </fieldset>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Cliente</button>
                </div>
            </form>
        </Modal>
    );
};