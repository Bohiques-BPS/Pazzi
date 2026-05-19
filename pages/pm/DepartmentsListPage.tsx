
import React, { useState, useEffect } from 'react';
import { Department } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { DepartmentFormModal } from './DepartmentFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';
import { API_URL } from './api';

export const DepartmentsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { departments, setDepartments } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    // Carga de datos real desde el backend al entrar a la página
    useEffect(() => {
        const fetchDepartments = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`${API_URL}/departments`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setDepartments(data);
                }
            } catch (error) {
                console.error("Error al cargar departamentos:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchDepartments();
    }, [setDepartments]);

    const openModalForCreate = () => {
        setEditingDepartment(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (department: Department) => {
        setEditingDepartment(department);
        setShowFormModal(true);
    };

    const requestDelete = (departmentId: string) => {
        setItemToDeleteId(departmentId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if(itemToDeleteId) {
            try {
                const response = await fetch(`${API_URL}/departments/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                if (response.ok) {
                    setDepartments(prev => prev.filter(d => d.id !== itemToDeleteId));
                    toast.success('Departamento eliminado');
                } else {
                    toast.error("Error al eliminar el departamento.");
                }
            } catch (error) {
                toast.error("Error de conexión al intentar eliminar.");
            } finally {
                setItemToDeleteId(null);
                setShowDeleteConfirmModal(false);
            }
        }
    };

    const columns: TableColumn<Department>[] = [
        { header: t('department.field.name'), accessor: 'name' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('department.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                        <PlusIcon /> {t('department.list.create')}
                    </button>
                </div>
            </div>
            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando departamentos...</span>
                </div>
            )}
            {!loadingData && (
                <DataTable<Department>
                    data={departments}
                    columns={columns}
                    actions={(department) => (
                        <>
                            <button onClick={() => openModalForEdit(department)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('common.edit')}>
                                <EditIcon />
                            </button>
                            <button onClick={() => requestDelete(department.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('common.delete')}>
                                <DeleteIcon />
                            </button>
                        </>
                    )}
                />
            )}
            <DepartmentFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} department={editingDepartment} />
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
