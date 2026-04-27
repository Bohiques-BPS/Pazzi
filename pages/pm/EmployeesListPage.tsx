
import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { EmployeeFormModal } from './EmployeeFormModal'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES, EMPLOYEE_ROLES } from '../../constants'; // Adjusted path
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export const EmployeesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { employees, setEmployees } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    // Carga de datos real desde el backend al entrar a la página
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoadingData(true);
            try {
                const response = await fetch('http://localhost:3001/api/employees', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setEmployees(data);
                }
            } catch (error) {
                console.error("Error al cargar colaboradores:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchEmployees();
    }, [setEmployees]);
    
    const openModalForCreate = (initialData?: Partial<EmployeeFormData>) => { 
        setEditingEmployee(null); 
        if (initialData) {
            setEditingEmployee({ id: '', ...initialData } as Employee); 
        }
        setShowFormModal(true); 
    };
    const openModalForEdit = (emp: Employee) => { setEditingEmployee(emp); setShowFormModal(true); };
    
    const requestDelete = (empId: string) => {
        setItemToDeleteId(empId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (itemToDeleteId) {
            try {
                const response = await fetch(`http://localhost:3001/api/employees/${itemToDeleteId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`
                    }
                });
                if (response.ok) {
                    setEmployees(prev => prev.filter(e => e.id !== itemToDeleteId));
                } else {
                    alert("No se pudo eliminar el colaborador del servidor.");
                }
            } catch (error) {
                console.error("Error al eliminar colaborador:", error);
            } finally {
                setItemToDeleteId(null);
            }
        }
        setShowDeleteConfirmModal(false);
    };

    const columns: TableColumn<Employee>[] = [
        { header: t('employee.field.name'), accessor: 'name' },
        { header: t('employee.field.lastname'), accessor: 'lastName' },
        { header: t('employee.field.email'), accessor: 'email', noWrap: false },
        { header: t('employee.field.role'), accessor: 'role' },
    ];
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">{t('employee.list.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon /> {t('employee.list.create')}</button>
                </div>
            </div>

            {loadingData && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-neutral-600 dark:text-neutral-400">Cargando colaboradores...</span>
                </div>
            )}

            {!loadingData && (
                <DataTable<Employee> data={employees} columns={columns} actions={(emp) => (
                    <>
                        <button onClick={() => openModalForEdit(emp)} className="text-blue-600 dark:text-blue-400 p-1" aria-label={t('common.edit')}><EditIcon /></button>
                        <button onClick={() => requestDelete(emp.id)} className="text-red-600 dark:text-red-400 p-1" aria-label={t('common.delete')}><DeleteIcon /></button>
                    </>
                )} />
            )}
            <EmployeeFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} employee={editingEmployee} />
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
