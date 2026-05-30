import React, { useState, useEffect } from 'react';
import { Visit, VisitFormData, VisitStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { VISIT_STATUS_OPTIONS, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { visitsService } from '../../services/visits';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../../components/icons';

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
        startTime: '09:00', endTime: '10:00', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setFormData({ projectId: '', title: '', date: initialDate.toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO });
        } else {
            setFormData({ projectId: '', title: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO });
        }
        setError(null);
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
                    : [...prev.assignedEmployeeIds, employeeId],
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.title.trim()) {
            setError('El título es requerido.');
            return;
        }
        if (new Date(`${formData.date}T${formData.endTime}`) <= new Date(`${formData.date}T${formData.startTime}`)) {
            setError('La hora de fin debe ser posterior a la hora de inicio.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                projectId: formData.projectId || undefined,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                status: formData.status,
                notes: formData.notes || undefined,
                assignedEmployeeIds: formData.assignedEmployeeIds,
            };
            const saved = visitToEdit
                ? await visitsService.update(visitToEdit.id, payload)
                : await visitsService.create(payload);

            const normalizedSaved = {
                ...saved,
                date: typeof (saved as any).date === 'string'
                    ? (saved as any).date.split('T')[0]
                    : (saved as any).date,
                assignedEmployeeIds: Array.isArray((saved as any).employees)
                    ? (saved as any).employees.map((e: any) => e.userId)
                    : (Array.isArray((saved as any).assignedEmployeeIds) ? (saved as any).assignedEmployeeIds : []),
            };
            setVisits(prev => visitToEdit
                ? prev.map(v => v.id === visitToEdit.id ? (normalizedSaved as unknown as Visit) : v)
                : [...prev, normalizedSaved as unknown as Visit]);

            toast.success(visitToEdit ? 'Visita actualizada' : 'Visita programada');
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Error al guardar la visita');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={visitToEdit ? 'Editar visita' : 'Programar visita'} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Título de la visita</label>
                    <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className={inputFormStyle} required autoFocus />
                </div>
                <div>
                    <label htmlFor="projectId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Vincular a proyecto (opcional)</label>
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
                        <label htmlFor="startTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Hora inicio</label>
                        <input type="time" name="startTime" id="startTime" value={formData.startTime} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Hora fin</label>
                        <input type="time" name="endTime" id="endTime" value={formData.endTime} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                </div>
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">Asignar empleados</legend>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {allEmployees.map(emp => (
                            <label key={emp.id} className="flex items-center space-x-2 p-1.5 bg-neutral-100 dark:bg-neutral-700 rounded cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600">
                                <input type="checkbox" checked={formData.assignedEmployeeIds.includes(emp.id)} onChange={() => handleEmployeeToggle(emp.id)} className="form-checkbox text-primary focus:ring-primary" />
                                <span className="text-sm text-neutral-700 dark:text-neutral-200">{emp.name} {emp.lastName}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notas (opcional)</label>
                    <RichTextEditor value={formData.notes || ''} onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))} placeholder="Detalles o instrucciones..." />
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Estado</label>
                    <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputFormStyle} required>
                        {VISIT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? 'Guardando...' : (visitToEdit ? 'Guardar cambios' : 'Programar visita')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
