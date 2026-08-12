import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Employee, EmployeeFormData, UserStatus, PermissionCategory, EmployeePermissions } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { EMPLOYEE_ROLES, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { LockClosedIcon, KeyIcon, CameraIcon, TrashIconMini, ExclamationTriangleIcon } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { employeesService, type EmployeeRecord } from '../../services/employees';
import { permissionsService } from '../../services/permissions';
import { authService } from '../../services/auth';
import { API_URL, ApiError } from '../../services/api';
import { employeePositionsService, employeeDepartmentsService, type LookupItem } from '../../services/employeeMeta';
import { PlusIcon } from '../../components/icons';
import { rolesService, type Role } from '../../services/roles';
import { RoleFormModal } from './RoleFormModal';
import { SelectWithCreate } from '../../components/ui/SelectWithCreate';

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
    /** Se invoca al crear un colaborador con acceso: devuelve el enlace de activación (respaldo). */
    onActivationLink?: (info: { name: string; link: string; emailSent?: boolean }) => void;
}

interface EmployeeFormState extends EmployeeFormData {
    enableLogin?: boolean;
}

const fieldToTabMap: Record<string, string> = {
    name: 'Personal',
    lastName: 'Personal',
    phone: 'Personal',
    email: 'Acceso y Empleo',
    pin: 'Acceso y Empleo',
    confirmPin: 'Acceso y Empleo',
    role: 'Acceso y Empleo',
    salary: 'Acceso y Empleo',
};

