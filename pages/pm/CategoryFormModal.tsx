
import React, { useState, useEffect } from 'react';
import { Category, CategoryFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, category }) => {
    const { setCategories, categories } = useData();
    const [formData, setFormData] = useState<CategoryFormData>({ name: '' });

    useEffect(() => {
        if (category) {
            setFormData({ name: category.name });
        } else {
            setFormData({ name: '' });
        }
    }, [category, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ name: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() === '') {
            alert('El nombre de la categoría no puede estar vacío.');
            return;
        }
        const isDuplicate = categories.some(cat => cat.name.toLowerCase() === formData.name.toLowerCase() && (!category || cat.id !== category.id));
        if (isDuplicate) {
            alert('Ya existe una categoría con este nombre.');
            return;
        }

        if (category) { 
            setCategories(prev => prev.map(c => c.id === category.id ? { ...category, ...formData } : c));
        } else { 
            const newCategory: Category = { id: `cat-${Date.now()}-${formData.name.toLowerCase().replace(/\s+/g, '-')}`, ...formData };
            setCategories(prev => [...prev, newCategory]);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Editar Categoría' : 'Crear Categoría'} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="categoryName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre de la Categoría</label>
                    <input
                        type="text"
                        name="name"
                        id="categoryName"
                        value={formData.name}
                        onChange={handleChange}
                        className={inputFormStyle + " w-full"}
                        required
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar Categoría</button>
                </div>
            </form>
        </Modal>
    );
};
