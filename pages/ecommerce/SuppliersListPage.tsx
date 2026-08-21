
import React, { useState, useMemo, useEffect } from 'react';
import { deleteWithUndo } from '../../utils/deleteWithUndo';
import { useLocation } from 'react-router-dom';
import { Supplier } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { SupplierFormModal } from './SupplierFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, ADMIN_USER_ID } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../services/api';

export const SuppliersListPage: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { suppliers, setSuppliers, getSuppliersByStoreOwner } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const isTiendaModule = location.pathname.startsWith('/tienda');
    const storeOwnerId = isTiendaModule ? ADMIN_USER_ID : currentUser?.id;

    useEffect(() => {
        const fetchSuppliers = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`${API_URL}/suppliers`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setSuppliers(data);
                }
            } catch (error) {
                console.error("Error al cargar proveedores:", error);
                toast.error(t('ecomx.suppliers.load_error'));
            } finally {
                setLoadingData(false);
            }
        };
        fetchSuppliers();
    }, [setSuppliers]);

    const filteredSuppliers = useMemo(() => {
        if (!storeOwnerId) return [];
        return getSuppliersByStoreOwner(storeOwnerId);
    }, [getSuppliersByStoreOwner, storeOwnerId]);

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
        if (!itemToDeleteId) { setShowDeleteConfirmModal(false); return; }
        const id = itemToDeleteId;
        const item = suppliers.find(s => s.id === id);
        setItemToDeleteId(null);
        setShowDeleteConfirmModal(false);
        deleteWithUndo({
            label: t('entity.supplier'),
            optimisticRemove: () => setSuppliers(prev => prev.filter(s => s.id !== id)),
            restore: () => setSuppliers(prev => (item && !prev.some(s => s.id === id)) ? [item, ...prev] : prev),
            apiDelete: async () => {
                const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` } });
                if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || t('ecomx.suppliers.delete_error')); }
            },
            errorMessage: t('ecomx.suppliers.delete_error'),
        });
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
            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">{t('ecomx.suppliers.loading')}</span>
                </div>
            )}

            <DataTable<Supplier> onRowClick={openModalForEdit}
                data={filteredSuppliers}
                columns={columns}
                actions={(supplier) => (
                    <>
                        <button onClick={() => openModalForEdit(supplier)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('common.edit')}>
                            <EditIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => requestDelete(supplier.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('common.delete')}>
                            <DeleteIcon className="w-5 h-5" />
                        </button>
                    </>
                )}
            />
            <SupplierFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                supplier={editingSupplier} 
                storeOwnerId={storeOwnerId}
            />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('ecomx.confirm.delete_title')}
                message={(() => {
                    const name = suppliers.find(s => s.id === itemToDeleteId)?.name || '';
                    return name
                        ? t('confirm.delete.named_item', { item: t('confirm.delete.def.supplier'), name })
                        : t('confirm.delete.named', { item: t('confirm.delete.n.supplier') });
                })()}
                confirmButtonText={t('ecomx.confirm.delete_yes')}
            />
        </div>
    );
};
