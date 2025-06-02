
import React, { useState, useEffect } from 'react';
import { Visit, VisitFormData, VisitStatus } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { VISIT_STATUS_OPTIONS, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path

interface ScheduleVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitToEdit?: Visit | null;
    initialDate?: Date | null;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({ isOpen, onClose, visitToEdit, initialDate }) => {
    const { projects, employees: allEmployees, setVisits } = useData();
    const [formData, setFormData] = useState<VisitFormData>({
        projectId: '', title: '', date: initialDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0], 
        startTime: '09:00', endTime: '10:00', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO
    });

    useEffect(() => {
        if (visitToEdit) {
            setFormData({
                projectId: visitToEdit.projectId || '',
                title: visitToEdit.title,
                date: visitToEdit.date,
                startTime: visitToEdit.startTime,
                endTime: visitToEdit.endTime,
                assignedEmployeeIds: visitToEdit.assignedEmployeeIds || [],
                notes: visitToEdit.notes || '',
                status: visitToEdit.status,
            });
        } else if (initialDate) {
            setFormData(prev => ({ ...prev, date: initialDate.toISOString().split('T')[0], title: '', projectId: '', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO, startTime: '09:00', endTime: '10:00' }));
        } else {
             setFormData({ projectId: '', title: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO});
        }
    }, [visitToEdit, initialDate, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEmployeeToggle = (employeeId: string) => {
        setFormData(prev => {
            const isAssigned = prev.assignedEmployeeIds.includes(employeeId);
            return {
                ...prev,
                assignedEmployeeIds: isAssigned 
                    ? prev.assignedEmployeeIds.filter(id => id !== employeeId)
                    : [...prev.assignedEmployeeIds, employeeId]
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (new Date(`${formData.date}T${formData.endTime}`) <= new Date(`${formData.date}T${formData.startTime}`)) {
            alert("La hora de fin debe ser posterior a la hora de inicio.");
            return;
        }

        if (visitToEdit) {
            setVisits(prevVisits => prevVisits.map(v => v.id === visitToEdit.id ? { ...visitToEdit, ...formData } : v));
        } else {
            const newVisit: Visit = { id: `visit-${Date.now()}`, ...formData };
            setVisits(prevVisits => [...prevVisits, newVisit]);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={visitToEdit ? "Editar Visita" : "Programar Visita"} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Título de la Visita</label>
                    <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="projectId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Vincular a Proyecto (Opcional)</label>
                    <select name="projectId" id="projectId" value={formData.projectId} onChange={handleChange} className={inputFormStyle}>
                        <option value="">Ninguno</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha</label>
                        <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Hora Inicio</label>
                        <input type="time" name="startTime" id="startTime" value={formData.startTime} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Hora Fin</label>
                        <input type="time" name="endTime" id="endTime" value={formData.endTime} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                </div>
                 <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Asignar Empleados</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {allEmployees.map(emp => (
                            <label key={emp.id} className="flex items-center space-x-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                <input type="checkbox" checked={formData.assignedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeToggle(emp.id)} className="form-checkbox text-primary focus:ring-primary dark:bg-neutral-600 dark:border-neutral-500"/>
                                <span className="text-sm text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notas (Opcional)</label>
                    <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputFormStyle} />
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
                    <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputFormStyle} required>
                        {VISIT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>{visitToEdit ? 'Guardar Cambios' : 'Programar Visita'}</button>
                </div>
            </form>
        </Modal>
    );
};
