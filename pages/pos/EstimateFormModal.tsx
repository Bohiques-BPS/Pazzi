
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Estimate, EstimateFormData, Client, CartItem, Product, EstimateStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { ClientSearchModal } from '../../components/ClientSearchModal';
import { ClientFormModal } from '../pm/ClientFormModal';
import { ProductAutocomplete } from '../../components/ui/ProductAutocomplete';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ESTIMATE_STATUS_OPTIONS, ADMIN_USER_ID } from '../../constants';
import { UserCircleIcon, TrashIconMini } from '../../components/icons';
import { toast } from 'react-hot-toast';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { clientsService } from '../../services/clients';
import { estimatesService } from '../../services/estimates';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface EstimateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    estimateToEdit: Estimate | null;
}

export const EstimateFormModal: React.FC<EstimateFormModalProps> = ({ isOpen, onClose, estimateToEdit }) => {
    const { t } = useTranslation();
    const { clients, products, setEstimates, getProductById, branches, addEstimate, setClients } = useData();
    const { currentUser } = useAuth();
    const [isClientSearchModalOpen, setIsClientSearchModalOpen] = useState(false);
    const [showCreateClient, setShowCreateClient] = useState(false);
    // Cliente NO registrado (walk-in): nombre + contacto manual. Al guardar se crea un cliente
    // ligero por API y el estimado queda asociado a él.
    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [saving, setSaving] = useState(false);
    
    const initialFormData: EstimateFormData = {
        clientId: '',
        items: [],
        status: EstimateStatus.BORRADOR,
        notes: '',
        expiryDate: '',
    };
    const [formData, setFormData] = useState<EstimateFormData>(initialFormData);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const productAutocompleteRef = useRef<HTMLInputElement>(null);

    const posRelevantProducts = useMemo(() => {
        return products.filter(p => p.storeOwnerId === ADMIN_USER_ID || !p.storeOwnerId);
    }, [products]);

    useEffect(() => {
        if (isOpen) {
            if (estimateToEdit) {
                const client = clients.find(c => c.id === estimateToEdit.clientId);
                setSelectedClient(client || null);
                setFormData({
                    clientId: estimateToEdit.clientId,
                    items: estimateToEdit.items,
                    status: estimateToEdit.status,
                    notes: estimateToEdit.notes || '',
                    expiryDate: (estimateToEdit.expiryDate || '').slice(0, 10), // input date exige yyyy-MM-dd (el BE puede dar ISO)
                });
            } else {
                setSelectedClient(null);
                setFormData(initialFormData);
            }
            setManualName(''); setManualPhone(''); setManualEmail('');
        }
    // Solo al abrir o cambiar de estimado. NO dependemos de `clients` para no reiniciar
    // el formulario (perder progreso) cuando se crea un cliente inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimateToEdit, isOpen]);

    const handleClientSelect = (client: Client) => {
        setSelectedClient(client);
        setFormData(prev => ({ ...prev, clientId: client.id }));
        setIsClientSearchModalOpen(false);
    };

    const handleProductSelect = (product: Product) => {
        setFormData(prev => {
            const existingItem = prev.items.find(item => item.id === product.id);
            if (existingItem) {
                return {
                    ...prev,
                    items: prev.items.map(item =>
                        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                    )
                };
            }
            return {
                ...prev,
                items: [...prev.items, { ...product, quantity: 1 }]
            };
        });
    };
    
    const handleUpdateQuantity = (productId: string, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        setFormData(prev => ({
            ...prev,
            items: newQuantity > 0 
                ? prev.items.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item)
                : prev.items.filter(item => item.id !== productId)
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.id !== productId) }));
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const { subtotal, totalIVU, grandTotal } = useMemo(() => {
        let subtotal = 0;
        let totalIVU = 0;
        const defaultIVURate = 0.16;
        formData.items.forEach(item => {
            const itemSubtotal = item.unitPrice * item.quantity;
            subtotal += itemSubtotal;
            const product = getProductById(item.id);
            const ivuRate = product?.ivuRate !== undefined ? product.ivuRate : defaultIVURate;
            totalIVU += itemSubtotal * ivuRate;
        });
        return { subtotal, totalIVU, grandTotal: subtotal + totalIVU };
    }, [formData.items, getProductById]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            toast.error(t('posx.estimateform.err_no_products'));
            return;
        }
        if (!currentUser) {
            toast.error(t('posx.estimateform.err_auth'));
            return;
        }
        // Se requiere un cliente registrado O un nombre manual (cliente no registrado).
        if (!formData.clientId && !manualName.trim()) {
            toast.error(t('posx.estimateform.err_client'));
            return;
        }

        setSaving(true);
        try {
            // Resolver el clientId: registrado, o crear un cliente walk-in con el nombre/contacto.
            let clientId = formData.clientId;
            if (!clientId) {
                const created = await clientsService.create({
                    name: manualName.trim(),
                    phone: manualPhone.trim() || undefined,
                    email: manualEmail.trim() || undefined,
                });
                clientId = created.id;
                setClients(prev => [...prev, created as any]);
            }

            const payload = {
                clientId,
                items: formData.items,
                status: formData.status,
                notes: formData.notes,
                expiryDate: formData.expiryDate,
                totalAmount: grandTotal,
                date: estimateToEdit ? estimateToEdit.date : new Date().toISOString(),
                employeeId: currentUser.id,
                branchId: branches.find(b => b.isActive)?.id || branches[0]?.id || '',
            };

            if (estimateToEdit) {
                await estimatesService.update(estimateToEdit.id, payload as any);
                setEstimates(prev => prev.map(x => x.id === estimateToEdit.id ? ({ ...x, ...payload } as any) : x));
                toast.success(t('posx.estimateform.updated'));
            } else {
                await addEstimate(payload as any); // persiste vía API y actualiza la lista
                toast.success(t('posx.estimateform.created'));
            }
            onClose();
        } catch (err: any) {
            toast.error(err?.message || t('posx.estimateform.err_save'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={estimateToEdit ? t('pos.estimates.form.edit_title') : t('pos.estimates.form.create_title')} size="4xl">
                <form onSubmit={handleSubmit} className="flex flex-col h-[75vh]">
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        <div className="flex items-center space-x-3 p-2 border rounded-md dark:border-neutral-600">
                             <UserCircleIcon className="w-8 h-8 text-neutral-400 flex-shrink-0" />
                             <div className="flex-grow">
                                {selectedClient ? (
                                    <>
                                        <p className="text-sm font-semibold">{selectedClient.name} {selectedClient.lastName}</p>
                                        <p className="text-xs text-neutral-500">{selectedClient.email}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-neutral-500">{t('pos.client_search')}</p>
                                )}
                             </div>
                             <button type="button" onClick={() => setIsClientSearchModalOpen(true)} className={BUTTON_SECONDARY_SM_CLASSES}>
                                {selectedClient ? t('common.edit') : t('common.search')}
                             </button>
                        </div>

                        {/* Cliente NO registrado: nombre + contacto manual (si no se eligió uno registrado). */}
                        {!selectedClient && (
                            <div className="p-3 border rounded-md dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('posx.estimateform.walkin_hint')}</p>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('posx.estimateform.walkin_name')} <span className="text-red-500">*</span></label>
                                    <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder={t('posx.estimateform.walkin_name_ph')} className={`${inputFormStyle} w-full`} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('common.phone')}</label>
                                        <PhoneInput value={manualPhone} onChange={setManualPhone} className="w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('cmp.onb.email')}</label>
                                        <input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="cliente@correo.com" className={`${inputFormStyle} w-full`} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium">{t('pos.estimates.form.add_products')}</label>
                            <ProductAutocomplete products={posRelevantProducts} onProductSelect={handleProductSelect} inputRef={productAutocompleteRef} placeholder={t('pos.search_placeholder')} />
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto border-t border-b py-2 dark:border-neutral-700">
                           {formData.items.length > 0 ? formData.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-1.5 bg-neutral-50 dark:bg-neutral-700/60 rounded">
                                    <div className="flex-grow overflow-hidden pr-2">
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">${item.unitPrice.toFixed(2)} c/u</p>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                        <input type="number" value={item.quantity} onChange={e => handleUpdateQuantity(item.id, e.target.value)} className="w-12 text-center text-sm border-neutral-300 dark:border-neutral-600 rounded p-0.5 bg-white dark:bg-neutral-700"/>
                                        <p className="w-20 text-right text-sm font-semibold mx-2">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1" title={t('posx.estimateform.remove')}><TrashIconMini/></button>
                                    </div>
                                </div>
                           )) : <p className="text-xs text-center text-neutral-500">{t('pos.empty_cart')}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="status" className="block text-sm font-medium">{t('pos.estimates.form.status')}</label>
                                <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputFormStyle}>
                                    {ESTIMATE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="expiryDate" className="block text-sm font-medium">{t('pos.estimates.form.valid_until')}</label>
                                <input type="date" name="expiryDate" id="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>

                         <div>
                            <label htmlFor="notes" className="block text-sm font-medium">{t('pos.estimates.form.notes')}</label>
                            <RichTextEditor value={formData.notes || ''} onChange={(value) => setFormData(prev => ({...prev, notes: value}))} placeholder={t('posx.estimateform.notes_placeholder')} />
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 pt-4 border-t dark:border-neutral-700 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-neutral-500">{t('pos.subtotal')}:</span> <span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-neutral-500">{t('pos.tax')} (aprox.):</span> <span>${totalIVU.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-bold text-primary"><span className="dark:text-accent">{t('pos.total')}:</span> <span>${grandTotal.toFixed(2)}</span></div>
                        <div className="flex justify-end space-x-2 pt-2">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                            <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{t('common.save')}</button>
                        </div>
                    </div>
                </form>
            </Modal>
            <ClientSearchModal
                isOpen={isClientSearchModalOpen}
                onClose={() => setIsClientSearchModalOpen(false)}
                clients={clients}
                onClientSelect={handleClientSelect}
                onOpenCreateClient={() => { setIsClientSearchModalOpen(false); setShowCreateClient(true); }}
            />
            {showCreateClient && (
                <ClientFormModal
                    isOpen={showCreateClient}
                    client={null}
                    onClose={(newClient) => {
                        if (newClient) {
                            handleClientSelect(newClient);
                            toast.success(t('posx.estimateform.client_created', { name: `${newClient.name} ${newClient.lastName}` }));
                        }
                        setShowCreateClient(false);
                    }}
                />
            )}
        </>
    );
};
