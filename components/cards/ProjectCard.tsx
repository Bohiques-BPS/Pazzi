import React, { useState, useMemo } from 'react';
import { Project, ProjectStatus, ProjectPriority, Employee } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { EllipsisVerticalIcon, CalendarDaysIcon, UserGroupIcon, ChatBubbleLeftRightIcon, DocumentArrowDownIcon, ClipboardDocumentListIcon } from '../icons';

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
const stripHtml = (html?: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const ProjectCard: React.FC<ProjectCardProps> = ({
    project, onViewProject, onRequestDelete, onViewQuotation, onGenerateInvoice, onViewInvoice, allEmployees, showManagementActions = true,
}) => {
    const [actionsOpen, setActionsOpen] = useState(false);
    const { t } = useTranslation();
    const { getClientById } = useData();
    const client = getClientById(project.clientId);
    const meta = STATUS_META[project.status] || STATUS_META[ProjectStatus.PENDING];
    const priority = project.priority ? PRIORITY_META[project.priority] : null;

    const assigned = useMemo(
        () => project.assignedEmployeeIds.map(id => allEmployees.find(e => e.id === id)).filter(Boolean) as Employee[],
        [project.assignedEmployeeIds, allEmployees]
    );
    const desc = stripHtml(project.description);
    const visit = project.visitDate ? new Date(project.visitDate + 'T00:00:00').toLocaleDateString() : null;

    return (
        <div className="group bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
            {/* Acento de estado */}
            <div className={`h-1.5 ${meta.bar}`} />
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

                {/* Estado + prioridad */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${meta.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{project.status}
                    </span>
                    {priority && <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${priority.cls}`}>⚑ {priority.label}</span>}
                </div>

                {/* Descripción */}
                {desc && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">{desc}</p>}

                {/* Cliente + visita */}
                <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                        <UserGroupIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{t('cmp.projectcard.client')} <span className="font-medium text-neutral-700 dark:text-neutral-200">{client ? `${client.name} ${client.lastName || ''}`.trim() : 'N/A'}</span></span>
                    </div>
                    {visit && (
                        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                            <CalendarDaysIcon className="w-4 h-4 flex-shrink-0" />
                            <span>{t('cmp.projectcard.visit')} {visit}</span>
                        </div>
                    )}
                </div>

                {/* Equipo (avatares) */}
                <div className="mt-3 flex items-center justify-between min-h-[28px]">
                    {assigned.length > 0 ? (
                        <div className="flex -space-x-2">
                            {assigned.slice(0, 4).map((e, i) => (
                                e.profilePictureUrl
                                    ? <img key={e.id} src={e.profilePictureUrl} alt={e.name} title={`${e.name} ${e.lastName || ''}`} className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-neutral-800" />
                                    : <span key={e.id} title={`${e.name} ${e.lastName || ''}`} className={`w-7 h-7 rounded-full ${avatarColors[i % avatarColors.length]} text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-800`}>{initials(e)}</span>
                            ))}
                            {assigned.length > 4 && <span className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-200 text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-800">+{assigned.length - 4}</span>}
                        </div>
                    ) : <span className="text-xs text-neutral-400">Sin equipo asignado</span>}
                    {project.invoiceGenerated && (
                        <button onClick={() => onViewInvoice(project)} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            <DocumentArrowDownIcon className="w-4 h-4" /> {t('cmp.projectcard.view_invoice')}
                        </button>
                    )}
                </div>

                {/* Acciones */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
                    <button onClick={() => onViewProject(project, 'chat')} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 font-semibold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" /> {t('cmp.projectcard.chat')}
                    </button>
                    <button onClick={() => onViewProject(project, 'tasks')} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-teal-300 font-semibold text-xs py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <ClipboardDocumentListIcon className="w-4 h-4" /> {t('cmp.projectcard.tasks')}
                    </button>
                </div>
            </div>
        </div>
    );
};
