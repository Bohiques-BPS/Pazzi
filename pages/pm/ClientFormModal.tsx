
import React, { useState, useEffect } from 'react';
import { Client, ClientFormData, Project } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, CLIENT_PRICE_LEVEL_OPTIONS } from '../../constants'; // Adjusted path
import { TrashIconMini, PlusIcon, ExclamationTriangleIcon } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { POSProjectFormModal } from '../pos/POSProjectFormModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

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
    const { t } = useTranslation();
    const { setClients, clients: allClients, projects } = useData();
    
    const [activeTab, setActiveTab] = useState('General');
    const tabs = [
        { id: 'General', label: t('client.tab.general') },
        { id: 'Impuestos', label: t('client.tab.taxes') },
        { id: 'Facturación', label: t('client.tab.billing') },
        { id: 'Cobros', label: t('client.tab.payments') },
        { id: 'Envío', label: t('client.tab.shipping') },
        { id: 'Loyalty', label: t('client.tab.loyalty') },
        { id: 'Foto', label: t('client.tab.photo') }
    ];
    const [isQuickProjectModalOpen, setIsQuickProjectModalOpen] = useState(false);
    
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
        isLoss: false,
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
                    isLoss: client.isLoss || false,
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
            <div><label className="block text-sm font-medium">{t('common.name')}</label><input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle} required/></div>
            <div><label className="block text-sm font-medium">{t('client.field.lastname')}</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputFormStyle} /></div>
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">{t('client.field.projects')}</label>
                    <button
                        type="button"
                        onClick={() => setIsQuickProjectModalOpen(true)}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs flex items-center`}
                        disabled={!client}
                        title={!client ? "Guarde el cliente primero para crear proyectos" : "Crear un nuevo proyecto rápido para este cliente"}
                    >
                        <PlusIcon className="w-3 h-3 mr-1"/> {t('pos.new_project')}
                    </button>
                </div>
                <select
                    name="projectIds"
                    multiple
                    value={formData.projectIds || []}
                    onChange={handleChange}
                    className={inputFormStyle + " h-24"}
                >
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">{t('client.field.projects_hint')}</p>
            </div>
            <div><label className="block text-sm font-medium">{t('common.address')}</label><input type="text" name="address" value={formData.address} onChange={handleChange} className={inputFormStyle} /></div>
            <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-sm font-medium">{t('client.field.city')}</label><input type="text" name="city" value={formData.city} onChange={handleChange} className={inputFormStyle} /></div>
                <div><label className="block text-sm font-medium">{t('client.field.country')}</label><input type="text" name="country" value={formData.country} onChange={handleChange} className={inputFormStyle} /></div>
                <div><label className="block text-sm font-medium">{t('client.field.zip')}</label><input type="text" name="zip" value={formData.zip} onChange={handleChange} className={inputFormStyle} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <div><label className="block text-sm font-medium">{t('common.phone')}</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputFormStyle} required/></div>
                 <div><label className="block text-sm font-medium">{t('common.phone')} 2</label><input type="tel" name="phone2" value={formData.phone2} onChange={handleChange} className={inputFormStyle} /></div>
            </div>
            <div><label className="block text-sm font-medium">{t('client.field.fax')}</label><input type="tel" name="fax" value={formData.fax} onChange={handleChange} className={inputFormStyle} /></div>
            <div><label className="block text-sm font-medium">{t('common.email')}</label><input type="email" name="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required/></div>
            <div><label className="block text-sm font-medium">{t('client.field.contact_person')}</label><input type="text" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} className={inputFormStyle}/></div>
             <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm font-medium">{t('client.field.ssn')}</label><input type="text" name="socialSecurity" value={formData.socialSecurity} onChange={handleChange} className={inputFormStyle} /></div>
                <div><label className="block text-sm font-medium">{t('client.field.dob')}</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputFormStyle} /></div>
            </div>
            <div>
                <label className="block text-sm font-medium">{t('common.notes')}</label>
                <RichTextEditor value={formData.clientNotes || ''} onChange={(value) => setFormData(prev => ({...prev, clientNotes: value}))} placeholder="Notas sobre el cliente..." />
            </div>
            <div className="pt-2"><label className="flex items-center text-sm"><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> {t('product.field.active')}</label></div>
        </div>
    );

    const renderImpuestosTab = () => (
         <div className="space-y-4 max-w-full">
            <fieldset className="border p-3 rounded dark:border-neutral-600">
                <legend className="text-sm font-medium px-1">{t('client.taxes.responsibility')}</legend>
                <div className="grid grid-cols-2 gap-4 pt-2">
                     <div><label className="block text-sm font-medium">{t('client.taxes.state')}</label><input type="number" name="stateTaxRate" value={formData.stateTaxRate} onChange={handleChange} className={inputFormStyle} step="0.01"/></div>
                     <div><label className="block text-sm font-medium">{t('client.taxes.municipal')}</label><input type="number" name="municipalTaxRate" value={formData.municipalTaxRate} onChange={handleChange} className={inputFormStyle} step="0.01"/></div>
                </div>
            </fieldset>
            <div><label className="block text-sm font-medium">{t('client.taxes.tax_id')}</label><input type="text" name="taxId" value={formData.taxId} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">{t('client.taxes.exemption')}</label><input type="date" name="municipalTaxExemptionUntil" value={formData.municipalTaxExemptionUntil} onChange={handleChange} className={inputFormStyle}/></div>
        </div>
    );
    
    const renderFacturacionTab = () => (
        <div className="space-y-4 max-w-full">
            <div>
                <label className="block text-sm font-medium">{t('client.billing.address')}</label>
                <RichTextEditor value={formData.billingAddress || ''} onChange={(value) => setFormData(prev => ({...prev, billingAddress: value}))} />
            </div>

            <label className="flex items-center text-sm font-medium pt-2">
                <input type="checkbox" name="specialInvoiceMessageEnabled" checked={!!formData.specialInvoiceMessageEnabled} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> {t('client.billing.special_msg')}
            </label>
            <p className="text-xs text-neutral-500 -mt-3 ml-6">{t('client.billing.special_msg_hint')}</p>
            
            <fieldset className="border p-4 rounded dark:border-neutral-600">
                <legend className="text-lg font-semibold px-2 text-primary">{t('client.billing.charge_type')}</legend>
                <div className="flex items-start gap-6 mt-2">
                    <div className="space-y-2.5">
                        <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="chargeType" value="discountOnPrice" checked={formData.chargeType === 'discountOnPrice'} onChange={handleChange} className="form-radio mr-1.5"/> {t('client.billing.discount_price')}</label>
                        <label className="flex items-center text-sm cursor-pointer"><input type="radio" name="chargeType" value="markupOnCost" checked={formData.chargeType === 'markupOnCost'} onChange={handleChange} className="form-radio mr-1.5"/> {t('client.billing.markup_cost')}</label>
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
                    <label className="block text-sm font-medium">{t('client.billing.code')}</label>
                    <input type="password" name="chargeCode" value={formData.chargeCode} onChange={handleChange} className={inputFormStyle + " w-32"} />
                </div>
            </fieldset>
        </div>
    );
    
    const renderCobrosTab = () => (
        <div className="space-y-3">
             <div><label className="block text-sm font-medium">{t('client.payments.balance')}</label><input type="text" value={`$${(formData.balance || 0).toFixed(2)}`} className={`${inputFormStyle} bg-neutral-100 dark:bg-neutral-700`} readOnly/></div>
             <div><label className="block text-sm font-medium">{t('client.payments.credit_limit')}</label><input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className={inputFormStyle} placeholder="0.00 (Sin límite)"/></div>
             <div><label className="block text-sm font-medium">{t('client.payments.terms')}</label><select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className={inputFormStyle}>{paymentTermsOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             <div><label className="block text-sm font-medium">{t('client.payments.category')}</label><select name="category" value={formData.category} onChange={handleChange} className={inputFormStyle}>{clientCategoryOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             <div><label className="block text-sm font-medium">{t('client.payments.salesperson')}</label><select name="salesperson" value={formData.salesperson} onChange={handleChange} className={inputFormStyle}>{salespersonOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
             <div><label className="block text-sm font-medium">{t('client.payments.price_level')}</label><select name="priceLevel" value={formData.priceLevel} onChange={handleChange} className={inputFormStyle}>{CLIENT_PRICE_LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm font-medium">{t('client.payments.business_type')}</label><input type="text" name="businessType" value={formData.businessType} onChange={handleChange} className={inputFormStyle}/></div>
                <div><label className="block text-sm font-medium">{t('client.payments.zone')}</label><input type="text" name="zone" value={formData.zone} onChange={handleChange} className={inputFormStyle}/></div>
            </div>
             <div className="pt-4 border-t dark:border-neutral-700 flex flex-col space-y-2">
                <label className="flex items-center text-sm"><input type="checkbox" name="showBalance" checked={!!formData.showBalance} onChange={handleChange} className="form-checkbox rounded mr-1.5"/> {t('client.payments.show_balance')}</label>
                
                <div className="flex items-center p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800">
                    <label className="flex items-center text-sm font-bold text-red-600 dark:text-red-400 w-full cursor-pointer">
                        <input type="checkbox" name="isLoss" checked={!!formData.isLoss} onChange={handleChange} className="form-checkbox rounded mr-2 text-red-600 focus:ring-red-500"/>
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1.5"/>
                        <span>Cliente en Pérdida (Bad Debt)</span>
                    </label>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                    * Al marcar esta opción, las facturas de este cliente se archivarán y solo serán visibles en el "Reporte de Pérdidas", excluyéndose de los reportes de ventas principales.
                </p>
             </div>
        </div>
    );
    
    const renderEnvioTab = () => (
         <div className="space-y-3 max-w-full">
            <div>
                <label className="block text-sm font-medium">{t('client.shipping.address')}</label>
                <RichTextEditor value={formData.shippingAddress || ''} onChange={(value) => setFormData(prev => ({...prev, shippingAddress: value}))} />
            </div>
            <div><label className="block text-sm font-medium">{t('client.shipping.contact_name')}</label><input type="text" name="shippingContactName" value={formData.shippingContactName} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">{t('client.shipping.contact_phone')}</label><input type="tel" name="shippingContactPhone" value={formData.shippingContactPhone} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">{t('client.shipping.carrier')}</label><input type="text" name="preferredCarrier" value={formData.preferredCarrier} onChange={handleChange} className={inputFormStyle}/></div>
        </div>
    );
    
    const renderLoyaltyTab = () => (
        <div className="space-y-3 max-w-md">
            <div><label className="block text-sm font-medium">{t('client.loyalty.points')}</label><input type="number" name="loyaltyPoints" value={formData.loyaltyPoints} onChange={handleChange} className={inputFormStyle}/></div>
            <div><label className="block text-sm font-medium">{t('client.loyalty.level')}</label><input type="text" name="loyaltyLevel" value={formData.loyaltyLevel} onChange={handleChange} className={inputFormStyle} placeholder="Ej: Bronce, Plata, Oro"/></div>
        </div>
    );
    
    const renderFotoTab = () => (
        <div className="space-y-3 max-w-full">
             <label className="block text-sm font-medium">{t('client.photo.add_url')}</label>
            <div className="flex items-center gap-2">
                <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" className={inputFormStyle + " flex-grow"} />
                <button type="button" onClick={handleAddImage} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.add')}</button>
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
        <>
            <Modal isOpen={isOpen} onClose={() => onClose()} title={client ? t('client.form.edit') : t('client.form.create')} size="7xl">
                <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
                    <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4 overflow-x-auto flex-shrink-0">
                        {tabs.map(tab => (
                            <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex-grow overflow-y-auto pr-2">
                       <div className={activeTab === 'General' ? '' : 'hidden'}>{renderGeneralTab()}</div>
                       <div className={activeTab === 'Impuestos' ? '' : 'hidden'}>{renderImpuestosTab()}</div>
                       <div className={activeTab === 'Facturación' ? '' : 'hidden'}>{renderFacturacionTab()}</div>
                       <div className={activeTab === 'Cobros' ? '' : 'hidden'}>{renderCobrosTab()}</div>
                       <div className={activeTab === 'Envío' ? '' : 'hidden'}>{renderEnvioTab()}</div>
                       <div className={activeTab === 'Loyalty' ? '' : 'hidden'}>{renderLoyaltyTab()}</div>
                       <div className={activeTab === 'Foto' ? '' : 'hidden'}>{renderFotoTab()}</div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4 flex-shrink-0">
                        <button type="button" onClick={() => onClose()} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('common.save')}</button>
                    </div>
                </form>
            </Modal>
            {client && (
                <POSProjectFormModal
                    isOpen={isQuickProjectModalOpen}
                    onClose={() => setIsQuickProjectModalOpen(false)}
                    clientId={client.id}
                    onProjectCreated={(newProject) => {
                        setFormData(prev => ({
                            ...prev,
                            projectIds: [...(prev.projectIds || []), newProject.id]
                        }));
                        setIsQuickProjectModalOpen(false);
                    }}
                />
            )}
        </>
    );
};
