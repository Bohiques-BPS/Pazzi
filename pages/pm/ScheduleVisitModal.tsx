import React, { useState, useEffect, useRef } from 'react';
import { Visit, VisitFormData, VisitStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { VISIT_STATUS_OPTIONS, inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { SelectWithCreate } from '../../components/ui/SelectWithCreate';
import { ProjectFormModal } from './ProjectFormModal';
import { visitsService } from '../../services/visits';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../../components/icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface ScheduleVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    visitToEdit?: Visit | null;
    initialDate?: Date | null;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({ isOpen, onClose, visitToEdit, initialDate }) => {
    const { t } = useTranslation();
    const { projects, employees: allEmployees, setVisits } = useData();
    const [formData, setFormData] = useState<VisitFormData>({
        projectId: '', title: '', date: initialDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        startTime: '09:00', endTime: '10:00', assignedEmployeeIds: [], notes: '', status: VisitStatus.PROGRAMADO,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Modal anidado para crear un proyecto sin salir del formulario de visita.
    const [showCreateProject, setShowCreateProject] = useState(false);
    // IDs de proyectos antes de abrir el modal de creación, para detectar el nuevo.
    const projectIdsBeforeCreate = useRef<Set<string>>(new Set());

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
            setError(t('pm2x.visit.form.title_required'));
            return;
        }
        if (new Date(`${formData.date}T${formData.endTime}`) <= new Date(`${formData.date}T${formData.startTime}`)) {
            setError(t('pm2x.visit.form.end_after_start'));
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

            toast.success(visitToEdit ? t('pm2x.visit.updated') : t('pm2x.visit.scheduled'));
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : t('pm2x.visit.save_error'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={visitToEdit ? t('pm2x.visit.form.edit_title') : t('pm2x.visit.form.create_title')} size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pm2x.visit.form.title_label')}</label>
                    <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className={inputFormStyle} required autoFocus />
                </div>
                <SelectWithCreate
                    id="projectId"
                    name="projectId"
                    label={t('pm2x.visit.form.link_project')}
                    value={formData.projectId}
                    onChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}
                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                    onCreateClick={() => {
                        projectIdsBeforeCreate.current = new Set(projects.map(p => p.id));
                        setShowCreateProject(true);
                    }}
                    placeholder={t('pm2x.common.none')}
                    createTitle={t('pm2x.visit.form.create_project')}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('common.date')}</label>
                        <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('project.schedule.start_time')}</label>
                        <input type="time" name="startTime" id="startTime" value={formData.startTime} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('project.schedule.end_time')}</label>
                        <input type="time" name="endTime" id="endTime" value={formData.endTime} onChange={handleChange} className={inputFormStyle} required />
                    </div>
                </div>
                <fieldset className="border dark:border-neutral-600 p-3 rounded">
                    <legend className="text-sm font-medium px-1 text-neutral-700 dark:text-neutral-300">{t('project.resources.assign_employees')}</legend>
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
                    <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('pm2x.visit.form.notes_label')}</label>
                    <RichTextEditor value={formData.notes || ''} onChange={(value) => setFormData(prev => ({ ...prev, notes: value }))} placeholder={t('pm2x.visit.form.notes_placeholder')} />
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('common.status')}</label>
                    <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputFormStyle} required>
                        {VISIT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={submitting}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? t('common.saving') : (visitToEdit ? t('pm2x.visit.form.save_changes') : t('pm2x.visit.form.create_title'))}
                    </button>
                </div>
            </form>
        </Modal>
        {showCreateProject && (
            <ProjectFormModal
                isOpen={showCreateProject}
                project={null}
                onClose={() => {
                    // Detecta el proyecto recién creado (no estaba antes) y lo selecciona.
                    const nuevo = projects.find(p => !projectIdsBeforeCreate.current.has(p.id));
                    if (nuevo) {
                        setFormData(prev => ({ ...prev, projectId: nuevo.id }));
                        toast.success(t('pm2x.visit.form.project_linked', { name: nuevo.name }));
                    }
                    setShowCreateProject(false);
                }}
            />
        )}
        </>
    );
};
