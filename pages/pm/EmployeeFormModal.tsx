
import React, { useState, useEffect } from 'react';
import { Employee, EmployeeFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { EMPLOYEE_ROLES, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({isOpen, onClose, employee}) => {
    const { setEmployees } = useData();
    const [formData, setFormData] = useState<EmployeeFormData>({ name: '', lastName: '', email: '', role: EMPLOYEE_ROLES[0]});

    useEffect(() => {
        if (employee) setFormData(employee);
        else setFormData({ name: '', lastName: '', email: '', role: EMPLOYEE_ROLES[0]});
    }, [employee, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));

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
        <Modal isOpen={isOpen} onClose={onClose} title={employee ? "Editar Empleado" : "Crear Empleado"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" className={inputFormStyle + " w-full"} required/>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Apellido" className={inputFormStyle + " w-full"} required/>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className={inputFormStyle + " w-full"} required/>
                <select name="role" value={formData.role} onChange={handleChange} className={inputFormStyle + " w-full"}>
                    {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex justify-end space-x-2 pt-2"><button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button><button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Guardar</button></div>
            </form>
        </Modal>
    );
};
