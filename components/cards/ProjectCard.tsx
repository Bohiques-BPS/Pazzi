import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectPriority, Employee } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { EllipsisVerticalIcon, CalendarDaysIcon, UserGroupIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon } from '../icons';

interface ProjectCardProps {
    project: Project;
    onViewProject: (project: Project, initialTab?: 'details' | 'chat' | 'tasks') => void;
    onRequestDelete: (projectId: string) => void;
    onViewQuotation: (project: Project) => void;
    onGenerateInvoice: (project: Project) => void;
    onViewInvoice: (project: Project) => void;
    allEmployees: Employee[];
    showManagementActions?: boolean;
}

/** Barra/acento de color por estado del proyecto. */
const STATUS_META: Record<ProjectStatus, { bar: string; pill: string; dot: string }> = {
    [ProjectStatus.ACTIVE]: { bar: 'bg-blue-500', pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
    [ProjectStatus.COMPLETED]: { bar: 'bg-green-500', pill: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', dot: 'bg-green-500' },
    [ProjectStatus.PAUSED]: { bar: 'bg-yellow-500', pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', dot: 'bg-yellow-500' },
    [ProjectStatus.PENDING]: { bar: 'bg-orange-500', pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
};

const PRIORITY_META: Record<number, { label: string; cls: string }> = {
    [ProjectPriority.HIGH]: { label: 'Alta', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    [ProjectPriority.MEDIUM]: { label: 'Media', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    [ProjectPriority.LOW]: { label: 'Baja', cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300' },
};

const avatarColors = ['bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500'];
const initials = (e: Employee) => `${(e.name || '')[0] || ''}${(e.lastName || '')[0] || ''}`.toUpperCase();

export const ProjectCard: React.FC<ProjectCardProps> = ({
    project, onViewProject, onRequestDelete, onViewQuotation, onGenerateInvoice, onViewInvoice, allEmployees, showManagementActions = true,
}) => {
    const [actionsOpen, setActionsOpen] = useState(false);
    const { t } = useTranslation();
    const { getClientById, tasks } = useData();
    const client = getClientById(project.clientId);
    const meta = STATUS_META[project.status] || STATUS_META[ProjectStatus.PENDING];
    const priority = project.priority ? PRIORITY_META[project.priority] : null;

    const assigned = useMemo(
        () => project.assignedEmployeeIds.map(id => allEmployees.find(e => e.id === id)).filter(Boolean) as Employee[],
        [project.assignedEmployeeIds, allEmployees]
    );

    // Progreso derivado de las tareas del proyecto ('Hecho' / total, sin archivadas).
    const { doneTasks, totalTasks, progress } = useMemo(() => {
        const pt = tasks.filter(tk => tk.projectId === project.id && !tk.archived);
        const done = pt.filter(tk => tk.status === 'Hecho').length;
        return { doneTasks: done, totalTasks: pt.length, progress: pt.length ? Math.round((done / pt.length) * 100) : 0 };
    }, [tasks, project.id]);

    const chatCount = (project as any)._count?.chatMessages ?? 0;
    const dueRaw = project.workEndDate || (project as any).paymentDueDate || project.visitDate;
    const dueDate = dueRaw ? new Date(String(dueRaw).slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null;

    return (
        <div className={`group relative bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${actionsOpen ? 'z-30' : ''}`}>
            {/* Acento de estado (redondeado arriba; sin overflow-hidden para no recortar el menú "···") */}
            <div className={`h-1.5 rounded-t-xl ${meta.bar}`} />
            <div className="p-4 flex flex-col flex-grow">
                {/* Título + menú */}
                <div className="flex justify-between items-start gap-2">
                    <button onClick={() => onViewProject(project, 'details')} className="text-left min-w-0 flex-1">
                        <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-primary transition-colors line-clamp-1" title={project.name}>{project.name}</h3>
                    </button>
                    {showManagementActions && (
                        <div className="relative flex-shrink-0">
                            <button onClick={() => setActionsOpen(o => !o)} onBlur={() => setTimeout(() => setActionsOpen(false), 150)} className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700" aria-label={t('common.actions')}>
                                <EllipsisVerticalIcon />
                            </button>
                            {actionsOpen && (
                                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-700 rounded-md shadow-lg py-1 z-20 border border-neutral-200 dark:border-neutral-600">
                                    <button onMouseDown={() => onViewProject(project, 'details')} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">{t('cmp.projectcard.edit_details')}</button>
                                    <button onMouseDown={() => onViewQuotation(project)} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">{t('cmp.projectcard.view_quotation')}</button>
                                    {project.status === ProjectStatus.COMPLETED && !project.invoiceGenerated && (
                                        <button onMouseDown={() => onGenerateInvoice(project)} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">{t('cmp.projectcard.generate_invoice')}</button>
                                    )}
                                    {project.invoiceGenerated && (
                                        <button onMouseDown={() => onViewInvoice(project)} className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600">{t('cmp.projectcard.view_invoice')}</button>
                                    )}
                                    <button onMouseDown={() => onRequestDelete(project.id)} className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50">{t('common.delete')}</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cliente */}
                <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    <UserGroupIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{client ? `${client.name} ${client.lastName || ''}`.trim() : 'N/A'}</span>
                </div>

                {/* Estado + prioridad */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${meta.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{project.status}
                    </span>
                    {priority && <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${priority.cls}`}>⚑ {priority.label}</span>}
                </div>

                {/* Progreso */}
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('cmp.projectcard.progress')}</span>
                        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Equipo + tareas/fecha */}
                <div className="mt-3 flex items-center justify-between gap-2 min-h-[28px]">
                    {assigned.length > 0 ? (
                        <div className="flex -space-x-2">
                            {assigned.slice(0, 4).map((e, i) => (
                                e.profilePictureUrl
                                    ? <img key={e.id} src={e.profilePictureUrl} alt={e.name} title={`${e.name} ${e.lastName || ''}`} className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-neutral-800" />
                                    : <span key={e.id} title={`${e.name} ${e.lastName || ''}`} className={`w-7 h-7 rounded-full ${avatarColors[i % avatarColors.length]} text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-800`}>{initials(e)}</span>
                            ))}
                            {assigned.length > 4 && <span className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-200 text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-800">+{assigned.length - 4}</span>}
                        </div>
                    ) : <span className="text-xs text-neutral-400">{t('cmp.projectcard.no_team')}</span>}
                    <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 flex-shrink-0">
                        {totalTasks > 0 && <span className="inline-flex items-center gap-1" title={t('cmp.projectcard.tasks')}><ClipboardDocumentListIcon className="w-4 h-4" />{doneTasks}/{totalTasks}</span>}
                        {dueDate && <span className="inline-flex items-center gap-1"><CalendarDaysIcon className="w-4 h-4" />{dueDate}</span>}
                    </div>
                </div>

                {/* Acciones */}
                <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
                    <button onClick={() => onViewProject(project, 'chat')} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 font-semibold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" /> {t('cmp.projectcard.chat')}
                        {chatCount > 0 && <span className="ml-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">{chatCount}</span>}
                    </button>
                    <button onClick={() => onViewProject(project, 'tasks')} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-teal-300 font-semibold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <ClipboardDocumentListIcon className="w-4 h-4" /> {t('cmp.projectcard.tasks')}
                    </button>
                </div>
            </div>
        </div>
    );
};
