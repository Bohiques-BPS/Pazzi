
import React, { useState, useEffect } from 'react';
import { Department, DepartmentFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { API_URL } from './api';

interface DepartmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
}

export const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({ isOpen, onClose, department }) => {
    const { t } = useTranslation();
    const { setDepartments, departments } = useData();
    const [formData, setFormData] = useState<DepartmentFormData>({ name: '' }); // Add isSubmitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (department) {
            setFormData({ name: department.name });
        } else {
            setFormData({ name: '' });
        }
    }, [department, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ name: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => { // Make it async
        e.preventDefault();
        if (formData.name.trim() === '') {
            alert("El nombre es obligatorio");
            return;
        }

        setIsSubmitting(true); // Set submitting state
        try {
            const token = localStorage.getItem('pazzi_token');
            const url = department
                ? `${API_URL}/departments/${department.id}`
                : `${API_URL}/departments`;
            
            const method = department ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: formData.name })
            });

            const result = await response.json();

            if (response.ok) {
                if (department) {
                    setDepartments(prev => prev.map(d => d.id === department.id ? result : d));
                } else {
                    setDepartments(prev => [...prev, result]);
                }
                onClose();
            } else {
                alert(result.error || "Error al guardar el departamento.");
            }
        } catch (error) {
            console.error("Error saving department:", error);
            alert("Error de conexión con el servidor.");
        } finally {
            setIsSubmitting(false); // Reset submitting state
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={department ? t('department.form.edit') : t('department.form.create')} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="departmentName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('department.field.name')}</label>
                    <input
                        type="text"
                        name="name"
                        id="departmentName"
                        value={formData.name}
                        onChange={handleChange}
                        className={inputFormStyle + " w-full"}
                        required
                    />
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
