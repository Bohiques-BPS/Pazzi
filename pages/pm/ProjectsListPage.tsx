
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ConfirmationModal } from '../../components/Modal';
import { ProjectCard } from '../../components/cards/ProjectCard';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { DataTable, TableColumn } from '../../components/DataTable';
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, PROJECT_STATUS_OPTIONS } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export const ProjectsListPage: React.FC = () => {
    const { t } = useTranslation();
    const { projects, setProjects, employees: allEmployees, generateInvoiceForProject, getClientById } = useData();
    const navigate = useNavigate();

    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
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
        if (itemToDeleteId) {
            setProjects(prev => prev.filter(p => p.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };

    const handleGenerateInvoice = (project: Project) => {
        const success = generateInvoiceForProject(project.id);
        if (success) {
            alert(`Factura generada para el proyecto "${project.name}".`);
        } else {
            alert(`No se pudo generar la factura para "${project.name}". Verifique que el proyecto esté completo.`);
        }
    };
    
    const handleViewInvoice = (project: Project) => {
        // In a real app, this would generate and open a PDF. Here, we'll just show an alert.
        alert(`Mostrando factura para el proyecto "${project.name}".\nNº Factura: ${project.invoiceNumber}\nFecha: ${project.invoiceDate}\nMonto: $${project.invoiceAmount?.toFixed(2)}`);
    };

    const filteredProjects = useMemo(() => {
        return projects
            .filter(project =>
                (project.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'Todos' || project.status === statusFilter)
            )
            .sort((a, b) => {
                const dateA = a.visitDate || a.workStartDate || '0';
                const dateB = b.visitDate || b.workStartDate || '0';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
    }, [projects, searchTerm, statusFilter]);
    
    const tableColumns: TableColumn<Project>[] = useMemo(() => [
        { header: t('project.field.name'), accessor: 'name' },
        { 
            header: t('project.field.client'), 
            accessor: (project) => {
                const client = getClientById(project.clientId);
                return client ? `${client.name} ${client.lastName}` : 'N/A';
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
                return assigned.slice(0, 2).map(e => e!.name).join(', ') + (assigned.length > 2 ? ` y ${assigned.length - 2} más` : '');
            }
        },
    ], [getClientById, allEmployees, t]);


    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('project.list.title')}</h1>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder={t('common.search') + "..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${INPUT_SM_CLASSES} flex-grow`}
                        aria-label="Buscar proyectos"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'Todos')}
                        className={`${INPUT_SM_CLASSES}`}
                        aria-label="Filtrar por estado"
                    >
                        <option value="Todos">Todos los estados</option>
                        {PROJECT_STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-md">
                        <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tarjetas"><Squares2X2Icon className="w-5 h-5"/></button>
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'}`} aria-label="Vista de Tabla"><ListBulletIcon className="w-5 h-5"/></button>
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
                                    onViewQuotation={() => alert('Función "Ver Cotización" no implementada.')}
                                    onGenerateInvoice={handleGenerateInvoice}
                                    onViewInvoice={handleViewInvoice}
                                    allEmployees={allEmployees}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">No se encontraron proyectos</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 mt-2">Intente ajustar los filtros o cree un nuevo proyecto.</p>
                        </div>
                    )}
                </>
            ) : (
                <DataTable<Project>
                    data={filteredProjects}
                    columns={tableColumns}
                    actions={(project) => (
                        <div className="flex space-x-1">
                            <button onClick={() => handleViewProject(project)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" aria-label={`Ver/Editar ${project.name}`}><EditIcon /></button>
                            <button onClick={() => requestDelete(project.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" aria-label={`Eliminar ${project.name}`}><DeleteIcon /></button>
                        </div>
                    )}
                />
            )}


            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title={t('confirm.delete.title')}
                message={t('confirm.delete.message')}
                confirmButtonText={t('confirm.delete.btn')}
            />
        </div>
    );
};
