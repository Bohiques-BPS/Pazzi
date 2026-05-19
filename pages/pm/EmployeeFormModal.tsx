
import React, { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeeFormData, UserRole, EmployeePermissions } from '../../types'; // Added UserRole, EmployeePermissions
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { EMPLOYEE_ROLES, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { PhotoIcon, LockClosedIcon, BriefcaseIcon, CashBillIcon, KeyIcon, CameraIcon, TrashIconMini, ExclamationTriangleIcon } from '../../components/icons'; // Added permission-related icons
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
}

const defaultPermissions: EmployeePermissions = {
    viewProjectManagement: false,
    manageProjects: false,
    accessPOSCashier: false,
};

const fieldToTabMap: Record<string, string> = {
    name: 'Personal',
    lastName: 'Personal',
    phone: 'Personal',
    email: 'Acceso y Empleo',
    password: 'Acceso y Empleo',
    confirmPassword: 'Acceso y Empleo',
    pin: 'Acceso y Empleo',
    confirmPin: 'Acceso y Empleo',
    role: 'Acceso y Empleo',
    salary: 'Acceso y Empleo',
};

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({isOpen, onClose, employee}) => {
    const { t } = useTranslation();
    const { setEmployees } = useData();
    const { register } = useAuth();

    const [activeTab, setActiveTab] = useState('Personal');
    
    const tabs = [
        { id: 'Personal', label: t('employee.tab.personal') },
        { id: 'Acceso y Empleo', label: t('employee.tab.access') },
        { id: 'Permisos', label: t('employee.tab.permissions') },
        { id: 'Información Adicional', label: t('employee.tab.info') }
    ];
    
    const initialFormState: EmployeeFormData = {
        name: '',
        lastName: '',
        email: '',
        role: EMPLOYEE_ROLES[0], // Default "Puesto"
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
        password: '',
        confirmPassword: '',
        pin: '',
        confirmPin: '',
        permissions: { ...defaultPermissions },
    };

    const [formData, setFormData] = useState<EmployeeFormData>(initialFormState);
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const getPermissionsForRole = (role: string): EmployeePermissions => {
        const permissions = { ...defaultPermissions };
        if (role === 'Gerente de Proyectos') {
            permissions.viewProjectManagement = true;
            permissions.manageProjects = true;
        } else if (role === 'Diseñador' || role === 'Contratista General' || role === 'Especialista en Acabados') {
            permissions.viewProjectManagement = true;
        } else if (role === 'Vendedor POS') {
            permissions.accessPOSCashier = true;
        }
        return permissions;
    };

    useEffect(() => {
        if (isOpen) {
            if (employee) {
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
                    password: '',
                    confirmPassword: '',
                    pin: (employee as any).pin || '',
                    confirmPin: (employee as any).pin || '',
                    permissions: employee.permissions ? { ...defaultPermissions, ...employee.permissions } : getPermissionsForRole(employee.role),
                });
                setShowPasswordFields(false);
            } else {
                const initialPermissions = getPermissionsForRole(initialFormState.role);
                setFormData({...initialFormState, permissions: initialPermissions});
                setShowPasswordFields(true);
            }
            setActiveTab('Personal');
            setImageFile(null);
            setFieldErrors({});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employee, isOpen, initialFormState.role]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'role') {
            const newPermissions = getPermissionsForRole(value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                permissions: { ...prev.permissions, ...newPermissions }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number' ? (parseFloat(value) || 0) : value
            }));
        }
    };

    const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [name]: checked,
                ...(name === 'manageProjects' && checked && { viewProjectManagement: true }),
                ...(name === 'viewProjectManagement' && !checked && { manageProjects: false }),
            }
        }));
    };


    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePictureUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = "El nombre es requerido";
        if (!formData.lastName.trim()) errors.lastName = "El apellido es requerido";
        if (!formData.email.trim()) errors.email = "El email es requerido";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "El formato del email es inválido";
        
        if (!employee) {
            if (!formData.password) errors.password = "La contraseña es requerida";
            else if (formData.password.length < 6) errors.password = "Mínimo 6 caracteres";
            if (formData.password !== formData.confirmPassword) errors.confirmPassword = "No coincide";
        }

        if (formData.permissions?.accessPOSCashier) {
            if (formData.pin || formData.confirmPin) {
                if (!/^\d{4}$/.test(formData.pin)) errors.pin = "Deben ser 4 números";
                if (formData.pin !== formData.confirmPin) errors.confirmPin = "PIN no coincide";
            }
        }

        if (formData.salary < 0) errors.salary = "No puede ser negativo";

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        const localErrors = validateForm();
        
        // Eliminamos campos que son solo para validación visual/formulario
        const { confirmPassword, confirmPin, ...payload } = formData;

        if (Object.keys(localErrors).length > 0) {
            setFieldErrors(localErrors);
            const firstErrorField = Object.keys(localErrors)[0];
            const targetTab = fieldToTabMap[firstErrorField];
            if (targetTab) setActiveTab(targetTab);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('pazzi_token');
            
            let finalImageUrl = formData.profilePictureUrl;

            // Si se seleccionó un archivo nuevo, lo subimos al servidor primero
            if (imageFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile); 

                const uploadResponse = await fetch(`${API_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadFormData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    finalImageUrl = uploadResult.url; 
                } else {
                    throw new Error("Error al subir la imagen al servidor");
                }
            }

            const url = employee 
                ? `${API_URL}/employees/${employee.id}`
                : `${API_URL}/employees`;
            
            const method = employee ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...payload, profilePictureUrl: finalImageUrl })
            });

            const result = await response.json();

            if (response.ok) {
                if (employee) {
                    setEmployees(prev => prev.map(emp => emp.id === employee.id ? result : emp));
                } else {
                    setEmployees(prev => [...prev, result]);
                }
                toast.success(employee ? 'Empleado actualizado' : 'Empleado creado');
                onClose();
            } else {
                toast.error(result.error || "Error al guardar el colaborador.");
            }
        } catch (error) {
            toast.error("Error de conexión con el servidor.");
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? t('employee.form.edit') : t('employee.form.create')} size="2xl">
            <form onSubmit={handleSubmit}>
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4">
                    {tabs.map(tab => {
                        const hasError = tabsWithErrors.has(tab.id);
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
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
                                <label className="block text-sm font-medium">{t('employee.field.name')}</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">{t('employee.field.lastname')}</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">{t('employee.field.phone')}</label>
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="## #### ####" className={inputFormStyle}/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">{t('employee.field.address')}</label>
                            <RichTextEditor value={formData.address || ''} onChange={(value) => setFormData(prev => ({...prev, address: value}))} placeholder="Dirección completa" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">{t('employee.field.photo') || 'Foto de Perfil'}</label>
                            <div className="mt-1 flex items-center space-x-4">
                                {formData.profilePictureUrl ? (
                                    <div className="relative w-24 h-24 border rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-inner">
                                        <img src={formData.profilePictureUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, profilePictureUrl: '' }));
                                                setImageFile(null);
                                            }}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                            title="Eliminar foto"
                                        >
                                            <TrashIconMini className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800">
                                        <CameraIcon className="w-8 h-8 text-neutral-400" />
                                    </div>
                                )}
                                <div className="flex flex-col space-y-2">
                                    <label className={BUTTON_SECONDARY_SM_CLASSES + " cursor-pointer"}>
                                        {t('common.choose_file') || 'Elegir Archivo'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                    <p className="text-xs text-neutral-500">Formato: PNG o JPG. Máx 5MB.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Acceso y Empleo Tab */}
                    <div className={activeTab === 'Acceso y Empleo' ? 'space-y-4' : 'hidden'}>
                        <div>
                            <label className="block text-sm font-medium">{t('employee.field.email')} (Usuario)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`} disabled={!!employee} />
                            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                            {!!employee && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">El email no se puede cambiar para colaboradores existentes.</p>}
                        </div>
                        {showPasswordFields && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" />Contraseña</label>
                                    <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`} placeholder="Mínimo 6 caracteres"/>
                                    {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" />Confirmar</label>
                                    <input type="password" name="confirmPassword" value={formData.confirmPassword || ''} onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                    {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
                                </div>
                            </div>
                        )}
                        {formData.permissions?.accessPOSCashier && (
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
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">{t('employee.field.role')}</label>
                                <select name="role" value={formData.role} onChange={handleChange} className={inputFormStyle}>
                                    {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Departamento</label>
                                <input type="text" name="department" value={formData.department || ''} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Fecha de Contratación</label>
                                <input type="date" name="hireDate" value={formData.hireDate || ''} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Salario (Anual)</label>
                                <input type="number" name="salary" value={formData.salary || 0} step="0.01" onChange={handleChange} className={`${inputFormStyle} ${fieldErrors.salary ? 'border-red-500 focus:ring-red-500' : ''}`}/>
                                {fieldErrors.salary && <p className="mt-1 text-xs text-red-500">{fieldErrors.salary}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Permisos Tab */}
                    <div className={activeTab === 'Permisos' ? 'space-y-3 pt-2' : 'hidden'}>
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Permisos de Acceso al Sistema:</h4>
                        <label className="flex items-center text-sm text-neutral-700 dark:text-neutral-300">
                            <input type="checkbox" name="viewProjectManagement" checked={!!formData.permissions?.viewProjectManagement} onChange={handlePermissionChange} className="form-checkbox rounded mr-2 text-primary focus:ring-primary" disabled={!!formData.permissions?.manageProjects}/>
                            <BriefcaseIcon className="w-4 h-4 mr-1.5 text-neutral-500 dark:text-neutral-400"/> Acceder a Gestión de Proyectos
                        </label>
                        <label className="flex items-center text-sm text-neutral-700 dark:text-neutral-300 ml-6">
                            <input type="checkbox" name="manageProjects" checked={!!formData.permissions?.manageProjects} onChange={handlePermissionChange} className="form-checkbox rounded mr-2 text-primary focus:ring-primary"/>
                            Gestionar Proyectos (Crear/Editar)
                        </label>
                        <label className="flex items-center text-sm text-neutral-700 dark:text-neutral-300">
                            <input type="checkbox" name="accessPOSCashier" checked={!!formData.permissions?.accessPOSCashier} onChange={handlePermissionChange} className="form-checkbox rounded mr-2 text-primary focus:ring-primary"/>
                            <CashBillIcon className="w-4 h-4 mr-1.5 text-neutral-500 dark:text-neutral-400"/> Acceder a Caja Registradora (POS)
                        </label>
                    </div>

                    {/* Información Adicional Tab */}
                    <div className={activeTab === 'Información Adicional' ? 'space-y-4' : 'hidden'}>
                         <div>
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Contacto de Emergencia</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-sm font-medium">Nombre del Contacto</label>
                                    <input type="text" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} className={inputFormStyle}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Relación</label>
                                    <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship || ''} onChange={handleChange} className={inputFormStyle}/>
                                </div>
                            </div>
                             <div className="mt-2">
                                <label className="block text-sm font-medium">Teléfono de Emergencia</label>
                                <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                        </div>
                        <div className="pt-4 border-t dark:border-neutral-700">
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Información Bancaria (Sensible)</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-sm font-medium">Banco</label>
                                    <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleChange} className={inputFormStyle}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Número de Cuenta</label>
                                    <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleChange} className={inputFormStyle}/>
                                </div>
                            </div>
                        </div>
                         <div className="pt-4 border-t dark:border-neutral-700">
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Información Social (Sensible)</h4>
                             <div className="mt-2">
                                <label className="block text-sm font-medium">Número de Seguro Social</label>
                                <input type="text" name="socialSecurityNumber" value={formData.socialSecurityNumber || ''} onChange={handleChange} className={inputFormStyle}/>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
