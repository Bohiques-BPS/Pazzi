import React, { useState, useEffect } from 'react';
import { Branch, BranchFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';
import { API_URL } from './api';

interface BranchFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    branch: Branch | null;
}

export const BranchFormModal: React.FC<BranchFormModalProps> = ({ isOpen, onClose, branch }) => {
    const { t } = useTranslation();
    const { setBranches, branches: allBranches } = useData();
    const [formData, setFormData] = useState<BranchFormData>({ 
        name: '', 
        address: '', 
        phone: '',
        isActive: true 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (branch && isOpen) {
            setFormData({ 
                name: branch.name, 
                address: (branch as any).address || '', 
                phone: (branch as any).phone || '',
                isActive: branch.isActive 
            });
        } else if (isOpen) {
            setFormData({ name: '', address: '', phone: '', isActive: true });
        }
    }, [branch, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() === '') {
            toast.error("El nombre de la sucursal es obligatorio");
            return;
        }

        const isDuplicateName = allBranches.some(b => b.name.toLowerCase() === formData.name.toLowerCase() && (!branch || b.id !== branch.id));
        if (isDuplicateName) {
            toast.error("Ya existe una sucursal con este nombre");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('pazzi_token');
            const url = branch
                ? `${API_URL}/branches/${branch.id}`
                : `${API_URL}/branches`;
            
            const method = branch ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                if (branch) {
                    setBranches(prev => prev.map(b => b.id === branch.id ? result : b));
                } else {
                    setBranches(prev => [...prev, result]);
                }
                toast.success(branch ? "Sucursal actualizada con éxito" : "Sucursal creada con éxito");
                onClose();
            } else {
                toast.error(result.error || "Error al guardar la sucursal.");
            }
        } catch (error) {
            console.error("Error saving branch:", error);
            toast.error("Error de conexión con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={branch ? t('branch.form.edit') : t('branch.form.create')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.name')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle + " w-full"} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.address')} (Opcional)</label>
                    <textarea name="address" value={formData.address} onChange={handleChange} className={inputFormStyle + " w-full h-20 resize-none"} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.phone')} (Opcional)</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputFormStyle + " w-full"} />
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        name="isActive"
                        id="isActive_pm"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded mr-2"
                    />
                    <label htmlFor="isActive_pm" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {t('branch.field.active') || 'Sucursal Activa'}
                    </label>
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