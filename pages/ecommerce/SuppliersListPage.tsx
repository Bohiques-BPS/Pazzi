
import React, { useState } from 'react';
import { Supplier } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { SupplierFormModal } from './SupplierFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export const SuppliersListPage: React.FC = () => {
    const { t } = useTranslation();
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
        { header: t('ecommerce.suppliers.col.name'), accessor: 'name' },
        { header: t('ecommerce.suppliers.col.contact'), accessor: 'contactName' },
        { header: t('ecommerce.suppliers.col.email'), accessor: 'email' },
        { header: t('ecommerce.suppliers.col.phone'), accessor: 'phone' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('ecommerce.suppliers.title')}</h1>
                <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> {t('ecommerce.suppliers.create')}
                </button>
            </div>
            <DataTable<Supplier>
                data={suppliers}
                columns={columns}
                actions={(supplier) => (
                    <>
                        <button onClick={() => openModalForEdit(supplier)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('common.edit')}>
                            <EditIcon />
                        </button>
                        <button onClick={() => requestDelete(supplier.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('common.delete')}>
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
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
        </div>
    );
};
