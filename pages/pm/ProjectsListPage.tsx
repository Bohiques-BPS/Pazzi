
import React, { useState, useMemo } from 'react';
import { deleteWithUndo } from '../../utils/deleteWithUndo';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ConfirmationModal, Modal } from '../../components/Modal';
import { ProjectCard } from '../../components/cards/ProjectCard';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, EditIcon, DeleteIcon, BriefcaseIcon, ClipboardDocumentListIcon, ChartBarIcon, UserGroupIcon } from '../../components/icons';
import { DataTable, TableColumn } from '../../components/DataTable';
import { BUTTON_PRIMARY_SM_CLASSES, PROJECT_STATUS_OPTIONS } from '../../constants';
import { ClientNameLink, EmployeeNameLink } from '../../components/ui/EntityNameLink';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';
import { projectsService } from '../../services/projects';

export const ProjectsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { projects, setProjects, employees: allEmployees, tasks, generateInvoiceForProject, getClientById } = useData();
    const navigate = useNavigate();

    // KPIs de la cabecera.
    const kpis = useMemo(() => ({
        active: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
        completed: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
        pendingTasks: tasks.filter(tk => !tk.archived && tk.status !== 'Hecho').length,
        collaborators: allEmployees.length,
    }), [projects, tasks, allEmployees]);

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [showCollabModal, setShowCollabModal] = useState(false);

    // Tareas pendientes (todas las de proyectos, sin archivar y sin completar) con el nombre del proyecto.
    const pendingTaskRows = useMemo(() => {
        const projName = new Map(projects.map(p => [p.id, p.name]));
        return tasks
            .filter(tk => !tk.archived && tk.status !== 'Hecho')
            .map(tk => ({ ...tk, projectName: projName.get(tk.projectId) || '—' }));
    }, [tasks, projects]);


    const handleViewProject = (project: Project, initialTab: 'details' | 'chat' | 'tasks' = 'details') => {
        navigate(`/pm/projects/${project.id}?tab=${initialTab}`);
    };

    const requestDelete = (projectId: string) => {
        setItemToDeleteId(projectId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = () => {
        if (!itemToDeleteId) { setShowDeleteConfirmModal(false); return; }
        const id = itemToDeleteId;
        const item = projects.find(p => p.id === id);
        setItemToDeleteId(null);
        setShowDeleteConfirmModal(false);
        deleteWithUndo({
            label: t('entity.project'),
            optimisticRemove: () => setProjects(prev => prev.filter(p => p.id !== id)),
            restore: () => setProjects(prev => (item && !prev.some(p => p.id === id)) ? [item, ...prev] : prev),
            apiDelete: () => projectsService.delete(id),
            errorMessage: t('pm2x.project.delete_error'),
        });
    };

    const handleGenerateInvoice = async (project: Project) => {
        const success = await generateInvoiceForProject(project.id);
        if (success) {
            toast.success(t('pm2x.project.invoice_generated', { name: project.name }));
        } else {
            toast.error(t('pm2x.project.invoice_error', { name: project.name }));
        }
    };

    const handleViewInvoice = (project: Project) => {
        // In a real app, this would generate and open a PDF. Here, we'll just show an alert.
        toast(t('pm2x.project.invoice_toast', { num: project.invoiceNumber ?? '', date: project.invoiceDate ?? '', amount: project.invoiceAmount?.toFixed(2) ?? '' }), { icon: '🧾', duration: 5000 });
    };

    const filteredProjects = useMemo(() => {
        return projects
            .filter(project =>
                (statusFilter === 'Todos' || project.status === statusFilter)
            )
            .sort((a, b) => {
                const dateA = a.visitDate || a.workStartDate || '0';
                const dateB = b.visitDate || b.workStartDate || '0';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
    }, [projects, statusFilter]);
    
    const tableColumns: TableColumn<Project>[] = useMemo(() => [
        { header: t('project.field.name'), accessor: 'name' },
        {
            header: t('project.field.client'),
            sortValue: (project) => { const c = getClientById(project.clientId); return c ? `${c.name} ${c.lastName}` : ''; },
            accessor: (project) => {
                const client = getClientById(project.clientId);
                if (!client) return 'N/A';
                return <ClientNameLink clientId={project.clientId} name={`${client.name} ${client.lastName}`} />;
            }
        },
        { 
            header: t('project.field.status'), 
            accessor: (project) => {
                const statusColors: Record<ProjectStatus, string> = {
                    [ProjectStatus.ACTIVE]: 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100',
                    [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100',
                    [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-100',
                    [ProjectStatus.PENDING]: 'bg-orange-100 text-orange-700 dark:bg-orange-600 dark:text-orange-100',
                };
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                        {project.status}
                    </span>
                );
            } 
        },
        { 
            header: t('project.field.next_visit'), 
            accessor: (project) => project.visitDate ? new Date(project.visitDate + 'T00:00:00').toLocaleDateString() : 'N/P'
        },
        { 
            header: t('project.field.team'), 
            accessor: (project) => {
                const assigned = project.assignedEmployeeIds
                    .map(empId => allEmployees.find(e => e.id === empId))
                    .filter(emp => emp !== undefined);
                if (assigned.length === 0) return 'N/A';
                return (
                    <span className="inline-flex flex-wrap gap-x-1">
                        {assigned.slice(0, 2).map((e, i) => (
                            <React.Fragment key={e!.id}>
                                <EmployeeNameLink employeeId={e!.id} name={e!.name} />{i < Math.min(assigned.length, 2) - 1 ? ',' : ''}
                            </React.Fragment>
                        ))}
                        {assigned.length > 2 ? ` ${t('pm2x.common.and_more', { n: assigned.length - 2 })}` : ''}
                    </span>
                );
            }
        },
    ], [getClientById, allEmployees, t]);


    return (
        <div>
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('project.list.title')}</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {projects.length} {t('project.list.count_suffix')} · {t('project.list.updated_today')}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/pm/projects/new')}
                    className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0 self-start sm:self-auto`}
                >
                    <PlusIcon className="w-5 h-5"/> {t('project.list.create')}
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { icon: BriefcaseIcon, label: t('project.kpi.active'), value: kpis.active, onClick: () => setStatusFilter(ProjectStatus.ACTIVE) },
                    { icon: ClipboardDocumentListIcon, label: t('project.kpi.pending_tasks'), value: kpis.pendingTasks, onClick: () => setShowTasksModal(true) },
                    { icon: ChartBarIcon, label: t('project.kpi.completed'), value: kpis.completed, onClick: () => setStatusFilter(ProjectStatus.COMPLETED) },
                    { icon: UserGroupIcon, label: t('project.kpi.collaborators'), value: kpis.collaborators, onClick: () => setShowCollabModal(true) },
                ].map((k, i) => {
                    const Icon = k.icon;
                    return (
                        <button key={i} type="button" onClick={k.onClick} className="text-left bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 transition-all">
                            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm">
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{k.label}</span>
                            </div>
                            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">{k.value}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filtros (pestañas) + vista */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                    {(['Todos', ...PROJECT_STATUS_OPTIONS] as (ProjectStatus | 'Todos')[]).map(s => {
                        const activeTab = statusFilter === s;
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab ? 'bg-primary text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                            >
                                {s === 'Todos' ? t('pm2x.project.all_statuses') : s}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md flex-shrink-0">
                    <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`} aria-label={t('pm2x.project.card_view')}><Squares2X2Icon className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`} aria-label={t('pm2x.project.table_view')}><ListBulletIcon className="w-5 h-5"/></button>
                </div>
            </div>

            {viewMode === 'card' ? (
                <>
                    {filteredProjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredProjects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onViewProject={handleViewProject}
                                    onRequestDelete={requestDelete}
                                    onViewQuotation={() => toast(t('pm2x.project.quotation_not_impl'), { icon: '📄' })}
                                    onGenerateInvoice={handleGenerateInvoice}
                                    onViewInvoice={handleViewInvoice}
                                    allEmployees={allEmployees}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">{t('pm2x.project.none_found')}</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 mt-2">{t('pm2x.project.adjust_filters')}</p>
                        </div>
                    )}
                </>
            ) : (
                <DataTable<Project> onRowClick={handleViewProject}
                    data={filteredProjects}
                    columns={tableColumns}
                    actions={(project) => (
                        <div className="flex space-x-1">
                            <button onClick={() => handleViewProject(project)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={t('pm2x.project.view_edit_aria', { name: project.name })}><EditIcon className="w-5 h-5" /></button>
                            <button onClick={() => requestDelete(project.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={t('pm2x.common.delete_name', { name: project.name })}><DeleteIcon className="w-5 h-5" /></button>
                        </div>
                    )}
                />
            )}


            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('pm2x.project.confirm_delete_title')}
                message={(() => {
                    const name = projects.find(p => p.id === itemToDeleteId)?.name || '';
                    return name
                        ? t('confirm.delete.named_item', { item: t('confirm.delete.def.project'), name })
                        : t('confirm.delete.named', { item: t('confirm.delete.n.project') });
                })()}
                confirmButtonText={t('pm2x.common.yes_delete')}
            />

            {/* Tareas pendientes: tabla en la misma vista (antes navegaba al dashboard). */}
            <Modal isOpen={showTasksModal} onClose={() => setShowTasksModal(false)} title={`${t('project.kpi.pending_tasks')} (${pendingTaskRows.length})`} size="3xl">
                {pendingTaskRows.length === 0 ? (
                    <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">{'Sin tareas pendientes.'}</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 max-h-[60vh]">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Tarea'}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Proyecto'}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Estado'}</th>
                                    <th className="px-3 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                                {pendingTaskRows.map(tk => (
                                    <tr key={tk.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                        <td className="px-3 py-2">{tk.title}</td>
                                        <td className="px-3 py-2">{(tk as any).projectName}</td>
                                        <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700">{tk.status}</span></td>
                                        <td className="px-3 py-2 text-right">
                                            <button onClick={() => { setShowTasksModal(false); navigate(`/pm/projects/${tk.projectId}?tab=tasks`); }} className="text-primary hover:underline text-xs">{'Abrir'}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            {/* Colaboradores: tabla en la misma vista (antes iba al módulo Tienda). */}
            <Modal isOpen={showCollabModal} onClose={() => setShowCollabModal(false)} title={`${t('project.kpi.collaborators')} (${allEmployees.length})`} size="3xl">
                {allEmployees.length === 0 ? (
                    <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">{'Sin colaboradores.'}</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700 max-h-[60vh]">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Nombre'}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Email'}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Rol'}</th>
                                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{'Departamento'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-neutral-700 dark:text-neutral-200">
                                {allEmployees.map((e: any) => (
                                    <tr key={e.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                        <td className="px-3 py-2">{`${e.name || ''} ${e.lastName || ''}`.trim() || '—'}</td>
                                        <td className="px-3 py-2">{e.email || '—'}</td>
                                        <td className="px-3 py-2">{e.roleName || e.position || e.role || '—'}</td>
                                        <td className="px-3 py-2">{e.department || e.departmentName || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </div>
    );
};
