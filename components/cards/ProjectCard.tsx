
import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, Employee, Client } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { EllipsisVerticalIcon, CalendarDaysIcon, UserGroupIcon, ChatBubbleLeftRightIcon } from '../icons'; // Adjusted path

interface ProjectCardProps {
    project: Project;
    onEdit: (project: Project, initialTab?: 'details' | 'chat') => void; // Modified to accept initialTab
    onRequestDelete: (projectId: string) => void;
    onViewQuotation: (project: Project) => void;
    allEmployees: Employee[];
    showManagementActions?: boolean; // New prop
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onRequestDelete, onViewQuotation, allEmployees, showManagementActions = true }) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  const { getClientById } = useData();
  const client = getClientById(project.clientId);

  const statusColors: Record<ProjectStatus, string> = {
    [ProjectStatus.ACTIVE]: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100',
    [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
    [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100',
    [ProjectStatus.PENDING]: 'bg-orange-100 text-orange-700 dark:bg-orange-600 dark:text-orange-100',
  };

  const assignedEmployees = useMemo(() => {
    return project.assignedEmployeeIds
      .map(empId => allEmployees.find(e => e.id === empId))
      .filter(emp => emp !== undefined) as Employee[];
  }, [project.assignedEmployeeIds, allEmployees]);


  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-5 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-primary/20 transition-shadow duration-200">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">{project.name}</h3> {/* Increased size */}
          <div className="relative">
            <button onClick={() => setActionsOpen(!actionsOpen)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50" aria-haspopup="true" aria-expanded={actionsOpen} aria-controls={`project-actions-${project.id}`}>
              <EllipsisVerticalIcon /> {/* Default size from component */}
            </button>
            {actionsOpen && (
              <div id={`project-actions-${project.id}`}className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-10 border border-neutral-200 dark:border-neutral-600">
                {showManagementActions && (
                  <>
                    <button onClick={() => { onViewQuotation(project); setActionsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Ver Cotización</button>
                    <button onClick={() => { onEdit(project, 'details'); setActionsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Editar</button>
                    <button onClick={() => { onRequestDelete(project.id); setActionsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-base text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/50">Eliminar</button>
                  </>
                )}
                {!showManagementActions && (
                    <button onClick={() => { onEdit(project, 'details'); setActionsOpen(false); }} className="block w-full text-left px-3 py-1.5 text-base text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Ver Detalles</button>
                )}
              </div>
            )}
          </div>
        </div>
        <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${statusColors[project.status]}`}>{project.status}</span> {/* Status text size increased */}
        <p className="text-base text-neutral-600 dark:text-neutral-300 mt-2 mb-3 min-h-[40px] line-clamp-2">{project.description || 'Sin descripción.'}</p> {/* Increased size */}
        <div className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1.5 mb-3"> {/* Date/assignee text size increased */}
          <div className="flex items-center">
            <CalendarDaysIcon className="w-5 h-5" /> {/* Adjusted icon size */}
            <span className="ml-1.5">Creado: {new Date(project.startDate + 'T00:00:00').toLocaleDateString('es-ES')}</span>
          </div>
          <div className="flex items-center">
            <UserGroupIcon className="w-5 h-5" /> {/* Adjusted icon size */}
            <span className="ml-1.5">{assignedEmployees.length} asignado(s)</span>
          </div>
          {client && <p className="text-sm text-neutral-500 dark:text-neutral-400">Cliente: {client.name} {client.lastName}</p>}
        </div>
      </div>
      <div className="flex justify-between items-end pt-3 border-t border-neutral-200 dark:border-neutral-700 mt-auto">
        <div className="flex -space-x-2">
          {assignedEmployees.slice(0, 3).map(emp => (
            <div key={emp.id} title={`${emp.name} ${emp.lastName}`} className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center ring-2 ring-white dark:ring-neutral-800 font-semibold"> {/* Avatar size increased */}
              {emp.name.charAt(0)}{emp.lastName.charAt(0)}
            </div>
          ))}
          {assignedEmployees.length > 3 && (
             <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 text-sm flex items-center justify-center ring-2 ring-white dark:ring-neutral-800 font-semibold"> {/* Avatar size increased */}
              +{assignedEmployees.length - 3}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
            <button 
                onClick={() => onEdit(project, 'chat')} 
                className="text-base text-primary hover:text-secondary font-medium flex items-center" /* Text size increased */
                title="Abrir chat del proyecto"
                aria-label={`Abrir chat para ${project.name}`}
            >
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-1" /> Chat {/* Icon size increased */}
            </button>
            <button 
                onClick={() => onEdit(project, 'details')} 
                className="text-base text-primary hover:text-secondary font-medium" /* Text size increased */
                title="Ver detalles del proyecto"
                aria-label={`Ver detalles de ${project.name}`}
            >
                Ver Detalles
            </button>
        </div>
      </div>
    </div>
  );
};
