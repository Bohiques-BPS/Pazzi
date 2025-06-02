
import React, { useState } from 'react';
import { Supplier } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { SupplierFormModal } from './SupplierFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';

export const SuppliersListPage: React.FC = () => {
    const { suppliers, setSuppliers } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const openModalForCreate = () => {
        setEditingSupplier(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setShowFormModal(true);
    };

    const requestDelete = (supplierId: string) => {
        setItemToDeleteId(supplierId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = () => {
        if (itemToDeleteId) {
            setSuppliers(prev => prev.filter(s => s.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const columns: TableColumn<Supplier>[] = [
        { header: 'Nombre Proveedor', accessor: 'name' },
        { header: 'Contacto', accessor: 'contactName' },
        { header: 'Email', accessor: 'email' },
        { header: 'Teléfono', accessor: 'phone' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Proveedores</h1>
                <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> Crear Proveedor
                </button>
            </div>
            <DataTable<Supplier>
                data={suppliers}
                columns={columns}
                actions={(supplier) => (
                    <>
                        <button onClick={() => openModalForEdit(supplier)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Editar ${supplier.name}`}>
                            <EditIcon />
                        </button>
                        <button onClick={() => requestDelete(supplier.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={`Eliminar ${supplier.name}`}>
                            <DeleteIcon />
                        </button>
                    </>
                )}
            />
            <SupplierFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} supplier={editingSupplier} />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar este proveedor? Esta acción no se puede deshacer."
                confirmButtonText="Sí, Eliminar"
            />
        </div>
    );
};