// ── QuickCreateModal — mini-modal para crear puestos o departamentos ──────────
interface QuickCreateModalProps {
    isOpen: boolean;
    title: string;
    placeholder: string;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ isOpen, title, placeholder, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    if (!isOpen) return null;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onCreate(name.trim());
            setName('');
            onClose();
        } catch {
            toast.error('Error al guardar. Intente de nuevo.');
        } finally {
            setSaving(false);
        }
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={placeholder}
                    className={inputFormStyle}
                    autoFocus
                />
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={saving}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={saving || !name.trim()}>
                        {saving ? 'Guardando...' : 'Crear'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, employee, onActivationLink }) => {
    const { t } = useTranslation();
    const { setEmployees } = useData();

    const [activeTab, setActiveTab] = useState('Personal');
    const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [linkedUser, setLinkedUser] = useState<EmployeeRecord['user']>(null);
    const [resending, setResending] = useState(false);
    // Tras guardar con email cambiado, preguntamos si reenviar el correo de activación.
    const [askResend, setAskResend] = useState(false);

    const tabs = [
        { id: 'Personal', label: t('employee.tab.personal') || 'Personal' },
        { id: 'Acceso y Empleo', label: t('employee.tab.access') || 'Acceso y Empleo' },
        { id: 'Acceso y Permisos', label: 'Acceso y Permisos' },
        { id: 'Información Adicional', label: t('employee.tab.info') || 'Información Adicional' },
    ];

    const initialFormState: EmployeeFormState = {
        name: '',
        lastName: '',
        email: '',
        employeeNumber: undefined,
        role: EMPLOYEE_ROLES[0],
        address: '',
        phone: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
        emergencyContactPhone: '',
        hireDate: new Date().toISOString().split('T')[0],
        department: '',
        salary: 0,
        bankName: '',
        bankAccountNumber: '',
        socialSecurityNumber: '',
        profilePictureUrl: '',
        pin: '',
        confirmPin: '',
        permissions: {},
        enableLogin: false,
    };

    const [formData, setFormData] = useState<EmployeeFormState>(initialFormState);
    // Sueldo como string mientras se edita (permite escribir el punto decimal sin que se borre).
    const [salaryInput, setSalaryInput] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [positions, setPositions] = useState<LookupItem[]>([]);
    const [empDepartments, setEmpDepartments] = useState<LookupItem[]>([]);
    const [showPositionModal, setShowPositionModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);
    // Rol de permisos (centralizado). Los permisos vienen 100% del rol.
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissionRoleId, setPermissionRoleId] = useState<string>('');
    const [showRoleModal, setShowRoleModal] = useState(false);

    // Cargar catálogo de permisos cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setCatalogLoading(true);
        permissionsService.getCatalog()
            .then(res => { if (!cancelled) setCatalog(res.categories); })
            .catch(() => { if (!cancelled) toast.error('No se pudo cargar el catálogo de permisos'); })
            .finally(() => { if (!cancelled) setCatalogLoading(false); });
        employeePositionsService.getAll().then(data => { if (!cancelled) setPositions(data); }).catch(() => {});
        employeeDepartmentsService.getAll().then(data => { if (!cancelled) setEmpDepartments(data); }).catch(() => {});
        rolesService.getAll().then(data => { if (!cancelled) setRoles(data); }).catch(() => {});
        return () => { cancelled = true; };
    }, [isOpen]);

    // Inicializar el form al abrir
    useEffect(() => {
        if (!isOpen) return;
        if (employee) {
            const empAny = employee as unknown as EmployeeRecord;
            const linked = empAny.user ?? null;
            setLinkedUser(linked);
            setPermissionRoleId((linked as any)?.permissionRoleId || '');
            setFormData({
                name: employee.name,
                lastName: employee.lastName,
                email: employee.email,
                employeeNumber: employee.employeeNumber ?? undefined,
                role: employee.role,
                address: employee.address || '',
                phone: employee.phone || '',
                emergencyContactName: employee.emergencyContactName || '',
                emergencyContactRelationship: employee.emergencyContactRelationship || '',
                emergencyContactPhone: employee.emergencyContactPhone || '',
                hireDate: employee.hireDate || new Date().toISOString().split('T')[0],
                department: employee.department || '',
                salary: employee.salary || 0,
                bankName: employee.bankName || '',
                bankAccountNumber: employee.bankAccountNumber || '',
                socialSecurityNumber: employee.socialSecurityNumber || '',
                profilePictureUrl: employee.profilePictureUrl || '',
                pin: employee.pin || '',
                confirmPin: employee.pin || '',
                permissions: linked?.permissions?.permissions || {},
                enableLogin: !!linked,
            });
            setSalaryInput(employee.salary ? String(employee.salary) : '');
        } else {
            setLinkedUser(null);
            setPermissionRoleId('');
            setFormData(initialFormState);
            setSalaryInput('');
        }
        setActiveTab('Personal');
        setImageFile(null);
        setFieldErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employee, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (parseFloat(value) || 0) : value,
        }));
    };

    const handleEnableLoginToggle = (checked: boolean) => {
        setFormData(prev => ({ ...prev, enableLogin: checked }));
    };

    const handlePermissionToggle = (key: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...(prev.permissions || {}), [key]: checked },
        }));
    };

    const toggleCategoryAll = (category: PermissionCategory, target: boolean) => {
        setFormData(prev => {
            const next = { ...(prev.permissions || {}) };
            for (const p of category.permissions) next[p.key] = target;
            return { ...prev, permissions: next };
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, profilePictureUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleResendInvitation = async () => {
        if (!employee) return;
        setResending(true);
        try {
            const res = await authService.resendInvitation(employee.id);
            toast.success(`Invitación reenviada. Expira el ${new Date(res.expiresAt).toLocaleString()}`);
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Error al reenviar invitación';
            toast.error(msg);
        } finally {
            setResending(false);
        }
    };

    const validateForm = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = 'El nombre es requerido';
        if (!formData.lastName.trim()) errors.lastName = 'El apellido es requerido';
        if (!formData.email.trim()) errors.email = 'El email es requerido';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'El formato del email es inválido';

        if (formData.pin || formData.confirmPin) {
            if (!/^\d{4}$/.test(formData.pin || '')) errors.pin = 'Deben ser 4 números';
            if (formData.pin !== formData.confirmPin) errors.confirmPin = 'PIN no coincide';
        }

        if (salaryInput.trim() && !Number.isFinite(parseFloat(salaryInput.replace(',', '.')))) errors.salary = 'Monto inválido';

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const localErrors = validateForm();
        setFieldErrors(localErrors);

        if (Object.keys(localErrors).length > 0) {
            const firstErrorField = Object.keys(localErrors)[0];
            const targetTab = fieldToTabMap[firstErrorField];
            if (targetTab) setActiveTab(targetTab);
            return;
        }

        setIsSubmitting(true);
        try {
            let finalImageUrl = formData.profilePictureUrl;
            if (imageFile) {
                const token = localStorage.getItem('pazzi_token');
                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile);
                const uploadResponse = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: uploadFormData,
                });
                if (!uploadResponse.ok) throw new Error('Error al subir la imagen al servidor');
                const uploadResult = await uploadResponse.json();
                finalImageUrl = uploadResult.url;
            }

            const { confirmPin, enableLogin, permissions, salary, ...rest } = formData;
            // Los permisos vienen del ROL (centralizado). Mandamos su snapshot como legacy.
            const rolePerms = roles.find(r => r.id === permissionRoleId)?.permissions || {};
            const salaryNum = parseFloat(salaryInput.replace(',', '.'));
            const payload = {
                ...rest,
                profilePictureUrl: finalImageUrl,
                salary: Number.isFinite(salaryNum) && salaryNum > 0 ? salaryNum : null,
                // Solo enviar enableLogin si estamos creando o si se está habilitando por primera vez
                ...(employee ? {} : { enableLogin: !!enableLogin }),
                // Si hay user vinculado o estamos creando con login → mandar rol + snapshot de permisos
                ...(enableLogin || linkedUser ? { permissionRoleId: permissionRoleId || null, permissions: rolePerms } : {}),
            };

            const saved = employee
                ? await employeesService.update(employee.id, payload)
                : await employeesService.create(payload);

            setEmployees(prev => employee
                ? prev.map(emp => emp.id === employee.id ? (saved as unknown as Employee) : emp)
                : [...prev, saved as unknown as Employee]);

            // ¿Cambió el email de un empleado con cuenta de acceso? → preguntar si reenviar.
            const emailChanged = !!employee && !!linkedUser && employee.email !== formData.email.trim();

            const activationLink = (saved as any)?.activationLink as string | undefined;
            const emailSent = (saved as any)?.emailSent as boolean | undefined;
            if (!employee && enableLogin) {
                toast.success(emailSent
                    ? 'Empleado creado. Se envió una invitación por correo para activar su cuenta.'
                    : 'Empleado creado. Comparte el enlace de activación (el correo no pudo enviarse).');
                if (activationLink) {
                    onActivationLink?.({ name: `${formData.name} ${formData.lastName}`.trim(), link: activationLink, emailSent });
                }
            } else {
                toast.success(employee ? 'Empleado actualizado' : 'Empleado creado');
            }

            if (emailChanged) {
                // No cerramos aún: mostramos la confirmación de reenvío.
                setAskResend(true);
            } else {
                onClose();
            }
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 400 && Array.isArray(error.errors)) {
                    const backendErrors: Record<string, string> = {};
                    error.errors.forEach((err: any) => {
                        const path = err.field || err.path?.[0];
                        if (path) backendErrors[path] = err.message;
                    });
                    setFieldErrors(backendErrors);
                    toast.error('Revise los errores marcados en el formulario');
                } else {
                    toast.error(error.message);
                }
            } else {
                toast.error('Error de conexión con el servidor');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabsWithErrors = useMemo(() => {
        const tabSet = new Set<string>();
        Object.keys(fieldErrors).forEach(field => {
            const tabName = fieldToTabMap[field];
            if (tabName) tabSet.add(tabName);
        });
        return tabSet;
    }, [fieldErrors]);

    const permsCount = useMemo(() => {
        const perms = formData.permissions as EmployeePermissions || {};
        return Object.values(perms).filter(Boolean).length;
    }, [formData.permissions]);

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? (t('employee.form.edit') || 'Editar empleado') : (t('employee.form.create') || 'Nuevo empleado')} size="2xl">
            <form onSubmit={handleSubmit}>
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4 overflow-x-auto">
                    {tabs.map(tab => {
                        const hasError = tabsWithErrors.has(tab.id);
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : hasError
                                            ? 'border-red-500 text-red-600'
                                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                }`}
                            >
                                {tab.label}
                                {hasError && <span className="ml-1 text-red-500 font-bold">*</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 px-1">
                    {Object.keys(fieldErrors).length > 0 && (
                        <div className="p-3 mb-2 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-xs">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            Por favor, corrija los errores en las pestañas marcadas.
                        </div>
                    )}

                    {/* Personal Tab */}
                    <div className={activeTab === 'Personal' ? 'space-y-4' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">{t('employee.field.name') || 'Nombre'}</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">{t('employee.field.lastname') || 'Apellido'}</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">{t('employee.field.phone') || 'Teléfono'}</label>
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="## #### ####" className={inputFormStyle} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">{t('employee.field.address') || 'Dirección'}</label>
                            <RichTextEditor value={formData.address || ''} onChange={(value) => setFormData(prev => ({ ...prev, address: value }))} placeholder="Dirección completa" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Foto de Perfil</label>
                            <div className="mt-1 flex items-center space-x-4">
                                {formData.profilePictureUrl ? (
                                    <div className="relative w-24 h-24 border rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-inner">
                                        <img src={formData.profilePictureUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, profilePictureUrl: '' })); setImageFile(null); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                            <TrashIconMini className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <label htmlFor="employee-image-input" className="w-24 h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors" title="Haz clic para elegir una imagen">
                                        <CameraIcon className="w-8 h-8 text-neutral-400" />
                                    </label>
                                )}
                                <label className={BUTTON_SECONDARY_SM_CLASSES + ' cursor-pointer'}>
                                    Elegir Archivo
                                    <input id="employee-image-input" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Acceso y Empleo Tab */}
                    <div className={activeTab === 'Acceso y Empleo' ? 'space-y-4' : 'hidden'}>
                        <div>
                            <label className="block text-sm font-medium">Email (usuario)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`} />
                            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                            {!!employee && linkedUser && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Si cambias el email, también se actualiza el correo de acceso del empleado.</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 dark:border-neutral-600">
                            <div>
                                <label className="block text-sm font-medium flex items-center"><KeyIcon className="w-3 h-3 mr-1" />PIN POS (4 dígitos)</label>
                                <input type="password" name="pin" value={formData.pin || ''} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.pin ? 'border-red-500 focus:ring-red-500' : ''}`} placeholder="****" maxLength={4} />
                                {fieldErrors.pin && <p className="mt-1 text-xs text-red-500">{fieldErrors.pin}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium flex items-center"><KeyIcon className="w-3 h-3 mr-1" />Confirmar PIN</label>
                                <input type="password" name="confirmPin" value={formData.confirmPin || ''} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.confirmPin ? 'border-red-500 focus:ring-red-500' : ''}`} placeholder="****" maxLength={4} />
                                {fieldErrors.confirmPin && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPin}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Puesto</label>
                                <div className="flex gap-2">
                                    <select name="role" value={formData.role} onChange={handleChange} className={inputFormStyle + ' flex-1'}>
                                        <option value="">-- Seleccionar --</option>
                                        {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setShowPositionModal(true)} className={BUTTON_SECONDARY_SM_CLASSES} title="Agregar nuevo puesto">
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Departamento</label>
                                <div className="flex gap-2">
                                    <select name="department" value={formData.department || ''} onChange={handleChange} className={inputFormStyle + ' flex-1'}>
                                        <option value="">-- Seleccionar --</option>
                                        {empDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setShowDeptModal(true)} className={BUTTON_SECONDARY_SM_CLASSES} title="Agregar nuevo departamento">
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Número de empleado</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="employeeNumber"
                                    value={formData.employeeNumber ?? ''}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        setFormData(prev => ({ ...prev, employeeNumber: digits ? Number(digits) : undefined } as EmployeeFormState));
                                    }}
                                    placeholder="Automático si lo dejas vacío"
                                    className={inputFormStyle}
                                />
                                <p className="mt-1 text-xs text-neutral-500">Identificador del empleado (para el ponche). Se asigna solo si lo dejas vacío.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fecha de contratación</label>
                                <input type="date" name="hireDate" value={formData.hireDate || ''} onChange={handleChange} className={inputFormStyle} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Salario (anual)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="salary"
                                    value={salaryInput}
                                    onChange={(e) => setSalaryInput(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                                    placeholder="0.00"
                                    autoComplete="off"
                                    className={`${inputFormStyle} ${fieldErrors.salary ? 'border-red-500 focus:ring-red-500' : ''}`}
                                />
                                {fieldErrors.salary && <p className="mt-1 text-xs text-red-500">{fieldErrors.salary}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Acceso y Permisos Tab */}
                    <div className={activeTab === 'Acceso y Permisos' ? 'space-y-4' : 'hidden'}>
                        {linkedUser && (
                            <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 flex items-center justify-between flex-wrap gap-2">
                                <div className="text-sm">
                                    <span className="font-medium">Estado de la cuenta:</span>{' '}
                                    {linkedUser.status === UserStatus.ACTIVE && <span className="text-green-600 dark:text-green-400">Activa</span>}
                                    {linkedUser.status === UserStatus.INVITED && <span className="text-amber-600 dark:text-amber-400">Pendiente de activación</span>}
                                    {linkedUser.status === UserStatus.DISABLED && <span className="text-red-600 dark:text-red-400">Deshabilitada</span>}
                                    {linkedUser.lastLoginAt && <span className="text-xs text-neutral-500 ml-2">(último login: {new Date(linkedUser.lastLoginAt).toLocaleString()})</span>}
                                </div>
                                {linkedUser.status === UserStatus.INVITED && (
                                    <button type="button" className={BUTTON_SECONDARY_SM_CLASSES} disabled={resending} onClick={handleResendInvitation}>
                                        {resending ? 'Reenviando...' : 'Reenviar invitación'}
                                    </button>
                                )}
                            </div>
                        )}

                        {!employee && (
                            <label className="flex items-start gap-2 p-3 rounded-md border border-neutral-200 dark:border-neutral-600 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                <input
                                    type="checkbox"
                                    checked={!!formData.enableLogin}
                                    onChange={(e) => handleEnableLoginToggle(e.target.checked)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <div className="text-sm font-medium flex items-center"><LockClosedIcon className="w-4 h-4 mr-1" /> Habilitar acceso al sistema</div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        Se enviará un correo a {formData.email || 'el empleado'} con un enlace para que cree su contraseña.
                                        Si lo dejas desactivado, el empleado solo será un registro de RRHH sin login.
                                    </p>
                                </div>
                            </label>
                        )}

                        {(formData.enableLogin || linkedUser) && (
                            <div className="space-y-3">
                                {/* Selector de ROL centralizado. Los permisos vienen 100% del rol. */}
                                <SelectWithCreate
                                    id="permissionRoleId"
                                    label="Rol del empleado"
                                    value={permissionRoleId}
                                    onChange={setPermissionRoleId}
                                    options={roles.map(r => ({ value: r.id, label: r.name }))}
                                    onCreateClick={() => setShowRoleModal(true)}
                                    placeholder="Sin rol asignado"
                                    emptyHint="No hay roles. Usa + para crear uno (ej: Caja) con sus permisos."
                                    createTitle="Crear nuevo rol"
                                />

                                <div className="flex items-center justify-between pt-2">
                                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Permisos del rol (solo lectura)</h4>
                                    <span className="text-xs text-neutral-500">
                                        {Object.values(roles.find(r => r.id === permissionRoleId)?.permissions || {}).filter(Boolean).length} permiso(s)
                                    </span>
                                </div>

                                {!permissionRoleId ? (
                                    <div className="text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-700/40 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-md p-3">
                                        Selecciona un rol arriba (o créalo con +). Los permisos se administran en el rol —
                                        editarlo actualiza a todos los empleados que lo tengan.
                                    </div>
                                ) : catalog.map(category => {
                                    const perms = roles.find(r => r.id === permissionRoleId)?.permissions || {};
                                    return (
                                        <fieldset key={category.key} className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                                                {category.label}
                                            </legend>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                                                {category.permissions.map(p => (
                                                    <label key={p.key} className={`flex items-center text-sm gap-2 ${perms[p.key] ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                                        <input type="checkbox" checked={perms[p.key] === true} disabled readOnly className="rounded" />
                                                        <span>{p.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Información Adicional Tab */}
                    <div className={activeTab === 'Información Adicional' ? 'space-y-4' : 'hidden'}>
                        <div>
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Contacto de emergencia</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-sm font-medium">Nombre del contacto</label>
                                    <input type="text" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Relación</label>
                                    <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship || ''} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                            <div className="mt-2">
                                <label className="block text-sm font-medium">Teléfono de emergencia</label>
                                <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                        <div className="pt-4 border-t dark:border-neutral-700">
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Información bancaria (sensible)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-sm font-medium">Banco</label>
                                    <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleChange} className={inputFormStyle} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Número de cuenta</label>
                                    <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleChange} className={inputFormStyle} />
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 border-t dark:border-neutral-700">
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Información social (sensible)</h4>
                            <div className="mt-2">
                                <label className="block text-sm font-medium">Número de seguro social</label>
                                <input type="text" name="socialSecurityNumber" value={formData.socialSecurityNumber || ''} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel') || 'Cancelar'}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : (t('common.save') || 'Guardar')}
                    </button>
                </div>
            </form>
        </Modal>

        <QuickCreateModal
            isOpen={showPositionModal}
            title="Nuevo puesto"
            placeholder="Ej: Cajero, Vendedor, Supervisor..."
            onClose={() => setShowPositionModal(false)}
            onCreate={async (name) => {
                const created = await employeePositionsService.create(name);
                setPositions(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                setFormData(prev => ({ ...prev, role: created.name }));
            }}
        />
        <QuickCreateModal
            isOpen={showDeptModal}
            title="Nuevo departamento"
            placeholder="Ej: Ventas, Almacén, Administración..."
            onClose={() => setShowDeptModal(false)}
            onCreate={async (name) => {
                const created = await employeeDepartmentsService.create(name);
                setEmpDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                setFormData(prev => ({ ...prev, department: created.name }));
            }}
        />
        <ConfirmationModal
            isOpen={askResend}
            title="Correo actualizado"
            message={`Cambiaste el correo a ${formData.email}. ¿Deseas enviar nuevamente el mensaje de activación a este correo?`}
            confirmButtonText="Sí, reenviar"
            cancelButtonText="No, gracias"
            onConfirm={async () => { await handleResendInvitation(); }}
            onClose={() => { setAskResend(false); onClose(); }}
        />
        {showRoleModal && (
            <RoleFormModal
                isOpen={showRoleModal}
                roleToEdit={null}
                onClose={(saved) => {
                    setShowRoleModal(false);
                    if (saved) {
                        setRoles(prev => prev.some(r => r.id === saved.id) ? prev.map(r => r.id === saved.id ? saved : r) : [...prev, saved]);
                        setPermissionRoleId(saved.id);
                    }
                }}
            />
        )}
        </>
    );
};
