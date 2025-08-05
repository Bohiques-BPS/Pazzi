import React from 'react';
import { Visit, Employee, VisitStatus } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Modal } from '../../components/Modal'; // Adjusted path
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge'; // Adjusted path
import { BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { BriefcaseIcon } from '../../components/icons';

interface VisitDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    visit: Visit | null;
    onConvertToProject?: (visit: Visit) => void;
}

export const VisitDetailModal: React.FC<VisitDetailModalProps> = ({ isOpen, onClose, visit, onConvertToProject }) => {
    const { getProjectById, getEmployeeById } = useData();
    if (!isOpen || !visit) return null;

    const project = visit.projectId ? getProjectById(visit.projectId) : null;
    const assignedEmployees = visit.assignedEmployeeIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[];
    
    const formatDate = (dateString: string) => new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleConvertToProjectClick = () => {
        if (onConvertToProject && visit) {
            onConvertToProject(visit);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalles de la Visita" size="lg">
            <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-200">
                <h3 className="text-lg font-semibold text-primary">{visit.title}</h3>
                {project && <p><strong className="text-neutral-600 dark:text-neutral-300">Proyecto Vinculado:</strong> {project.name}</p>}
                <p><strong className="text-neutral-600 dark:text-neutral-300">Fecha:</strong> {formatDate(visit.date)}</p>
                <p><strong className="text-neutral-600 dark:text-neutral-300">Hora:</strong> {formatTime(visit.startTime)} - {formatTime(visit.endTime)}</p>
                <p><strong className="text-neutral-600 dark:text-neutral-300">Estado:</strong> <VisitStatusBadge status={visit.status} /></p>
                 <div>
                    <strong className="text-neutral-600 dark:text-neutral-300">Empleados Asignados:</strong>
                    {assignedEmployees.length > 0 ? (
                        <ul className="list-disc list-inside ml-4">
                            {assignedEmployees.map(emp => <li key={emp.id}>{emp.name} {emp.lastName} ({emp.role})</li>)}
                        </ul>
                    ) : <p className="text-neutral-500 dark:text-neutral-400">Ninguno</p>}
                </div>
                <p><strong className="text-neutral-600 dark:text-neutral-300">Notas:</strong> {visit.notes || "Sin notas."}</p>
                
                <div className="flex justify-end pt-3 space-x-2">
                    {onConvertToProject && !visit.projectId && (
                        <button onClick={handleConvertToProjectClick} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                            <BriefcaseIcon className="w-4 h-4 mr-1.5"/>
                            Convertir a Proyecto
                        </button>
                    )}
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};
