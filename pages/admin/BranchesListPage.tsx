
import React, { useState } from 'react';
import { Branch, BranchFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BranchFormModal } from '../../components/forms/BranchFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';

export const BranchesListPage: React.FC = () => {
    const { branches, setBranches } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

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

    const confirmDelete = () => {
        if (itemToDeleteId) {
            // TODO: Add logic to check if branch is in use before deleting
            setBranches(prev => prev.filter(b => b.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const columns: TableColumn<Branch>[] = [
        { header: 'Nombre Sucursal', accessor: 'name' },
        { header: 'Dirección', accessor: 'address' },
        { header: 'Teléfono', accessor: 'phone' },
        { 
            header: 'Estado', 
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
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Sucursales</h1>
                <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> Crear Sucursal
                </button>
            </div>
            <DataTable<Branch>
                data={branches}
                columns={columns}
                actions={(branch) => (
                    <>
                        <button onClick={() => openModalForEdit(branch)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Editar ${branch.name}`}>
                            <EditIcon />
                        </button>
                        <button onClick={() => requestDelete(branch.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={`Eliminar ${branch.name}`}>
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
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar esta sucursal? Esta acción no se puede deshacer y podría afectar ventas o inventarios asociados."
                confirmButtonText="Sí, Eliminar"
            />
        </div>
    );
};
