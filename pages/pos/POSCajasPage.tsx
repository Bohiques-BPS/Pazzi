import React, { useState } from 'react';
import { Caja } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { CajaFormModal } from '../../components/forms/CajaFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';

export const POSCajasPage: React.FC = () => {
    const { cajas, setCajas, getBranchById } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCaja, setEditingCaja] = useState<Caja | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const openModalForCreate = () => {
        setEditingCaja(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (caja: Caja) => {
        setEditingCaja(caja);
        setShowFormModal(true);
    };

    const requestDelete = (cajaId: string) => {
        setItemToDeleteId(cajaId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = () => {
        if (itemToDeleteId) {
            // TODO: Add logic to check if caja is in use (e.g., in active shifts or sales)
            setCajas(prev => prev.filter(c => c.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const columns: TableColumn<Caja>[] = [
        { header: 'ID Caja', accessor: 'id' },
        { header: 'Nombre Caja', accessor: 'name' },
        { 
            header: 'Sucursal', 
            accessor: (caja) => getBranchById(caja.branchId)?.name || 'N/A' 
        },
        { 
            header: 'Aplica IVA', 
            accessor: (caja) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    caja.applyIVA ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                }`}>
                    {caja.applyIVA ? 'Sí' : 'No'}
                </span>
            )
        },
        { 
            header: 'Estado', 
            accessor: (caja) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    caja.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100'
                }`}>
                    {caja.isActive ? 'Activa' : 'Inactiva'}
                </span>
            )
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Cajas (Terminales POS)</h1>
                <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> Crear Caja
                </button>
            </div>
            <DataTable<Caja>
                data={cajas}
                columns={columns}
                actions={(caja) => (
                    <>
                        <button onClick={() => openModalForEdit(caja)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Editar ${caja.name}`}>
                            <EditIcon />
                        </button>
                        <button onClick={() => requestDelete(caja.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={`Eliminar ${caja.name}`}>
                            <DeleteIcon />
                        </button>
                    </>
                )}
            />
            <CajaFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                cajaToEdit={editingCaja} 
            />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar esta caja? Esta acción no se puede deshacer y podría afectar ventas o turnos asociados."
                confirmButtonText="Sí, Eliminar"
            />
        </div>
    );
};