
import React, { useState } from 'react';
import { Employee, EmployeeFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { EmployeeFormModal } from './EmployeeFormModal'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { PlusIcon, EditIcon, DeleteIcon, SparklesIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, EMPLOYEE_ROLES } from '../../constants'; // Adjusted path
import { AIImportModal } from '../../components/AIImportModal'; // Adjusted path

export const EmployeesListPage: React.FC = () => {
    const { employees, setEmployees } = useData();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
    
    const [showAIImportModal, setShowAIImportModal] = useState(false);

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

    const confirmDelete = () => {
        if(itemToDeleteId){
            setEmployees(prev => prev.filter(e => e.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const handleAiEmployeeImportSuccess = (dataArray: any[]) => {
        console.log("AI Data Array for Employee Import:", dataArray);
         if (!Array.isArray(dataArray)) {
            alert("La IA no devolvió un array de datos de colaboradores.");
            return;
        }
        
        let importedCount = 0;
        let failedCount = 0;
        const newEmployees: Employee[] = [];

        dataArray.forEach((item, index) => {
            const name = item.nombre || item.name || '';
            const lastName = item.apellido || item.lastName || '';
            const email = item.email || '';
            const role = item.rol || item.role || '';

            if (!name || !lastName || !email || !role) {
                 console.warn(`Ítem ${index} omitido por falta de campos obligatorios (nombre, apellido, email, rol):`, item);
                failedCount++;
                return;
            }
            // Optional: Validate if role is in EMPLOYEE_ROLES
            if (!EMPLOYEE_ROLES.includes(role)) {
                 console.warn(`Ítem ${index} omitido por rol inválido: ${role}`, item);
                failedCount++;
                return;
            }

            const newEmployee: Employee = {
                id: `emp-ai-${Date.now()}-${index}`,
                name,
                lastName,
                email,
                role,
            };
            newEmployees.push(newEmployee);
            importedCount++;
        });
        
        if (newEmployees.length > 0) {
            setEmployees(prev => [...prev, ...newEmployees]);
        }

        let message = `${importedCount} colaboradores importados correctamente.`;
        if (failedCount > 0) {
            message += ` ${failedCount} colaboradores no pudieron ser importados (datos faltantes o rol inválido).`;
        }
        alert(message);
        setShowAIImportModal(false);
    };

    const columns: TableColumn<Employee>[] = [
        { header: 'Nombre', accessor: 'name' },
        { header: 'Apellido', accessor: 'lastName' },
        { header: 'Email', accessor: 'email' },
        { header: 'Rol', accessor: 'role' },
    ];
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Colaboradores</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                        <SparklesIcon /> Importar con IA
                    </button>
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon /> Crear Colaborador</button>
                </div>
            </div>
            <DataTable<Employee> data={employees} columns={columns} actions={(emp) => (
                <>
                    <button onClick={() => openModalForEdit(emp)} className="text-blue-600 dark:text-blue-400 p-1" aria-label={`Editar ${emp.name} ${emp.lastName}`}><EditIcon /></button>
                    <button onClick={() => requestDelete(emp.id)} className="text-red-600 dark:text-red-400 p-1" aria-label={`Eliminar ${emp.name} ${emp.lastName}`}><DeleteIcon /></button>
                </>
            )} />
            <EmployeeFormModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} employee={editingEmployee} />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar este colaborador? Esta acción no se puede deshacer."
                confirmButtonText="Sí, Eliminar"
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiEmployeeImportSuccess}
                entityName="Colaborador"
                fieldsToExtract="nombre (string), apellido (string), email (string), rol (string)"
                exampleFormat={`{
  "nombre": "Carlos",
  "apellido": "Ruiz",
  "email": "carlos.ruiz@example.com",
  "rol": "Diseñador Gráfico"
}`}
            />
        </div>
    );
};