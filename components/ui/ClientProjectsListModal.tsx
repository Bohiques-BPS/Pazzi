
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../Modal';
import { Project, ProjectStatus } from '../../types';
import { BriefcaseIcon, ChevronRightIcon, CalendarDaysIcon } from '../icons'; // Changed ArrowRightIcon to ChevronRightIcon
import { BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';

interface ClientProjectsListModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    projects: Project[];
}

export const ClientProjectsListModal: React.FC<ClientProjectsListModalProps> = ({ isOpen, onClose, clientName, projects }) => {
    const navigate = useNavigate();

    const handleNavigate = (projectId: string) => {
        navigate(`/pm/projects/${projectId}?tab=details`);
        onClose();
    };

    const statusColors: Record<string, string> = {
        [ProjectStatus.ACTIVE]: 'bg-blue-100 text-blue-700',
        [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700',
        [ProjectStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
        [ProjectStatus.PAUSED]: 'bg-orange-100 text-orange-700',
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Proyectos de ${clientName}`} size="lg">
            <div className="space-y-4">
                {projects.length > 0 ? (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {projects.map(project => (
                            <div key={project.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
                                            <BriefcaseIcon className="w-4 h-4 mr-2 text-primary" />
                                            {project.name}
                                        </h4>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
                                            {project.description || "Sin descripción"}
                                        </p>
                                        <div className="flex items-center mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            <CalendarDaysIcon className="w-3 h-3 mr-1" />
                                            {project.workStartDate ? `Inicio: ${new Date(project.workStartDate).toLocaleDateString()}` : 'Fecha sin definir'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[project.status] || 'bg-gray-100 text-gray-700'}`}>
                                            {project.status}
                                        </span>
                                        <button 
                                            onClick={() => handleNavigate(project.id)}
                                            className={`${BUTTON_PRIMARY_SM_CLASSES} !text-xs flex items-center`}
                                        >
                                            Ver Tablero <ChevronRightIcon className="w-3 h-3 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <BriefcaseIcon className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                        <p className="text-neutral-500 dark:text-neutral-400">Este cliente no tiene proyectos registrados.</p>
                    </div>
                )}
                <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};
