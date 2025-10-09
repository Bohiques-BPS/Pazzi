import React, { useState, useEffect } from 'react';
import { Supplier, SupplierFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, supplier }) => {
    const { setSuppliers } = useData();
    const [formData, setFormData] = useState<SupplierFormData>({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: ''
    });

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (supplier) {
            setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...supplier, ...formData } : s));
        } else {
            const newSupplier: Supplier = { id: `sup-${Date.now()}`, ...formData };
            setSuppliers(prev => [...prev, newSupplier]);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'Editar Proveedor' : 'Crear Proveedor'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="supplierName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre del Proveedor</label>
                    <input type="text" name="name" id="supplierName" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="contactName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre de Contacto (Opcional)</label>
                    <input type="text" name="contactName" id="contactName" value={formData.contactName} onChange={handleChange} className={inputFormStyle} />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Teléfono (Opcional)</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputFormStyle} />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Dirección (Opcional)</label>
                    <RichTextEditor value={formData.address || ''} onChange={(value) => setFormData(prev => ({...prev, address: value}))} placeholder="Dirección del proveedor..." />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Proveedor</button>
                </div>
            </form>
        </Modal>
    );
};