
import React, { useState } from 'react';
import { Department } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { DepartmentFormModal } from './DepartmentFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { AIImportModal } from '../../components/AIImportModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export const DepartmentsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { departments, setDepartments } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);

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

    const confirmDelete = () => {
        if(itemToDeleteId) {
            setDepartments(prev => prev.filter(d => d.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const handleAiDepartmentImportSuccess = (dataArray: any[]) => {
        console.log("AI Data Array for Department Import:", dataArray);
        if (!Array.isArray(dataArray)) {
            alert("La IA no devolvió un array de datos de departamentos.");
            return;
        }

        let importedCount = 0;
        let failedCount = 0;
        const newDepartments: Department[] = [];

        dataArray.forEach((item, index) => {
            const name = item.nombre || item.name || '';
            
            if (!name) {
                console.warn(`Ítem ${index} omitido por falta de nombre:`, item);
                failedCount++;
                return;
            }

            const isDuplicate = departments.some(dep => dep.name.toLowerCase() === name.toLowerCase());
            if (isDuplicate) {
                console.warn(`Departamento duplicado omitido: ${name}`);
                failedCount++;
                return;
            }

            const newDepartment: Department = {
                id: `dept-ai-${Date.now()}-${index}`,
                name: name,
                storeOwnerId: 'admin-user' // Assume admin user for now
            };
            newDepartments.push(newDepartment);
            importedCount++;
        });

        if (newDepartments.length > 0) {
            setDepartments(prev => [...prev, ...newDepartments]);
        }
        
        let message = `${importedCount} departamentos importados correctamente.`;
        if (failedCount > 0) {
            message += ` ${failedCount} departamentos no pudieron ser importados (vacíos o duplicados).`;
        }
        alert(message);
        setShowAIImportModal(false);
    };

    const columns: TableColumn<Department>[] = [
        { header: t('department.field.name'), accessor: 'name', className: 'w-full' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('department.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                        <SparklesIcon /> {t('common.import_ai')}
                    </button>
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                        <PlusIcon /> {t('department.list.create')}
                    </button>
                </div>
            </div>
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
            <DepartmentFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} department={editingDepartment} />
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
                onImportSuccess={handleAiDepartmentImportSuccess}
                entityName="Departamento"
                fieldsToExtract="nombre (string)"
                exampleFormat={`{
  "nombre": "Ferretería"
}`}
            />
        </div>
    );
};
