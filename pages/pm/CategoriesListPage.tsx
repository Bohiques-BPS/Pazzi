
import React, { useState, useEffect, useMemo } from 'react';
import { Category, CategoryFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { CategoryFormModal } from './CategoryFormModal'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import hook
import { API_URL } from './api';

export const CategoriesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { categories, setCategories } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    // Carga de datos real desde el backend al entrar a la página
    useEffect(() => {
        const fetchCategories = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`${API_URL}/categories`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setCategories(data);
                }
            } catch (error) {
                console.error("Error al cargar categorías:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchCategories();
    }, [setCategories]);

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

    const confirmDelete = async () => {
        if (itemToDeleteId) {
            try {
                const response = await fetch(`${API_URL}/categories/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                if (response.ok) {
                    setCategories(prev => prev.filter(c => c.id !== itemToDeleteId));
                } else {
                    alert("Error al eliminar la categoría.");
                }
            } catch (error) {
                console.error("Error deleting category:", error);
                alert("Error de conexión al intentar eliminar.");
            } finally {
                setItemToDeleteId(null);
                setShowDeleteConfirmModal(false);
            }
        }
    };

    const columns: TableColumn<Category>[] = useMemo(() => [
        { 
            header: t('Image'), 
            accessor: (category) => (
                <div className="w-10 h-10 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mx-auto">
                    {(category as any).imageUrl ? (
                        <img
                            src={(category as any).imageUrl.startsWith('http')
                                ? (category as any).imageUrl
                                : `${API_URL.replace('/api', '')}${(category as any).imageUrl.startsWith('/') ? '' : '/'}${(category as any).imageUrl}`
                            }
                            alt={category.name} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="text-neutral-400 text-[8px] font-bold">N/A</div>
                    )}
                </div>
            ),
            className: 'w-16 text-center'
        },
        { header: t('category.field.name'), accessor: 'name' },
    ], [t]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('category.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                        <PlusIcon /> {t('category.list.create')}
                    </button>
                </div>
            </div>

            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando categorías...</span>
                </div>
            )}

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
        </div>
    );
};
