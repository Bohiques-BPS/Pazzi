import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Employee, EmployeeFormData, UserStatus, PermissionCategory, EmployeePermissions } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { EMPLOYEE_ROLES, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { LockClosedIcon, KeyIcon, CameraIcon, TrashIconMini, ExclamationTriangleIcon } from '../../components/icons';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { employeesService, type EmployeeRecord } from '../../services/employees';
import { permissionsService } from '../../services/permissions';
import { authService } from '../../services/auth';
import { API_URL, ApiError } from '../../services/api';

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
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

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, employee }) => {
    const { t } = useTranslation();
    const { setEmployees } = useData();

    const [activeTab, setActiveTab] = useState('Personal');
    const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [linkedUser, setLinkedUser] = useState<EmployeeRecord['user']>(null);
    const [resending, setResending] = useState(false);

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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Cargar catálogo de permisos cuando se abre el modal
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setCatalogLoading(true);
        permissionsService.getCatalog()
            .then(res => { if (!cancelled) setCatalog(res.categories); })
            .catch(() => { if (!cancelled) toast.error('No se pudo cargar el catálogo de permisos'); })
            .finally(() => { if (!cancelled) setCatalogLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen]);

    // Inicializar el form al abrir
    useEffect(() => {
        if (!isOpen) return;
        if (employee) {
            const empAny = employee as unknown as EmployeeRecord;
            const linked = empAny.user ?? null;
            setLinkedUser(linked);
            setFormData({
                name: employee.name,
                lastName: employee.lastName,
                email: employee.email,
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
        } else {
            setLinkedUser(null);
            setFormData(initialFormState);
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

        if ((formData.salary || 0) < 0) errors.salary = 'No puede ser negativo';

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
            const payload = {
                ...rest,
                profilePictureUrl: finalImageUrl,
                salary: salary && salary > 0 ? salary : null,
                // Solo enviar enableLogin si estamos creando o si se está habilitando por primera vez
                ...(employee ? {} : { enableLogin: !!enableLogin }),
                // Si hay user vinculado o estamos creando con login → mandar permissions
                ...(enableLogin || linkedUser ? { permissions } : {}),
            };

            const saved = employee
                ? await employeesService.update(employee.id, payload)
                : await employeesService.create(payload);

            setEmployees(prev => employee
                ? prev.map(emp => emp.id === employee.id ? (saved as unknown as Employee) : emp)
                : [...prev, saved as unknown as Employee]);

            if (!employee && enableLogin) {
                toast.success('Colaborador creado. Se envió una invitación por correo para activar su cuenta.');
            } else {
                toast.success(employee ? 'Colaborador actualizado' : 'Colaborador creado');
            }
            onClose();
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
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? (t('employee.form.edit') || 'Editar colaborador') : (t('employee.form.create') || 'Nuevo colaborador')} size="2xl">
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
                                    <div className="w-24 h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800">
                                        <CameraIcon className="w-8 h-8 text-neutral-400" />
                                    </div>
                                )}
                                <label className={BUTTON_SECONDARY_SM_CLASSES + ' cursor-pointer'}>
                                    Elegir Archivo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Acceso y Empleo Tab */}
                    <div className={activeTab === 'Acceso y Empleo' ? 'space-y-4' : 'hidden'}>
                        <div>
                            <label className="block text-sm font-medium">Email (usuario)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`} disabled={!!employee} />
                            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                            {!!employee && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">El email no se puede cambiar para colaboradores existentes.</p>}
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
                                <input
                                    type="text"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    list="employee-roles-list"
                                    placeholder="Ej: Vendedor, Cajero…"
                                    className={inputFormStyle}
                                />
                                <datalist id="employee-roles-list">
                                    {EMPLOYEE_ROLES.map(r => <option key={r} value={r} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Departamento</label>
                                <input type="text" name="department" value={formData.department || ''} onChange={handleChange} className={inputFormStyle} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Fecha de contratación</label>
                                <input type="date" name="hireDate" value={formData.hireDate || ''} onChange={handleChange} className={inputFormStyle} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Salario (anual)</label>
                                <input type="number" name="salary" value={formData.salary || 0} step="0.01" onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.salary ? 'border-red-500 focus:ring-red-500' : ''}`} />
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
                                        Se enviará un correo a {formData.email || 'el colaborador'} con un enlace para que cree su contraseña.
                                        Si lo dejas desactivado, el colaborador solo será un registro de RRHH sin login.
                                    </p>
                                </div>
                            </label>
                        )}

                        {(formData.enableLogin || linkedUser) && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Permisos granulares</h4>
                                    <span className="text-xs text-neutral-500">{permsCount} permisos asignados</span>
                                </div>
                                {catalogLoading && (
                                    <div className="text-sm text-neutral-500">Cargando catálogo de permisos...</div>
                                )}
                                {!catalogLoading && catalog.length === 0 && (
                                    <div className="text-sm text-neutral-500">No se pudo cargar el catálogo de permisos.</div>
                                )}
                                {catalog.map(category => {
                                    const perms = formData.permissions as EmployeePermissions || {};
                                    const allOn = category.permissions.every(p => perms[p.key] === true);
                                    const someOn = category.permissions.some(p => perms[p.key] === true);
                                    return (
                                        <fieldset key={category.key} className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                                                {category.label}
                                                <button
                                                    type="button"
                                                    className="text-[10px] underline text-primary hover:text-secondary"
                                                    onClick={() => toggleCategoryAll(category, !allOn)}
                                                >
                                                    {allOn ? 'Quitar todos' : someOn ? 'Marcar todos' : 'Marcar todos'}
                                                </button>
                                            </legend>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                                                {category.permissions.map(p => (
                                                    <label key={p.key} className="flex items-center text-sm text-neutral-700 dark:text-neutral-300 gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={perms[p.key] === true}
                                                            onChange={(e) => handlePermissionToggle(p.key, e.target.checked)}
                                                            className="rounded text-primary focus:ring-primary"
                                                        />
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
    );
};
