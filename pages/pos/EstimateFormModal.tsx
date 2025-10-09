import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Estimate, EstimateFormData, Client, CartItem, Product, EstimateStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { ClientSearchModal } from '../../components/ClientSearchModal';
import { ProductAutocomplete } from '../../components/ui/ProductAutocomplete';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ESTIMATE_STATUS_OPTIONS, ADMIN_USER_ID, INITIAL_BRANCHES } from '../../constants';
import { UserCircleIcon, TrashIconMini } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

interface EstimateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    estimateToEdit: Estimate | null;
}

export const EstimateFormModal: React.FC<EstimateFormModalProps> = ({ isOpen, onClose, estimateToEdit }) => {
    const { clients, products, setEstimates, getProductById } = useData();
    const { currentUser } = useAuth();
    const [isClientSearchModalOpen, setIsClientSearchModalOpen] = useState(false);
    
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
                    expiryDate: estimateToEdit.expiryDate || '',
                });
            } else {
                setSelectedClient(null);
                setFormData(initialFormData);
            }
        }
    }, [estimateToEdit, isOpen, clients, initialFormData]);

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

    const { subtotal, totalIVA, grandTotal } = useMemo(() => {
        let subtotal = 0;
        let totalIVA = 0;
        const defaultIVARate = 0.16;
        formData.items.forEach(item => {
            const itemSubtotal = item.unitPrice * item.quantity;
            subtotal += itemSubtotal;
            const product = getProductById(item.id);
            const ivaRate = product?.ivaRate !== undefined ? product.ivaRate : defaultIVARate;
            totalIVA += itemSubtotal * ivaRate;
        });
        return { subtotal, totalIVA, grandTotal: subtotal + totalIVA };
    }, [formData.items, getProductById]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientId) {
            alert("Debe seleccionar un cliente.");
            return;
        }
        if (formData.items.length === 0) {
            alert("El estimado debe contener al menos un producto.");
            return;
        }
        if (!currentUser) {
            alert("Error de autenticación. No se puede guardar.");
            return;
        }

        const estimateData = {
            ...formData,
            totalAmount: grandTotal,
            date: estimateToEdit ? estimateToEdit.date : new Date().toISOString(),
            employeeId: currentUser.id,
            branchId: INITIAL_BRANCHES[0].id, // Assuming a default branch for now
        };

        if (estimateToEdit) {
            setEstimates(prev => prev.map(e => e.id === estimateToEdit.id ? { ...e, ...estimateData } : e));
        } else {
            const newEstimate: Estimate = { id: `est-${Date.now()}`, ...estimateData };
            setEstimates(prev => [...prev, newEstimate]);
        }
        onClose();
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={estimateToEdit ? "Editar Estimado" : "Crear Estimado"} size="4xl">
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
                                    <p className="text-sm text-neutral-500">Ningún cliente seleccionado</p>
                                )}
                             </div>
                             <button type="button" onClick={() => setIsClientSearchModalOpen(true)} className={BUTTON_SECONDARY_SM_CLASSES}>
                                {selectedClient ? 'Cambiar Cliente' : 'Buscar Cliente'}
                             </button>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium">Añadir Productos</label>
                            <ProductAutocomplete products={posRelevantProducts} onProductSelect={handleProductSelect} inputRef={productAutocompleteRef} />
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
                                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1" title="Quitar"><TrashIconMini/></button>
                                    </div>
                                </div>
                           )) : <p className="text-xs text-center text-neutral-500">Añada productos al estimado.</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="status" className="block text-sm font-medium">Estado</label>
                                <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputFormStyle}>
                                    {ESTIMATE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="expiryDate" className="block text-sm font-medium">Válido Hasta (Opcional)</label>
                                <input type="date" name="expiryDate" id="expiryDate" value={formData.expiryDate} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>

                         <div>
                            <label htmlFor="notes" className="block text-sm font-medium">Notas</label>
                            <RichTextEditor value={formData.notes || ''} onChange={(value) => setFormData(prev => ({...prev, notes: value}))} placeholder="Añada notas, términos o condiciones para el estimado..." />
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 pt-4 border-t dark:border-neutral-700 space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-neutral-500">Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-neutral-500">IVA (aprox.):</span> <span>${totalIVA.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xl font-bold text-primary"><span className="dark:text-accent">TOTAL:</span> <span>${grandTotal.toFixed(2)}</span></div>
                        <div className="flex justify-end space-x-2 pt-2">
                            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                            <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Estimado</button>
                        </div>
                    </div>
                </form>
            </Modal>
            <ClientSearchModal 
                isOpen={isClientSearchModalOpen}
                onClose={() => setIsClientSearchModalOpen(false)}
                clients={clients}
                onClientSelect={handleClientSelect}
                onOpenCreateClient={() => { /* Logic to open full client modal could go here */ }}
            />
        </>
    );
};