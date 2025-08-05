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

    const [activeTab, setActiveTab] = useState('Personal');
    const tabs = ['Personal', 'Acceso y Empleo', 'Permisos', 'Información Adicional'];
    
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
                const initialPermissions = getPermissionsForRole(initialFormState.role);
                setFormData({...initialFormState, permissions: initialPermissions});
                setShowPasswordFields(true);
            }
            setActiveTab('Personal');
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
        if (employee) {
             const updatedEmployeeData = { ...employee, ...formData };
            setEmployees(prev => prev.map(emp => emp.id === employee.id ? updatedEmployeeData : emp));
            onClose();
        } else {
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
                const newUser = allUsers.find(u => u.email.toLowerCase() === formData.email.toLowerCase() && u.role === UserRole.EMPLOYEE);
                if (newUser) {
                    const newEmployee: Employee = {
                        id: newUser.id,
                        name: formData.name,
                        lastName: formData.lastName,
                        email: formData.email,
                        role: formData.role,
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
                        permissions: formData.permissions,
                    };
                    setEmployees(prev => [...prev, newEmployee]);
                    onClose();
                } else {
                    alert('Cuenta de usuario creada, pero hubo un problema al enlazarla con el registro de colaborador. Por favor, verifique la lista de colaboradores o intente editar el nuevo usuario más tarde.');
                    console.error("Failed to find newly registered user in allUsers immediately after registration.");
                    onClose();
                }
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? "Editar Colaborador" : "Crear Colaborador y Cuenta"} size="2xl">
            <form onSubmit={handleSubmit}>
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 -mx-4 px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                    {/* Personal Tab */}
                    <div className={activeTab === 'Personal' ? 'space-y-4' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Nombre</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputFormStyle} required/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Apellido</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputFormStyle} required/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Teléfono</label>
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="## #### ####" className={inputFormStyle}/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Dirección</label>
                            <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={2} placeholder="Dirección completa" className={inputFormStyle}/>
                        </div>
                        <div>
                            <label htmlFor="profilePictureUrl" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center"><PhotoIcon /> Foto de Perfil (URL)</label>
                            <input type="text" name="profilePictureUrl" id="profilePictureUrl" placeholder="https://ejemplo.com/foto.jpg" value={formData.profilePictureUrl || ''} onChange={handleChange} className={inputFormStyle}/>
                            {formData.profilePictureUrl && <img src={formData.profilePictureUrl} alt="Vista previa" className="mt-2 w-20 h-20 object-cover rounded-full shadow"/>}
                        </div>
                    </div>

                    {/* Acceso y Empleo Tab */}
                    <div className={activeTab === 'Acceso y Empleo' ? 'space-y-4' : 'hidden'}>
                        <div>
                            <label className="block text-sm font-medium">Email (será su usuario)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required disabled={!!employee} />
                            {!!employee && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">El email no se puede cambiar para colaboradores existentes.</p>}
                        </div>
                        {showPasswordFields && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" />Contraseña de Acceso</label>
                                    <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className={inputFormStyle} required={!employee} placeholder="Mínimo 6 caracteres"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium flex items-center"><LockClosedIcon className="w-3 h-3 mr-1" />Confirmar Contraseña</label>
                                    <input type="password" name="confirmPassword" value={formData.confirmPassword || ''} onChange={handleChange} className={inputFormStyle} required={!employee} />
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Puesto (Cargo)</label>
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
                                <input type="number" name="salary" value={formData.salary || 0} step="0.01" onChange={handleChange} className={inputFormStyle}/>
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
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar</button>
                </div>
            </form>
        </Modal>
    );
};