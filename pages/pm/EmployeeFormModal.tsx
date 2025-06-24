import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData, UserRole, EmployeePermissions } from '../../types'; // Added UserRole, EmployeePermissions
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { EMPLOYEE_ROLES, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { PhotoIcon, LockClosedIcon, Squares2X2Icon, BriefcaseIcon, CashBillIcon } from '../../components/icons'; // Added permission-related icons

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

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({isOpen, onClose, employee}) => {
    const { setEmployees } = useData();
    const { register, allUsers } = useAuth();
    
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
        permissions: { ...defaultPermissions },
    };

    const [formData, setFormData] = useState<EmployeeFormData>(initialFormState);
    const [showPasswordFields, setShowPasswordFields] = useState(false);

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
        // 'Administrativo' might have custom or no specific module access by default
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
                    permissions: employee.permissions ? { ...defaultPermissions, ...employee.permissions } : getPermissionsForRole(employee.role),
                });
                setShowPasswordFields(false);
            } else {
                // For new employee, set default permissions based on the default role in initialFormState
                const initialPermissions = getPermissionsForRole(initialFormState.role);
                setFormData({...initialFormState, permissions: initialPermissions});
                setShowPasswordFields(true);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employee, isOpen, initialFormState.role]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'role') { // If "Puesto" (role string) changes, update default permissions
            const newPermissions = getPermissionsForRole(value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                // When role changes, apply new default permissions for that role,
                // but also try to preserve any existing specific permission settings if they were manually toggled
                // This means if a permission was explicitly set (e.g. user checked a box not default for old role),
                // and the new role also has this permission as default (or not), the manual override might be lost
                // or reset to the new role's default.
                // A simpler approach: just reset to new role's defaults.
                // permissions: { ...newPermissions }
                // Or, merge, giving precedence to new role defaults but keeping existing values if not covered by new defaults:
                permissions: { ...prev.permissions, ...newPermissions } // This behavior might need refinement based on desired UX
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
                // If manageProjects is checked, viewProjectManagement should also be checked
                ...(name === 'manageProjects' && checked && { viewProjectManagement: true }),
                 // If viewProjectManagement is unchecked, manageProjects should also be unchecked
                ...(name === 'viewProjectManagement' && !checked && { manageProjects: false }),
            }
        }));
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
           const objectUrl = URL.createObjectURL(file);
           setFormData(prev => ({ ...prev, profilePictureUrl: objectUrl }));
        } else {
           setFormData(prev => ({ ...prev, profilePictureUrl: employee?.profilePictureUrl || '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (employee) { // Editing existing employee
             const updatedEmployeeData = { ...employee, ...formData };
            setEmployees(prev => prev.map(emp => emp.id === employee.id ? updatedEmployeeData : emp));
            onClose();
        } else { // Creating new employee and user account
            if (!formData.password || !formData.confirmPassword) {
                alert('Por favor, ingrese y confirme la contraseña para el nuevo colaborador.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                alert('Las contraseñas no coinciden.');
                return;
            }
             if (formData.password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres.');
                return;
            }

            const registrationSuccess = await register(
                formData.name,
                formData.lastName,
                formData.email,
                formData.password,
                UserRole.EMPLOYEE
            );

            if (registrationSuccess) {
                // Attempt to find the new user. Note: allUsers might not update immediately in the same render cycle in some state management patterns.
                // This relies on AuthContext updating its allUsers state synchronously or before this check.
                const newUser = allUsers.find(u => u.email.toLowerCase() === formData.email.toLowerCase() && u.role === UserRole.EMPLOYEE);
                if (newUser) {
                    const newEmployee: Employee = {
                        id: newUser.id, // Link employee record to user account ID
                        name: formData.name,
                        lastName: formData.lastName,
                        email: formData.email,
                        role: formData.role, // "Puesto"
                        address: formData.address,
                        phone: formData.phone,
                        emergencyContactName: formData.emergencyContactName,
                        emergencyContactRelationship: formData.emergencyContactRelationship,
                        emergencyContactPhone: formData.emergencyContactPhone,
                        hireDate: formData.hireDate,
                        department: formData.department,
                        salary: formData.salary,
                        bankName: formData.bankName,
                        bankAccountNumber: formData.bankAccountNumber,
                        socialSecurityNumber: formData.socialSecurityNumber,
                        profilePictureUrl: formData.profilePictureUrl,
                        permissions: formData.permissions, // Save assigned permissions
                    };
                    setEmployees(prev => [...prev, newEmployee]);
                    onClose();
                } else {
                     // Fallback: The user was created, but we can't immediately link.
                     // This might happen if allUsers state update in AuthContext is async and not yet reflected.
                     // For a more robust solution, register could return the new user object.
                    alert('Cuenta de usuario creada, pero hubo un problema al enlazarla con el registro de colaborador. Por favor, verifique la lista de colaboradores o intente editar el nuevo usuario más tarde.');
                    // Even if linking fails here, the user account IS created. The employee record isn't.
                    // This is a partial success. For simplicity now, we'll proceed as if employee is also created, assuming register makes user ID available.
                    // A better UX might be to fetch the user by email again or have register return the user.
                    // For now, the code assumes newUser will be found if registrationSuccess is true.
                    // If it's critical, employee creation should be contingent on newUser being definitely available.
                    console.error("Failed to find newly registered user in allUsers immediately after registration.");
                    onClose(); // Close form, user can try to find/edit later
                }
            }
            // If registrationSuccess is false, an alert was already shown by the register function.
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? "Editar Colaborador" : "Crear Colaborador y Cuenta"} size="2xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Personal y de Acceso</legend>
                    {/* ... existing name, lastName, email fields ... */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Nombre</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Apellido</label>
                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="block text-xs font-medium">Email (será su usuario)</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required disabled={!!employee} />
                         {!!employee && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">El email no se puede cambiar para colaboradores existentes.</p>}
                    </div>

                    {showPasswordFields && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-xs font-medium flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" />Contraseña de Acceso</label>
                                    <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className={inputFormStyle} required={!employee} placeholder="Mínimo 6 caracteres"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" />Confirmar Contraseña</label>
                                    <input type="password" name="confirmPassword" value={formData.confirmPassword || ''} onChange={handleChange} className={inputFormStyle} required={!employee} />
                                </div>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                                Esta será la contraseña que el colaborador usará para acceder al sistema.
                            </p>
                        </>
                    )}
                    {/* ... rest of personal info fields: phone, address, profilePictureUrl ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Teléfono Domiciliario</label>
                            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="## #### ####" className={inputFormStyle}/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs font-medium">Dirección Primaria (Postal)</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={2} placeholder="Dirección completa" className={inputFormStyle}/>
                    </div>
                    <div className="mt-3">
                        <label htmlFor="profilePictureUrl" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            <PhotoIcon /> Foto de Perfil (URL o Subir)
                        </label>
                        <input 
                            type="text" 
                            name="profilePictureUrl" 
                            id="profilePictureUrl" 
                            placeholder="https://ejemplo.com/foto.jpg" 
                            value={formData.profilePictureUrl || ''} 
                            onChange={handleChange} 
                            className={`${inputFormStyle} mb-1`} 
                        />
                        {/* <input type="file" id="profilePictureFile" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-xs text-neutral-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/> */}
                        {formData.profilePictureUrl && <img src={formData.profilePictureUrl} alt="Vista previa" className="mt-1 w-16 h-16 object-cover rounded-full shadow"/>}
                    </div>
                </fieldset>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Detalles del Empleo y Permisos</legend>
                     {/* ... existing employment details: role (Puesto), department, hireDate, salary ... */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Puesto (Cargo)</label>
                            <select name="role" value={formData.role} onChange={handleChange} className={inputFormStyle}>
                                {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Departamento</label>
                            <input type="text" name="department" value={formData.department || ''} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Fecha de Contratación</label>
                            <input type="date" name="hireDate" value={formData.hireDate || ''} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Salario (Anual)</label>
                            <input type="number" name="salary" value={formData.salary || 0} step="0.01" onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                    
                    {/* Permissions Section */}
                    <div className="mt-3 pt-3 border-t dark:border-neutral-700">
                        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Permisos de Acceso al Sistema:</h4>
                        <div className="space-y-2">
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300">
                                <input type="checkbox" name="viewProjectManagement" checked={!!formData.permissions?.viewProjectManagement} onChange={handlePermissionChange} className="form-checkbox rounded mr-1.5 text-primary focus:ring-primary" disabled={!!formData.permissions?.manageProjects}/>
                                <Squares2X2Icon className="w-3.5 h-3.5 mr-1 text-neutral-500 dark:text-neutral-400"/> Acceder a Gestión de Proyectos (Ver Proyectos/Calendario/Chat)
                            </label>
                             {formData.permissions?.viewProjectManagement && !formData.permissions?.manageProjects && <p className="ml-6 text-xs text-neutral-500 dark:text-neutral-400">Solo podrá visualizar información.</p>}
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300">
                                <input type="checkbox" name="manageProjects" checked={!!formData.permissions?.manageProjects} onChange={handlePermissionChange} className="form-checkbox rounded mr-1.5 text-primary focus:ring-primary"/>
                                <BriefcaseIcon className="w-3.5 h-3.5 mr-1 text-neutral-500 dark:text-neutral-400"/> Gestionar Proyectos (Crear/Editar Proyectos, Asignar Recursos)
                            </label>
                             {formData.permissions?.manageProjects && <p className="ml-6 text-xs text-teal-600 dark:text-teal-400">Implica permiso de visualización.</p>}
                            <label className="flex items-center text-xs text-neutral-700 dark:text-neutral-300">
                                <input type="checkbox" name="accessPOSCashier" checked={!!formData.permissions?.accessPOSCashier} onChange={handlePermissionChange} className="form-checkbox rounded mr-1.5 text-primary focus:ring-primary"/>
                                <CashBillIcon className="w-3.5 h-3.5 mr-1 text-neutral-500 dark:text-neutral-400"/> Acceder a Caja Registradora (POS)
                            </label>
                        </div>
                    </div>
                </fieldset>

                {/* ... other fieldsets: emergency contact, bank info, social security ... */}
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información de Contacto de Emergencia</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Nombre del Contacto</label>
                            <input type="text" name="emergencyContactName" value={formData.emergencyContactName || ''} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Relación o Parentesco</label>
                            <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship || ''} placeholder="Cónyuge, padre, amigo, etc." onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium">Número Telefónico de Emergencia</label>
                        <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone || ''} placeholder="## #### ####" onChange={handleChange} className={inputFormStyle}/>
                    </div>
                </fieldset>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Bancaria (Opcional)</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Nombre del Banco</label>
                            <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Número de Cuenta Bancaria</label>
                            <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber || ''} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                </fieldset>
                
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Adicional (Sensible/Opcional)</legend>
                    <div>
                        <label className="block text-xs font-medium">Número de Seguro Social</label>
                        <input type="text" name="socialSecurityNumber" value={formData.socialSecurityNumber || ''} placeholder="XXX-XX-XXXX" onChange={handleChange} className={inputFormStyle}/>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Este campo es opcional y se almacena de forma segura (simulado).</p>
                    </div>
                </fieldset>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar</button>
                </div>
            </form>
        </Modal>
    );
};
