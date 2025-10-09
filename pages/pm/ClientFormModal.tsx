import React, { useState, useEffect } from 'react';
import { Client, ClientFormData, Project } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, CLIENT_PRICE_LEVEL_OPTIONS } from '../../constants'; // Adjusted path
import { TrashIconMini } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

interface ClientFormModalProps {
    isOpen: boolean;
    onClose: (updatedClient?: Client) => void;
    client: Client | null;
}

// Mock data for dropdowns based on screenshots
const paymentTermsOptions = ['Neto', 'N-15 DIAS', 'N-30 DIAS', 'N-60 DIAS', 'Contado'];
const clientCategoryOptions = ['Cliente General', 'Contratista', 'Cliente VIP', 'Gubernamental'];
const salespersonOptions = ['ADM ADM', 'Vendedor 1', 'Vendedor 2'];

export const ClientFormModal: React.FC<ClientFormModalProps> = ({isOpen, onClose, client}) => {
    const { setClients, clients: allClients, projects } = useData();
    
    const [activeTab, setActiveTab] = useState('General');
    const tabs = ['General', 'Impuestos', 'Facturación', 'Cobros', 'Envío', 'Loyalty', 'Foto'];
    
    const initialFormState: ClientFormData = { 
        name: '', 
        lastName: '', 
        email: '', 
        phone: '',
        isActive: true,
        address: '', city: '', country: '', zip: '',
        phone2: '', fax: '',
        contactPersonName: '',
        socialSecurity: '', dateOfBirth: '',
        clientNotes: '',
        taxId: '', stateTaxRate: 0, municipalTaxRate: 0, municipalTaxExemptionUntil: '',
        billingAddress: '',
        creditLimit: 0, paymentTerms: paymentTermsOptions[0], showBalance: false,
        category: clientCategoryOptions[0],
        salesperson: salespersonOptions[0],
        priceLevel: CLIENT_PRICE_LEVEL_OPTIONS[0],
        businessType: '', zone: '',
        clientType: 'Particular', companyName: '',
        preferredCommunication: 'Email', industry: '', acquisitionSource: '',
        balance: 0,
        specialInvoiceMessageEnabled: false,
        chargeType: 'discountOnPrice',
        chargeValueType: 'percentage',
        chargeValue: 0,
        chargeCode: '',
        images: [],
        loyaltyPoints: 0,
        loyaltyLevel: '',
        shippingAddress: '',
        shippingContactName: '',
        shippingContactPhone: '',
        preferredCarrier: '',
        projectIds: [],
    };
    const [formData, setFormData] = useState<ClientFormData>(initialFormState);
    const [newImageUrl, setNewImageUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setFormData({
                    ...initialFormState,
                    ...client,
                    projectIds: client.projectIds || [],
                    chargeType: client.chargeType || 'discountOnPrice',
                    chargeValueType: client.chargeValueType || 'percentage',
                    chargeValue: client.chargeValue || 0,
                    images: client.images || [],
                });
            } else {
                setFormData(initialFormState);
            }
            setActiveTab('General');
            setNewImageUrl('');
        }
    }, [client, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'projectIds') {
            const selectedOptions = (e.target as HTMLSelectElement).options;
            const selectedProjectIds: string[] = [];
            for (let i = 0; i < selectedOptions.length; i++) {
                if (selectedOptions[i].selected) {
                    selectedProjectIds.push(selectedOptions[i].value);
                }
            }
            setFormData(prev => ({ ...prev, projectIds: selectedProjectIds }));
        } else if (type === 'checkbox') {
             setFormData(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked}));
        } else {
            setFormData(prev => ({...prev, [name]: type === 'number' ? (parseFloat(value) || 0) : value}));
        }
    };

    const handleAddImage = () => {
        if (newImageUrl.trim() && !formData.images?.includes(newImageUrl.trim())) {
            setFormData(prev => ({ ...prev, images: [...(prev.images || []), newImageUrl.trim()] }));
            setNewImageUrl('');
        }
    };
    const handleRemoveImage = (urlToRemove: string) => {
        setFormData(prev => ({ ...prev, images: prev.images?.filter(url => url !== urlToRemove) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const isDuplicateEmail = allClients.some(
            c => c.email.toLowerCase() === formData.email.toLowerCase() && (!client || c.id !== client.id)
        );
        if (isDuplicateEmail) {
            alert("Ya existe un cliente con este correo electrónico.");
            return;
        }

        if (client) {
            const updatedClient: Client = { ...client, ...formData };
            setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
            onClose(updatedClient);
        } else {
            const newClient: Client = {
                ...initialFormState, 
                ...formData, 
                id: `client-${Date.now()}`,
                createdDate: new Date().toISOString().split('T')[0],
             };
            setClients(prev => [...prev, newClient]);
            onClose(newClient);
        }
    };
    
    const renderGeneralTab = () => (
        <div className="space-y-3">
            <div><label className="block text-sm font-medium">Nombre</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle} required/></div>
            <div><label className="block text-sm font-medium">Apellido</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputFormStyle} /></div>
            <div>
                <label className="block text-sm font-medium">Proyectos Asociados</label>
                <select
                    name="projectIds"
                    multiple
                    value={formData.projectIds}
                    onChange={handleChange}
                    className={inputFormStyle + " h-24"}
                >
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">Mantenga presionado Ctrl (o Cmd en Mac) para seleccionar múltiples proyectos.</p>
            </div>
            <div><label className="block text-sm font-medium">Dirección Principal</label><input type="text" name="address" value={formData.address} onChange={handleChange} className={inputFormStyle} /></div>
            <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm font-medium">Ciudad</label><input type="text" name="city" value={formData.city} onChange={handleChange} className={inputFormStyle} /></div>
                <div><label className="block text-sm font-medium">País</label><input type="text" name="country" value={formData.country} onChange={handleChange} className={inputFormStyle} /></div>
                <div><label className="block text-sm font-medium">Zip</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} className={inputFormStyle} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <div><label className="block text-sm font-medium">Teléfono</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputFormStyle} required/></div>
                 <div><label className="block text-sm font-medium">Teléfono 2</label><input type="tel" name="phone2" value={formData.phone2} onChange={handleChange} className={inputFormStyle} /></div>
            </div>
            <div><label className="block text-sm font-medium">Fax</label><input type="tel" name="fax" value={formData.fax} onChange={handleChange} className={inputFormStyle} /></div>
            <div><label className="block text-sm font-medium">E-Mail</label><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required/></div>
            <div><label className="block text-sm font-medium">Persona de Contacto</label><input type="text" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className={inputFormStyle}/></div>
             <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm font-medium">Social Security</label><input type="text" name="socialSecurity" value={formData.socialSecurity} onChange={handleChange} className={inputFormStyle} /></div>
                <div><label className="block text-sm font-medium">Fecha Nacimiento</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputFormStyle} /></div>
            </div>
            <div>
                <label className="block text-sm font-medium">Comentarios</label>
                <RichTextEditor value={formData.clientNotes || ''} onChange={(value) => setFormData(prev => ({...prev, clientNotes: value}))} placeholder="Notas sobre el cliente..." />
            </div>
            <div className="pt-2"><label className="flex items-center text-sm"><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Activo</label></div>
        </div>
    );

    const renderImpuestosTab = () => (
         <div className="space-y-4 max-w-md">
            <fieldset className="border p-3 rounded dark:border-neutral-600">
                <legend className="text-sm font-medium px-1">Responsabilidad Contributiva</legend>
                <div className="grid grid-cols-2 gap-4 pt-2">
                     <div><label className="block text-sm font-medium">Estatal (%)</label><input type="number" name="stateTaxRate" value={formData.stateTaxRate} onChange={handleChange} className={inputFormStyle} step="0.01"/></div>
                     <div><label className="block text-sm font-medium">Municipal (%)</label><input type="number" name="municipalTaxRate" value={formData.municipalTaxRate} onChange={handleChange} className={inputFormStyle} step="0.01"/></div>
                </div>
            </fieldset>
            <div><label className="block text-sm font-medium">ID Fiscal (RFC/NIF)</label><input type="text" name="taxId" value={formData.taxId} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">Exención IVU Municipal - Válido Hasta</label><input type="date" name="municipalTaxExemptionUntil" value={formData.municipalTaxExemptionUntil} onChange={handleChange} className={inputFormStyle}/></div>
        </div>
    );
    
    const renderFacturacionTab = () => (
        <div className="space-y-4 max-w-lg">
            <div><label className="block text-sm font-medium">Dirección de Facturación</label><textarea name="billingAddress" value={formData.billingAddress} onChange={handleChange} rows={2} className={inputFormStyle}></textarea></div>

            <label className="flex items-center text-sm font-medium pt-2">
                <input type="checkbox" name="specialInvoiceMessageEnabled" checked={!!formData.specialInvoiceMessageEnabled} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Mensaje Especial en la Factura
            </label>
            <p className="text-xs text-neutral-500 -mt-3 ml-6">El mensaje se puede configurar en: Mantenimiento - Opciones - Otras Opciones - Recibos Facturas</p>
            
            <fieldset className="border p-4 rounded dark:border-neutral-600">
                <legend className="text-lg font-semibold px-2 text-primary">Tipo de Cobro Acordado</legend>
                <div className="flex items-start gap-6 mt-2">
                    <div className="space-y-2.5">
                        <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="chargeType" value="discountOnPrice" checked={formData.chargeType === 'discountOnPrice'} onChange={handleChange} className="form-radio mr-1.5"/> Descuento al Precio</label>
                        <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="chargeType" value="markupOnCost" checked={formData.chargeType === 'markupOnCost'} onChange={handleChange} className="form-radio mr-1.5"/> Sobre el Costo</label>
                    </div>
                    <div className="border p-2 rounded flex items-center gap-2 bg-neutral-50 dark:bg-neutral-700/50">
                        <div className="space-y-1.5">
                            <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="chargeValueType" value="percentage" checked={formData.chargeValueType === 'percentage'} onChange={handleChange} className="form-radio mr-1.5"/> %</label>
                            <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="chargeValueType" value="fixed" checked={formData.chargeValueType === 'fixed'} onChange={handleChange} className="form-radio mr-1.5"/> $</label>
                        </div>
                        <input type="number" name="chargeValue" value={formData.chargeValue} onChange={handleChange} className={`${inputFormStyle} w-24`} step="0.01" />
                    </div>
                </div>
                 <div className="mt-4">
                    <label className="block text-sm font-medium">Contraseña/Código</label>
                    <input type="password" name="chargeCode" value={formData.chargeCode} onChange={handleChange} className={inputFormStyle + " w-32"} />
                </div>
            </fieldset>
        </div>
    );
    
    const renderCobrosTab = () => (
        <div className="space-y-3">
             <div><label className="block text-sm font-medium">Balance</label><input type="text" value={`$${(formData.balance || 0).toFixed(2)}`} className={`${inputFormStyle} bg-neutral-100 dark:bg-neutral-700`} readOnly/></div>
             <div><label className="block text-sm font-medium">Límite Crédito</label><input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className={inputFormStyle} /></div>
             <div><label className="block text-sm font-medium">Términos</label><select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className={inputFormStyle}>{paymentTermsOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             <div><label className="block text-sm font-medium">Categoría</label><select name="category" value={formData.category} onChange={handleChange} className={inputFormStyle}>{clientCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             <div><label className="block text-sm font-medium">Vendedor</label><select name="salesperson" value={formData.salesperson} onChange={handleChange} className={inputFormStyle}>{salespersonOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             <div><label className="block text-sm font-medium">Nivel de Precios</label><select name="priceLevel" value={formData.priceLevel} onChange={handleChange} className={inputFormStyle}>{CLIENT_PRICE_LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm font-medium">Tipo de Negocio</label><input type="text" name="businessType" value={formData.businessType} onChange={handleChange} className={inputFormStyle}/></div>
                <div><label className="block text-sm font-medium">Zona</label><input type="text" name="zone" value={formData.zone} onChange={handleChange} className={inputFormStyle}/></div>
            </div>
             <div className="pt-2"><label className="flex items-center text-sm"><input type="checkbox" name="showBalance" checked={!!formData.showBalance} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> Ver Balance</label></div>
        </div>
    );
    
    const renderEnvioTab = () => (
         <div className="space-y-3 max-w-md">
            <div><label className="block text-sm font-medium">Dirección de Envío</label><textarea name="shippingAddress" value={formData.shippingAddress} onChange={handleChange} rows={3} className={inputFormStyle}></textarea></div>
            <div><label className="block text-sm font-medium">Nombre Contacto Envío</label><input type="text" name="shippingContactName" value={formData.shippingContactName} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">Teléfono Contacto Envío</label><input type="tel" name="shippingContactPhone" value={formData.shippingContactPhone} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">Transportista Preferido</label><input type="text" name="preferredCarrier" value={formData.preferredCarrier} onChange={handleChange} className={inputFormStyle}/></div>
        </div>
    );
    
    const renderLoyaltyTab = () => (
        <div className="space-y-3 max-w-md">
            <div><label className="block text-sm font-medium">Puntos de Lealtad</label><input type="number" name="loyaltyPoints" value={formData.loyaltyPoints} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">Nivel de Lealtad</label><input type="text" name="loyaltyLevel" value={formData.loyaltyLevel} onChange={handleChange} className={inputFormStyle} placeholder="Ej: Bronce, Plata, Oro"/></div>
        </div>
    );
    
    const renderFotoTab = () => (
        <div className="space-y-3 max-w-md">
             <label className="block text-sm font-medium">Añadir URL de Imagen</label>
            <div className="flex items-center gap-2">
                <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" className={inputFormStyle + " flex-grow"} />
                <button type="button" onClick={handleAddImage} className={BUTTON_SECONDARY_SM_CLASSES}>Añadir</button>
            </div>
             {formData.images && formData.images.length > 0 && (
                <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto bg-neutral-50 dark:bg-neutral-700/50 p-2 rounded text-sm">
                    {formData.images.map(url => (
                        <li key={url} className="flex justify-between items-center group">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 dark:text-blue-400 hover:underline">{url}</a>
                            <button type="button" onClick={() => handleRemoveImage(url)} className="text-red-500 hover:text-red-700 text-xs p-0.5 opacity-0 group-hover:opacity-100" aria-label={`Quitar imagen ${url}`}><TrashIconMini/></button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );


    return (
        <Modal isOpen={isOpen} onClose={() => onClose()} title={client ? "Modificar Cliente" : "Crear Cliente"} size="6xl">
            <form onSubmit={handleSubmit}>
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div className="max-h-[65vh] overflow-y-auto pr-2">
                   <div className={activeTab === 'General' ? '' : 'hidden'}>{renderGeneralTab()}</div>
                   <div className={activeTab === 'Impuestos' ? '' : 'hidden'}>{renderImpuestosTab()}</div>
                   <div className={activeTab === 'Facturación' ? '' : 'hidden'}>{renderFacturacionTab()}</div>
                   <div className={activeTab === 'Cobros' ? '' : 'hidden'}>{renderCobrosTab()}</div>
                   <div className={activeTab === 'Envío' ? '' : 'hidden'}>{renderEnvioTab()}</div>
                   <div className={activeTab === 'Loyalty' ? '' : 'hidden'}>{renderLoyaltyTab()}</div>
                   <div className={activeTab === 'Foto' ? '' : 'hidden'}>{renderFotoTab()}</div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                    <button type="button" onClick={() => onClose()} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Cliente</button>
                </div>
            </form>
        </Modal>
    );
};
