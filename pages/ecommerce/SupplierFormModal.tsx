
import React, { useState, useEffect } from 'react';
import { Supplier, SupplierFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, ADMIN_USER_ID } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';

interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier | null;
    storeOwnerId?: string;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, supplier, storeOwnerId }) => {
    const { t } = useTranslation();
    const { setSuppliers } = useData();
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState<SupplierFormData>({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (supplier && isOpen) {
            setFormData({
                name: supplier.name,
                contactName: supplier.contactName || '',
                email: supplier.email,
                phone: supplier.phone || '',
                address: supplier.address || ''
            });
        } else if (!supplier && isOpen) {
            setFormData({ name: '', contactName: '', email: '', phone: '', address: '' });
        }
    }, [supplier, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('pazzi_token');
            const url = supplier
                ? `http://localhost:3001/api/suppliers/${supplier.id}`
                : 'http://localhost:3001/api/suppliers';
            
            const method = supplier ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    ...formData,
                    storeOwnerId: storeOwnerId || currentUser?.id || ADMIN_USER_ID
                })
            });

            const result = await response.json();
            if (response.ok) {
                if (supplier) {
                    setSuppliers(prev => prev.map(s => s.id === supplier.id ? result : s));
                } else {
                    setSuppliers(prev => [...prev, result]);
                }
                toast.success(supplier ? "Proveedor actualizado" : "Proveedor creado");
                onClose();
            } else {
                toast.error(result.error || "Error al guardar el proveedor.");
            }
        } catch (error) {
            console.error("Error saving supplier:", error);
            toast.error("Error de conexión con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? t('ecommerce.suppliers.form.edit_title') : t('ecommerce.suppliers.form.create_title')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="supplierName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.suppliers.form.name')}</label>
                    <input type="text" name="name" id="supplierName" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="contactName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.suppliers.form.contact')}</label>
                    <input type="text" name="contactName" id="contactName" value={formData.contactName} onChange={handleChange} className={inputFormStyle} />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.suppliers.form.email')}</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.suppliers.form.phone')}</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputFormStyle} />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('ecommerce.suppliers.form.address')}</label>
                    <RichTextEditor value={formData.address || ''} onChange={(value) => setFormData(prev => ({...prev, address: value}))} placeholder="" />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
