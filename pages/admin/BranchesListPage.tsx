
import React, { useState, useEffect } from 'react';
import { Branch, BranchFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BranchFormModal } from '../../components/forms/BranchFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { API_URL } from '../../services/api';

export const BranchesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { branches, setBranches } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const fetchBranches = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`${API_URL}/branches`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) setBranches(data);
            } catch (error) {
                console.error("Error al cargar sucursales:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchBranches();
    }, [setBranches]);

    const openModalForCreate = () => {
        setEditingBranch(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setShowFormModal(true);
    };

    const requestDelete = (branchId: string) => {
        setItemToDeleteId(branchId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (itemToDeleteId) {
            try {
                const response = await fetch(`${API_URL}/branches/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                if (response.ok) {
                    setBranches(prev => prev.filter(b => b.id !== itemToDeleteId));
                } else {
                    console.error("Error: No se pudo eliminar la sucursal.");
                }
            } catch (error) {
                console.error("Error al eliminar sucursal:", error);
            }
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const columns: TableColumn<Branch>[] = [
        { header: t('branch.field.name'), accessor: 'name' },
        { header: t('branch.field.address'), accessor: 'address' },
        { header: t('branch.field.phone'), accessor: 'phone' },
        { 
            header: t('common.status'), 
            accessor: (branch) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    branch.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100'
                }`}>
                    {branch.isActive ? 'Activa' : 'Inactiva'}
                </span>
            )
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('branch.list.title')}</h1>
                <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> {t('branch.list.create')}
                </button>
            </div>

            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando sucursales...</span>
                </div>
            )}

            <DataTable<Branch>
                data={branches}
                columns={columns}
                actions={(branch) => (
                    <>
                        <button onClick={() => openModalForEdit(branch)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('common.edit')}>
                            <EditIcon />
                        </button>
                        <button onClick={() => requestDelete(branch.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('common.delete')}>
                            <DeleteIcon />
                        </button>
                    </>
                )}
            />
            <BranchFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                branchToEdit={editingBranch} 
            />
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
