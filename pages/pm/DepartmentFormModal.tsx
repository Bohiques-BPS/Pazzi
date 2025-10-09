import React, { useState, useEffect } from 'react';
import { Department, DepartmentFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';

interface DepartmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null;
}

export const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({ isOpen, onClose, department }) => {
    const { setDepartments, departments } = useData();
    const [formData, setFormData] = useState<DepartmentFormData>({ name: '' });

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() === '') {
            alert('El nombre del departamento no puede estar vacío.');
            return;
        }
        const isDuplicate = departments.some(dep => dep.name.toLowerCase() === formData.name.toLowerCase() && (!department || dep.id !== department.id));
        if (isDuplicate) {
            alert('Ya existe un departamento con este nombre.');
            return;
        }

        if (department) { 
            setDepartments(prev => prev.map(d => d.id === department.id ? { ...department, ...formData, storeOwnerId: department.storeOwnerId } : d));
        } else { 
            const newDepartment: Department = { id: `dept-${Date.now()}-${formData.name.toLowerCase().replace(/\s+/g, '-')}`, storeOwnerId: 'admin-user', ...formData }; // Assume admin user for now
            setDepartments(prev => [...prev, newDepartment]);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={department ? 'Editar Departamento' : 'Crear Departamento'} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="departmentName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre del Departamento</label>
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
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Departamento</button>
                </div>
            </form>
        </Modal>
    );
};