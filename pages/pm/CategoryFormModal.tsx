
import React, { useState, useEffect, useRef } from 'react';
import { Category, CategoryFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { CameraIcon, TrashIconMini } from '../../components/icons';

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: Category | null;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, category }) => {
    const { t } = useTranslation();
    const { setCategories, categories } = useData();
    const [formData, setFormData] = useState<CategoryFormData>({ name: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (category) {
            setFormData({ 
                name: category.name, 
                description: (category as any).description || '' 
            });
            setImagePreview((category as any).imageUrl || null);
        } else {
            setFormData({ name: '', description: '' });
            setImagePreview(null);
        }
        setImageFile(null);
    }, [category, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() === '') {
            console.error("Error: El nombre es obligatorio");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('pazzi_token');

            let finalImageUrl = imagePreview;

            // Si hay un archivo de imagen nuevo, lo subimos primero al servidor
            if (imageFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile); 

                const uploadResponse = await fetch('http://localhost:3001/api/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadFormData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    finalImageUrl = uploadResult.url; // Obtenemos la URL del servidor
                } else {
                    throw new Error("Error al subir la imagen al servidor");
                }
            }

            const url = category
                ? `http://localhost:3001/api/categories/${category.id}`
                : 'http://localhost:3001/api/categories';
            
            const method = category ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    ...formData, 
                    imageUrl: finalImageUrl 
                })
            });

            const result = await response.json();
            if (response.ok) {
                if (category) {
                    setCategories(prev => prev.map(c => c.id === category.id ? result : c));
                } else {
                    setCategories(prev => [...prev, result]);
                }
                onClose();
            } else {
                console.error("Error al guardar la categoría:", result.error);
            }
        } catch (error) {
            console.error("Error saving category:", error);
            console.error("Error de conexión con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={category ? t('category.form.edit') : t('category.form.create')} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="categoryName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('category.field.name')}</label>
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
                <div>
                    <label htmlFor="categoryDescription" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Descripción</label>
                    <textarea
                        name="description"
                        id="categoryDescription"
                        value={formData.description}
                        onChange={handleChange}
                        className={inputFormStyle + " w-full h-20 resize-none"}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 text-xs uppercase tracking-wider">Imagen de Categoría</label>
                    <div className="flex items-center space-x-4">
                        {imagePreview ? (
                            <div className="relative w-24 h-24 border rounded-md overflow-hidden bg-neutral-100">
                        <img
                            src={imagePreview.startsWith('http') || imagePreview.startsWith('data:')
                                ? imagePreview
                                : `http://localhost:3001${imagePreview.startsWith('/') ? '' : '/'}${imagePreview}`
                            }
                            alt="Preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md"><TrashIconMini className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div className="w-24 h-24 border-2 border-dashed border-neutral-300 rounded-md flex items-center justify-center bg-neutral-50"><CameraIcon className="w-6 h-6 text-neutral-400" /></div>
                        )}
                        <label className={BUTTON_SECONDARY_SM_CLASSES + " cursor-pointer"}>
                            Elegir Imagen
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                    </div>
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
