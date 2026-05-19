
import React, { useState, useEffect } from 'react';
import { Branch, BranchFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { API_URL } from '../../services/api';
import { toast } from 'react-hot-toast';

interface BranchFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    branchToEdit: Branch | null;
}

export const BranchFormModal: React.FC<BranchFormModalProps> = ({ isOpen, onClose, branchToEdit }) => {
    const { t } = useTranslation();
    const { setBranches, branches: allBranches } = useData();
    const [formData, setFormData] = useState<BranchFormData>({
        name: '',
        address: '',
        phone: '',
        isActive: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (branchToEdit && isOpen) {
            setFormData({
                name: branchToEdit.name,
                address: branchToEdit.address || '',
                phone: branchToEdit.phone || '',
                isActive: branchToEdit.isActive,
            });
        } else if (!branchToEdit && isOpen) {
            setFormData({ name: '', address: '', phone: '', isActive: true });
        }
    }, [branchToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() === '') {
            toast.error("El nombre de la sucursal es obligatorio");
            return;
        }

        const isDuplicateName = allBranches.some(b => b.name.toLowerCase() === formData.name.toLowerCase() && (!branchToEdit || b.id !== branchToEdit.id));
        if (isDuplicateName) {
            toast.error("Ya existe una sucursal con este nombre");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('pazzi_token');
            const url = branchToEdit
                ? `${API_URL}/branches/${branchToEdit.id}`
                : `${API_URL}/branches`;
            
            const method = branchToEdit ? 'PUT' : 'POST';

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
                if (branchToEdit) {
                    setBranches(prev => prev.map(b => b.id === branchToEdit.id ? result : b));
                } else {
                    setBranches(prev => [...prev, result]);
                }
                toast.success(branchToEdit ? 'Sucursal actualizada' : 'Sucursal creada');
                onClose();
            } else {
                toast.error(result.error || "Error al guardar la sucursal.");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={branchToEdit ? t('branch.form.edit') : t('branch.form.create')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="branchName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.name')}</label>
                    <input type="text" name="name" id="branchName" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.address')} (Opcional)</label>
                    <textarea name="address" id="address" value={formData.address} onChange={handleChange} rows={2} className={`${inputFormStyle} h-auto min-h-[3rem]`}></textarea>
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.phone')} (Opcional)</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputFormStyle} />
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded mr-2"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('branch.field.active')}</label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={isSubmitting}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Guardando...
                            </span>
                        ) : t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
