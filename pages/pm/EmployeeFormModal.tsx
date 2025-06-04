import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { EMPLOYEE_ROLES, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { PhotoIcon } from '../../components/icons';

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({isOpen, onClose, employee}) => {
    const { setEmployees } = useData();
    
    const initialFormState: EmployeeFormData = { 
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
        profilePictureUrl: ''
    };

    const [formData, setFormData] = useState<EmployeeFormData>(initialFormState);

    useEffect(() => {
        if (employee && isOpen) {
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
                profilePictureUrl: employee.profilePictureUrl || ''
            });
        } else if (!employee && isOpen) {
            setFormData(initialFormState);
        }
    }, [employee, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev, 
            [name]: type === 'number' ? (parseFloat(value) || 0) : value
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (employee) {
            setEmployees(prev => prev.map(emp => emp.id === employee.id ? {...employee, ...formData} : emp));
        } else {
            setEmployees(prev => [...prev, {id: `emp-${Date.now()}`, ...formData}]);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? "Editar Empleado" : "Crear Empleado"} size="2xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Personal</legend>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputFormStyle} required/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Teléfono Domiciliario</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="## #### ####" className={inputFormStyle}/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-xs font-medium">Dirección Primaria (Postal)</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} rows={2} placeholder="Dirección completa" className={inputFormStyle}/>
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
                            value={formData.profilePictureUrl} 
                            onChange={handleChange} 
                            className={`${inputFormStyle} mb-1`} 
                        />
                        {/* Basic file input, for more advanced features like preview consider a dedicated component */}
                        {/* <input type="file" onChange={handleFileChange} accept="image/*" className="text-xs"/> */}
                        {formData.profilePictureUrl && <img src={formData.profilePictureUrl} alt="Vista previa" className="mt-1 w-16 h-16 object-cover rounded-full shadow"/>}
                    </div>
                </fieldset>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información de Contacto de Emergencia</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Nombre del Contacto</label>
                            <input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Relación o Parentesco</label>
                            <input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} placeholder="Cónyuge, padre, amigo, etc." onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium">Número Telefónico de Emergencia</label>
                        <input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} placeholder="## #### ####" onChange={handleChange} className={inputFormStyle}/>
                    </div>
                </fieldset>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Detalles del Empleo</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Puesto (Rol)</label>
                            <select name="role" value={formData.role} onChange={handleChange} className={inputFormStyle}>
                                {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Departamento</label>
                            <input type="text" name="department" value={formData.department} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Fecha de Contratación</label>
                            <input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Salario (Anual)</label>
                            <input type="number" name="salary" value={formData.salary} step="0.01" onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Bancaria (Opcional)</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-medium">Nombre del Banco</label>
                            <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium">Número de Cuenta Bancaria</label>
                            <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} className={inputFormStyle}/>
                        </div>
                    </div>
                </fieldset>
                
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Información Adicional (Sensible/Opcional)</legend>
                    <div>
                        <label className="block text-xs font-medium">Número de Seguro Social</label>
                        <input type="text" name="socialSecurityNumber" value={formData.socialSecurityNumber} placeholder="XXX-XX-XXXX" onChange={handleChange} className={inputFormStyle}/>
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