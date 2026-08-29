
import React, { useState, useMemo } from 'react';
import { deleteWithUndo } from '../../utils/deleteWithUndo';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ConfirmationModal } from '../../components/Modal';
import { ProjectCard } from '../../components/cards/ProjectCard';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { DataTable, TableColumn } from '../../components/DataTable';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, PROJECT_STATUS_OPTIONS } from '../../constants';
import { ClientNameLink, EmployeeNameLink } from '../../components/ui/EntityNameLink';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { toast } from 'react-hot-toast';
import { projectsService } from '../../services/projects';

export const ProjectsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { projects, setProjects, employees: allEmployees, generateInvoiceForProject, getClientById } = useData();
    const navigate = useNavigate();

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');


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

    const handleGenerateInvoice = (project: Project) => {
        const success = generateInvoiceForProject(project.id);
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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('project.list.title')}</h1>
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 rounded-full px-2.5 py-0.5">{filteredProjects.length}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'Todos')}
                        className={`${INPUT_SM_CLASSES}`}
                        aria-label={t('pm2x.project.filter_status_aria')}
                    >
                        <option value="Todos">{t('pm2x.project.all_statuses')}</option>
                        {PROJECT_STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                        <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label={t('pm2x.project.card_view')}><Squares2X2Icon className="w-5 h-5"/></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label={t('pm2x.project.table_view')}><ListBulletIcon className="w-5 h-5"/></button>
                    </div>
                    <button
                        onClick={() => navigate('/pm/projects/new')}
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}
                    >
                       <PlusIcon className="w-5 h-5"/> {t('project.list.create')}
                    </button>
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
        </div>
    );
};
