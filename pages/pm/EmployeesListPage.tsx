import React, { useState, useEffect, useCallback } from 'react';
import { Employee, EmployeeFormData, UserStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { EmployeeFormModal } from './EmployeeFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, KeyIcon, PaperAirplaneIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { employeesService } from '../../services/employees';
import { authService } from '../../services/auth';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { PermissionGate } from '../../components/PermissionGate';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export const EmployeesListPage: React.FC = () => {
    const { t } = useTranslation();
    const { employees, setEmployees } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    const [resending, setResending] = useState<string | null>(null);
    const [resetForEmail, setResetForEmail] = useState<string | null>(null);

    const loadEmployees = useCallback(async () => {
        setLoadingData(true);
        try {
            const data = await employeesService.getAll();
            setEmployees(data as unknown as Employee[]);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setLoadingData(false);
        }
    }, [setEmployees]);

    useEffect(() => { loadEmployees(); }, [loadEmployees]);

    const openModalForCreate = (initialData?: Partial<EmployeeFormData>) => {
        setEditingEmployee(null);
        if (initialData) setEditingEmployee({ id: '', ...initialData } as Employee);
        setShowFormModal(true);
    };
    const openModalForEdit = (emp: Employee) => { setEditingEmployee(emp); setShowFormModal(true); };

    const requestDelete = (empId: string) => {
        setItemToDeleteId(empId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDeleteId) {
            setShowDeleteConfirmModal(false);
            return;
        }
        try {
            await employeesService.delete(itemToDeleteId);
            setEmployees(prev => prev.filter(e => e.id !== itemToDeleteId));
            toast.success('Colaborador eliminado');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar el colaborador');
        } finally {
            setItemToDeleteId(null);
            setShowDeleteConfirmModal(false);
        }
    };

    const handleResendInvitation = async (emp: Employee) => {
        setResending(emp.id);
        try {
            const res = await authService.resendInvitation(emp.id);
            toast.success(`Invitación reenviada. Expira el ${new Date(res.expiresAt).toLocaleString()}`);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al reenviar invitación');
        } finally {
            setResending(null);
        }
    };

    const confirmResetPassword = async () => {
        if (!resetForEmail) return;
        try {
            await authService.forgotPassword(resetForEmail);
            toast.success(`Se envió un enlace de reset de contraseña a ${resetForEmail}`);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al enviar reset');
        } finally {
            setResetForEmail(null);
        }
    };

    const statusBadge = (status?: UserStatus) => {
        if (!status) return <span className="text-xs text-neutral-400">Sin acceso</span>;
        const styles: Record<UserStatus, string> = {
            ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
            INVITED: 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100',
            DISABLED: 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100',
        };
        const labels: Record<UserStatus, string> = { ACTIVE: 'Activa', INVITED: 'Pendiente activación', DISABLED: 'Deshabilitada' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
    };

    const columns: TableColumn<Employee>[] = [
        { header: t('employee.field.name') || 'Nombre', accessor: 'name' },
        { header: t('employee.field.lastname') || 'Apellido', accessor: 'lastName' },
        { header: t('employee.field.email') || 'Email', accessor: 'email', noWrap: false },
        { header: t('employee.field.role') || 'Puesto', accessor: 'role' },
        {
            header: 'Acceso',
            accessor: (emp) => statusBadge((emp as any).user?.status),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">{t('employee.list.title') || 'Colaboradores'}</h1>
                <div className="flex items-center gap-2">
                    <PermissionGate require="employees.manage">
                        <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                            <PlusIcon /> {t('employee.list.create') || 'Crear colaborador'}
                        </button>
                    </PermissionGate>
                </div>
            </div>

            {loadingData && <LoadingSkeleton variant="table" rows={5} />}

            {!loadingData && employees.length === 0 && (
                <EmptyState
                    title="Sin colaboradores"
                    description="Aún no hay colaboradores. Crea el primero para empezar."
                    cta={
                        <PermissionGate require="employees.manage">
                            <button onClick={() => openModalForCreate()} className={BUTTON_PRIMARY_SM_CLASSES}>+ Crear primer colaborador</button>
                        </PermissionGate>
                    }
                />
            )}

            {!loadingData && employees.length > 0 && (
                <DataTable<Employee>
                    data={employees}
                    columns={columns}
                    actions={(emp) => {
                        const user = (emp as any).user as { status?: UserStatus } | undefined;
                        const isInvited = user?.status === 'INVITED';
                        const isActive = user?.status === 'ACTIVE';
                        return (
                            <div className="flex items-center gap-0.5">
                                {isInvited && (
                                    <PermissionGate require="employees.manage">
                                        <button
                                            onClick={() => handleResendInvitation(emp)}
                                            className="text-amber-600 dark:text-amber-400 p-1 hover:text-amber-800 disabled:opacity-40"
                                            title="Reenviar invitación"
                                            disabled={resending === emp.id}
                                        >
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                        </button>
                                    </PermissionGate>
                                )}
                                {isActive && (
                                    <PermissionGate require="employees.manage">
                                        <button
                                            onClick={() => setResetForEmail(emp.email)}
                                            className="text-purple-600 dark:text-purple-400 p-1 hover:text-purple-800"
                                            title="Enviar reset de contraseña"
                                        >
                                            <KeyIcon className="w-4 h-4" />
                                        </button>
                                    </PermissionGate>
                                )}
                                <PermissionGate require="employees.manage">
                                    <button onClick={() => openModalForEdit(emp)} className="text-blue-600 dark:text-blue-400 p-1" aria-label={t('common.edit') || 'Editar'}>
                                        <EditIcon />
                                    </button>
                                </PermissionGate>
                                <PermissionGate require="employees.manage">
                                    <button onClick={() => requestDelete(emp.id)} className="text-red-600 dark:text-red-400 p-1" aria-label={t('common.delete') || 'Eliminar'}>
                                        <DeleteIcon />
                                    </button>
                                </PermissionGate>
                            </div>
                        );
                    }}
                />
            )}

            <EmployeeFormModal isOpen={showFormModal} onClose={() => { setShowFormModal(false); loadEmployees(); }} employee={editingEmployee} />

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title') || 'Confirmar eliminación'}
                message={t('confirm.delete.message') || '¿Estás seguro de eliminar este colaborador? Si tiene acceso al sistema, su cuenta también será eliminada.'}
                confirmButtonText={t('confirm.delete.btn') || 'Sí, eliminar'}
            />

            <ConfirmationModal
                isOpen={!!resetForEmail}
                onClose={() => setResetForEmail(null)}
                onConfirm={confirmResetPassword}
                title="Enviar reset de contraseña"
                message={`Se enviará un enlace de recuperación al correo ${resetForEmail}. ¿Continuar?`}
                confirmButtonText="Sí, enviar"
            />
        </div>
    );
};
