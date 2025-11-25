
import React, { useState } from 'react';
import { Category, CategoryFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { CategoryFormModal } from './CategoryFormModal'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { AIImportModal } from '../../components/AIImportModal'; // Adjusted path
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import hook

export const CategoriesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { categories, setCategories } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);

    const openModalForCreate = (initialData?: Partial<CategoryFormData>) => {
        setEditingCategory(null);
        if (initialData) {
            setEditingCategory({ id: '', storeOwnerId: '', ...initialData } as Category); 
        }
        setShowFormModal(true);
    };

    const openModalForEdit = (category: Category) => {
        setEditingCategory(category);
        setShowFormModal(true);
    };

    const requestDelete = (categoryId: string) => {
        setItemToDeleteId(categoryId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = () => {
        if(itemToDeleteId) {
            setCategories(prev => prev.filter(c => c.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const handleAiCategoryImportSuccess = (dataArray: any[]) => {
        console.log("AI Data Array for Category Import:", dataArray);
        if (!Array.isArray(dataArray)) {
            alert("La IA no devolvió un array de datos de categorías.");
            return;
        }

        let importedCount = 0;
        let failedCount = 0;
        const newCategories: Category[] = [];

        dataArray.forEach((item, index) => {
            const name = item.nombre || item.name || '';
            
            if (!name) {
                console.warn(`Ítem ${index} omitido por falta de nombre:`, item);
                failedCount++;
                return;
            }

            // Check for duplicates before adding
            const isDuplicate = categories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
            if (isDuplicate) {
                console.warn(`Categoría duplicada omitida: ${name}`);
                failedCount++;
                return;
            }

            const newCategory: Category = {
                id: `cat-ai-${Date.now()}-${index}`,
                name: name,
                storeOwnerId: 'admin-user',
            };
            newCategories.push(newCategory);
            importedCount++;
        });

        if (newCategories.length > 0) {
            setCategories(prev => [...prev, ...newCategories]);
        }
        
        let message = `${importedCount} categorías importadas correctamente.`;
        if (failedCount > 0) {
            message += ` ${failedCount} categorías no pudieron ser importadas (vacías o duplicadas).`;
        }
        alert(message);
        setShowAIImportModal(false);
    };

    const columns: TableColumn<Category>[] = [
        { header: t('category.field.name'), accessor: 'name', className: 'w-full' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('category.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                        <SparklesIcon /> {t('common.import_ai')}
                    </button>
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                        <PlusIcon /> {t('category.list.create')}
                    </button>
                </div>
            </div>
            <DataTable<Category>
                data={categories}
                columns={columns}
                actions={(category) => (
                    <>
                        <button onClick={() => openModalForEdit(category)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('common.edit')}>
                            <EditIcon />
                        </button>
                        <button onClick={() => requestDelete(category.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('common.delete')}>
                            <DeleteIcon />
                        </button>
                    </>
                )}
            />
            <CategoryFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} category={editingCategory} />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiCategoryImportSuccess}
                entityName="Categoría"
                fieldsToExtract="nombre (string)"
                exampleFormat={`{
  "nombre": "Electrónica"
}`}
            />
        </div>
    );
};
