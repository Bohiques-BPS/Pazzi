import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, Employee, Client } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { EllipsisVerticalIcon, CalendarDaysIcon, UserGroupIcon, ChatBubbleLeftRightIcon, DocumentArrowDownIcon } from '../icons'; // Adjusted path, Added DocumentArrowDownIcon

interface ProjectCardProps {
    project: Project;
    onViewProject: (project: Project, initialTab?: 'details' | 'chat' | 'tasks') => void;
    onRequestDelete: (projectId: string) => void;
    onViewQuotation: (project: Project) => void;
    onGenerateInvoice: (project: Project) => void; // New prop
    onViewInvoice: (project: Project) => void; // New prop
    allEmployees: Employee[];
    showManagementActions?: boolean; // New prop
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
    project, 
    onViewProject, 
    onRequestDelete, 
    onViewQuotation, 
    onGenerateInvoice,
    onViewInvoice,
    allEmployees, 
    showManagementActions = true 
}) => {
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
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 pr-2">{project.name}</h3>
            {showManagementActions && (
                <div className="relative flex-shrink-0">
                    <button onClick={() => setActionsOpen(!actionsOpen)} className="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none">
                        <EllipsisVerticalIcon />
                    </button>
                    {actionsOpen && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-10 border border-neutral-200 dark:border-neutral-600">
                            <button onClick={() => { onViewProject(project, 'details'); setActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Editar Detalles</button>
                            <button onClick={() => { onViewQuotation(project); setActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Ver Cotización</button>
                             {project.status === ProjectStatus.COMPLETED && !project.invoiceGenerated && (
                                <button onClick={() => { onGenerateInvoice(project); setActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Generar Factura</button>
                            )}
                            {project.invoiceGenerated && (
                                <button onClick={() => { onViewInvoice(project); setActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">Ver Factura</button>
                            )}
                            <button onClick={() => { onRequestDelete(project.id); setActionsOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50">Eliminar</button>
                        </div>
                    )}
                </div>
            )}
        </div>
        <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${statusColors[project.status]}`}>
            {project.status}
        </p>
        <div className="text-sm prose dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2 flex-grow" dangerouslySetInnerHTML={{ __html: project.description || ''}}></div>
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            <UserGroupIcon className="w-4 h-4 mr-2" />
            <span>Cliente: {client ? `${client.name} ${client.lastName}` : 'N/A'}</span>
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
            <p className="flex items-center"><CalendarDaysIcon className="w-4 h-4 mr-2" /> Visita: {project.visitDate ? new Date(project.visitDate + 'T00:00:00').toLocaleDateString() : 'N/P'}</p>
        </div>
         <div className="mt-4 flex space-x-2">
            <button onClick={() => onViewProject(project, 'chat')} className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 font-semibold text-xs py-1.5 px-3 rounded-md shadow-sm transition-colors duration-150 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5" /> Chat
            </button>
             <button onClick={() => onViewProject(project, 'tasks')} className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 font-semibold text-xs py-1.5 px-3 rounded-md shadow-sm transition-colors duration-150 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5" /> Tareas
            </button>
             {project.invoiceGenerated && (
                 <button onClick={() => onViewInvoice(project)} className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-700/50 dark:hover:bg-blue-700/80 dark:text-blue-200 font-semibold text-xs py-1.5 px-3 rounded-md shadow-sm transition-colors duration-150 flex items-center justify-center">
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" /> Ver Factura
                </button>
            )}
        </div>
      </div>
    </div>
  );
};