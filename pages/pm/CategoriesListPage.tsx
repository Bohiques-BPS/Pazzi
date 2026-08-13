
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Category, CategoryFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { CategoryFormModal } from './CategoryFormModal'; // Adjusted path
import { ScanAssignModal } from './ScanAssignModal';
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { PlusIcon, EditIcon, DeleteIcon, BarcodeScanIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants'; // Adjusted path
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import hook
import { API_URL, api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { ImportModal, type ImportFieldDef, type ImportResult } from '../../components/ui/ImportModal';
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { stripHtml, slugToName } from '../../utils/wpImport';

// Alias/transformaciones para exportaciones de WordPress (name, description, thumbnail, parent_slug).
const CATEGORY_IMPORT_FIELDS: ImportFieldDef[] = [
    { key: 'name', label: 'Nombre', required: true, aliases: ['nombre', 'name', 'categoria', 'category', 'title'] },
    { key: 'departmentName', label: 'Departamento', aliases: ['departamento', 'department', 'division', 'parent_slug', 'parent'], transform: slugToName },
    { key: 'description', label: 'Descripción', aliases: ['descripcion', 'description', 'detalle'], transform: stripHtml },
    { key: 'imageUrl', label: 'Imagen (URL)', aliases: ['imagen', 'image', 'thumbnail', 'foto', 'imageurl'] },
];

export const CategoriesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { categories, setCategories } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [scanTarget, setScanTarget] = useState<Category | null>(null);

    const filteredCategories = useMemo(
        () => categories.filter(c => c.name.toLowerCase().includes(searchTerm.trim().toLowerCase())),
        [categories, searchTerm]
    );

    const fetchCategories = useCallback(async () => {
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
            toast.error('Error al cargar las categorías.');
        } finally {
            setLoadingData(false);
        }
    }, [setCategories]);

    // Carga de datos real desde el backend al entrar a la página
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

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
                    toast.success('Categoría eliminada');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    toast.error(errData.error || 'Error al eliminar la categoría.');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                toast.error('Error de conexión al intentar eliminar.');
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
        {
            header: 'Departamento',
            accessor: (category) => (
                category.department?.name
                    ? <span className="text-sm text-neutral-700 dark:text-neutral-200">{category.department.name}</span>
                    : <span className="text-xs text-neutral-400">Sin departamento</span>
            ),
        },
        {
            header: 'Productos',
            accessor: (category) => (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {category._count?.products ?? 0}
                </span>
            ),
            className: 'text-center w-24',
            sortable: true,
            sortKey: 'products',
            sortValue: (category) => category._count?.products ?? 0,
        },
    ], [t]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('category.list.title')}</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Buscar categoría…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label="Buscar categoría"
                    />
                    <button onClick={() => setShowImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex-shrink-0`}>Importar</button>
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}>
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
                data={filteredCategories}
                columns={columns}
                actions={(category) => (
                    <>
                        <button onClick={() => setScanTarget(category)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 p-1" aria-label="Escanear producto para asignar categoría" title="Escanear y asignar categoría">
                            <BarcodeScanIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => openModalForEdit(category)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('common.edit')} title={t('common.edit')}>
                            <EditIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => requestDelete(category.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('common.delete')} title={t('common.delete')}>
                            <DeleteIcon className="w-5 h-5" />
                        </button>
                    </>
                )}
            />
            <CategoryFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} category={editingCategory} />
            {showImportModal && (
                <ImportModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title="Importar categorías (Excel/CSV o WordPress)"
                    fields={CATEGORY_IMPORT_FIELDS}
                    onImport={(rows) => api.post<ImportResult>('/categories/import', { items: rows })}
                    onDone={fetchCategories}
                />
            )}
            <ScanAssignModal
                isOpen={!!scanTarget}
                onClose={() => setScanTarget(null)}
                mode="category"
                target={scanTarget ? { id: scanTarget.id, name: scanTarget.name } : null}
                onAssigned={fetchCategories}
            />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="¿Confirmar eliminación?"
                message="Esta acción no se puede deshacer. ¿Deseas continuar?"
                confirmButtonText="Sí, eliminar"
            />
        </div>
    );
};
