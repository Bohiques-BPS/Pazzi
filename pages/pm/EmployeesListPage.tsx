import React, { useState, useEffect, useCallback } from 'react';
import { Employee, EmployeeFormData, UserStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { EmployeeFormModal } from './EmployeeFormModal';
import { ConfirmationModal, Modal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, KeyIcon, PaperAirplaneIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
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
    // Empleado con la invitación pendiente de confirmar (abre modal de confirmación de correo).
    const [resendFor, setResendFor] = useState<{ emp: Employee; noAccess: boolean } | null>(null);
    // Respaldo copiable del enlace de activación (por si el correo no está configurado o falló).
    const [activationInfo, setActivationInfo] = useState<{ name: string; link: string; emailSent?: boolean } | null>(null);

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
            toast.success(t('pm2x.employee.deleted'));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.employee.delete_error'));
        } finally {
            setItemToDeleteId(null);
            setShowDeleteConfirmModal(false);
        }
    };

    const handleResendInvitation = async (emp: Employee) => {
        setResending(emp.id);
        try {
            const res = await authService.resendInvitation(emp.id);
            toast.success(res.emailSent
                ? t('pm2x.employee.invite_sent', { date: new Date(res.expiresAt).toLocaleString() })
                : t('pm2x.employee.link_generated'));
            if (res.activationLink) {
                setActivationInfo({ name: `${emp.name} ${emp.lastName}`, link: res.activationLink, emailSent: res.emailSent });
            }
            loadEmployees(); // refresca el estado de acceso (Sin acceso → Pendiente activación)
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.employee.invite_error'));
        } finally {
            setResending(null);
        }
    };

    const handleAssignNumbers = async () => {
        try {
            const res = await employeesService.assignNumbers();
            toast.success(res.assigned > 0 ? t('pm2x.employee.numbers_assigned', { n: res.assigned }) : t('pm2x.employee.all_have_numbers'));
            loadEmployees();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.employee.numbers_error'));
        }
    };

    const copyActivationLink = async () => {
        if (!activationInfo) return;
        try { await navigator.clipboard.writeText(activationInfo.link); toast.success(t('pm2x.employee.link_copied')); }
        catch { toast.error(t('pm2x.employee.copy_error')); }
    };

    const confirmResetPassword = async () => {
        if (!resetForEmail) return;
        try {
            await authService.forgotPassword(resetForEmail);
            toast.success(t('pm2x.employee.reset_sent', { email: resetForEmail }));
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.employee.reset_error'));
        } finally {
            setResetForEmail(null);
        }
    };

    const statusBadge = (status?: UserStatus) => {
        if (!status) return <span className="text-xs text-neutral-400">{t('pm2x.employee.no_access')}</span>;
        const styles: Record<UserStatus, string> = {
            ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
            INVITED: 'bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100',
            DISABLED: 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100',
        };
        const labels: Record<UserStatus, string> = { ACTIVE: t('pm2x.employee.status.active'), INVITED: t('pm2x.employee.status.invited'), DISABLED: t('pm2x.employee.status.disabled') };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
    };

    const columns: TableColumn<Employee>[] = [
        { header: t('pm2x.employee.col.number'), accessor: (emp) => (emp.employeeNumber ?? '—') as any },
        { header: t('employee.field.name') || 'Nombre', accessor: 'name' },
        { header: t('employee.field.lastname') || 'Apellido', accessor: 'lastName' },
        { header: t('employee.field.email') || 'Email', accessor: 'email', noWrap: false },
        { header: t('employee.field.role') || 'Puesto', accessor: 'role' },
        {
            header: t('pm2x.employee.col.access'),
            accessor: (emp) => statusBadge((emp as any).user?.status),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">{t('employee.list.title') || 'Empleados'}</h1>
                <div className="flex items-center gap-2">
                    <PermissionGate require="employees.manage">
                        <button onClick={handleAssignNumbers} className={BUTTON_SECONDARY_SM_CLASSES} title={t('pm2x.employee.assign_numbers_title')}>
                            {t('pm2x.employee.assign_numbers')}
                        </button>
                        <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                            <PlusIcon /> {t('employee.list.create') || 'Crear empleado'}
                        </button>
                    </PermissionGate>
                </div>
            </div>

            {loadingData && <LoadingSkeleton variant="table" rows={5} />}

            {!loadingData && employees.length === 0 && (
                <EmptyState
                    title={t('pm2x.employee.empty_title')}
                    description={t('pm2x.employee.empty_desc')}
                    cta={
                        <PermissionGate require="employees.manage">
                            <button onClick={() => openModalForCreate()} className={BUTTON_PRIMARY_SM_CLASSES}>{t('pm2x.employee.create_first')}</button>
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
                        const noAccess = !user; // "Sin acceso": aún no tiene cuenta
                        return (
                            <div className="flex items-center gap-0.5">
                                {(isInvited || noAccess) && (
                                    <PermissionGate require="employees.manage">
                                        <button
                                            onClick={() => setResendFor({ emp, noAccess })}
                                            className="text-amber-600 dark:text-amber-400 p-1 hover:text-amber-800 disabled:opacity-40"
                                            title={noAccess ? t('pm2x.employee.give_access_title') : t('pm2x.employee.resend_title')}
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
                                            title={t('pm2x.employee.reset_title')}
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

            <EmployeeFormModal isOpen={showFormModal} onClose={() => { setShowFormModal(false); loadEmployees(); }} employee={editingEmployee} onActivationLink={setActivationInfo} />

            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title') || 'Confirmar eliminación'}
                message={(() => {
                    const e = employees.find(x => x.id === itemToDeleteId);
                    const name = e ? `${e.name} ${e.lastName}`.trim() : '';
                    return name
                        ? t('confirm.delete.named_item', { item: t('confirm.delete.def.employee'), name })
                        : t('confirm.delete.employee_msg');
                })()}
                confirmButtonText={t('confirm.delete.btn') || 'Sí, eliminar'}
            />

            <ConfirmationModal
                isOpen={!!resetForEmail}
                onClose={() => setResetForEmail(null)}
                onConfirm={confirmResetPassword}
                title={t('pm2x.employee.reset_title')}
                message={t('pm2x.employee.reset_confirm_msg', { email: resetForEmail ?? '' })}
                confirmButtonText={t('pm2x.employee.yes_send')}
            />

            <ConfirmationModal
                isOpen={!!resendFor}
                onClose={() => setResendFor(null)}
                onConfirm={() => { if (resendFor) handleResendInvitation(resendFor.emp); }}
                title={resendFor?.noAccess ? t('pm2x.employee.give_access_title') : t('pm2x.employee.resend_title')}
                confirmButtonText={t('pm2x.employee.yes_send')}
                message={
                    <div className="space-y-3">
                        <p>{t('pm2x.employee.resend_confirm_msg')}</p>
                        <div className="text-left">
                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('employee.field.email') || 'Email'}</label>
                            <input
                                type="email"
                                readOnly
                                value={resendFor?.emp.email || ''}
                                onFocus={(e) => e.currentTarget.select()}
                                aria-label={t('employee.field.email') || 'Email'}
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 font-medium cursor-default focus:outline-none"
                            />
                            <p className="text-xs text-neutral-400 mt-1">{t('pm2x.employee.resend_confirm_hint')}</p>
                        </div>
                    </div>
                }
            />

            <Modal isOpen={!!activationInfo} onClose={() => setActivationInfo(null)} title={t('pm2x.employee.activation_title')} size="md">
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {activationInfo?.emailSent
                            ? <>{t('pm2x.employee.activation_sent_pre')}<strong>{activationInfo?.name}</strong>{t('pm2x.employee.activation_sent_post')}</>
                            : <>{t('pm2x.employee.activation_share_pre')}<strong>{activationInfo?.name}</strong>{t('pm2x.employee.activation_share_post')}</>}
                    </p>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={activationInfo?.link || ''}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-full text-xs px-2 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700"
                        />
                        <button onClick={copyActivationLink} className={`${BUTTON_PRIMARY_SM_CLASSES} whitespace-nowrap`}>{t('pm2x.common.copy')}</button>
                    </div>
                    <p className="text-xs text-neutral-400">{t('pm2x.employee.link_expires')}</p>
                </div>
            </Modal>
        </div>
    );
};
