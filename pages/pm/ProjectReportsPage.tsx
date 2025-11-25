
import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Project, Employee, Client, Product, ProjectStatus, WorkDayTimeRange } from '../../types';
import { DataTable, TableColumn } from '../../components/DataTable';
import { ChartBarIcon, UsersIcon, BriefcaseIcon, BanknotesIcon, ClockIcon, ExclamationTriangleIcon, ArrowUpIcon, ArrowDownIcon } from '../../components/icons';
import { INPUT_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import hook

interface SortConfig<T> {
  key: keyof T | null;
  direction: 'ascending' | 'descending';
}

const ITEMS_PER_PAGE = 5;

const PaginationControls: React.FC<{currentPage: number, totalPages: number, onPageChange: (page: number) => void}> = ({ currentPage, totalPages, onPageChange }) => {
    const { t } = useTranslation();
    if (totalPages <= 1) return null;
    return (
        <div className="mt-4 flex justify-center items-center space-x-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.previous')}</button>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">{t('common.page_of', { current: currentPage, total: totalPages })}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.next')}</button>
        </div>
    );
};

const calculateProjectDuration = (project: Project): string => {
    if (project.status !== ProjectStatus.COMPLETED) return "En progreso";
    const workDates: Date[] = [];
    if (project.workMode === 'daysOnly' && project.workDays && project.workDays.length > 0) {
        project.workDays.forEach(dayStr => workDates.push(new Date(dayStr + 'T00:00:00')));
    } else if (project.workMode === 'daysAndTimes' && project.workDayTimeRanges && project.workDayTimeRanges.length > 0) {
        project.workDayTimeRanges.forEach(range => workDates.push(new Date(range.date + 'T00:00:00')));
    }
    if (workDates.length === 0) return "Fechas no disp.";
    const sortedDates = workDates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
    return `${durationDays} día(s)`;
};


// Specific types for table data items
interface EmployeeReportItem {
  id: string;
  employeeName: string;
  activeProjectCount: number;
  assignedProjectsSummary: string;
  rawEmployee: Employee; // For potential future use or detailed view
}

interface ClientReportItem {
  id: string;
  clientName: string;
  totalProjects: number;
  activeProjects: number;
  rawClient: Client;
}

interface ProjectCostReportItem extends Project {
  id: string;
  projectName: string;
  clientName: string;
  estimatedCost: number;
  projectStatus: ProjectStatus;
}

interface CompletedProjectReportItem extends Project {
  id: string;
  projectName: string;
  clientName: string;
  duration: string;
  completionDate?: string; // Optional: could be calculated from last work day
}

interface PendingProjectReportItem extends Project {
  id: string;
  projectName: string;
  clientName: string;
  projectStatus: ProjectStatus;
  nextActivityInfo: string;
  resourceSummary: string;
}


export const ProjectReportsPage: React.FC = () => {
    const { t } = useTranslation(); // Use hook
    const { projects, employees, clients, products: allProducts, getClientById } = useData();

    // State for Employee Performance Report
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employeeSort, setEmployeeSort] = useState<SortConfig<EmployeeReportItem>>({ key: 'activeProjectCount', direction: 'descending' });
    const [employeePage, setEmployeePage] = useState(1);
    
    // State for Client Activity Report
    const [clientSearch, setClientSearch] = useState('');
    const [clientSort, setClientSort] = useState<SortConfig<ClientReportItem>>({ key: 'totalProjects', direction: 'descending' });
    const [clientPage, setClientPage] = useState(1);

    // State for Project Costs Report
    const [projectCostSearch, setProjectCostSearch] = useState('');
    const [projectCostStatusFilter, setProjectCostStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [projectCostSort, setProjectCostSort] = useState<SortConfig<ProjectCostReportItem>>({ key: 'estimatedCost', direction: 'descending' });
    const [projectCostPage, setProjectCostPage] = useState(1);

    // State for Completed Project Durations Report
    const [completedProjectSearch, setCompletedProjectSearch] = useState('');
    const [completedProjectSort, setCompletedProjectSort] = useState<SortConfig<CompletedProjectReportItem>>({ key: 'duration', direction: 'descending' }); // Needs custom sort logic for string duration
    const [completedProjectPage, setCompletedProjectPage] = useState(1);
    
    // State for Pending/Active Projects Report
    const [pendingProjectSearch, setPendingProjectSearch] = useState('');
    const [pendingProjectStatusFilter, setPendingProjectStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [pendingProjectSort, setPendingProjectSort] = useState<SortConfig<PendingProjectReportItem>>({ key: 'projectName', direction: 'ascending' });
    const [pendingProjectPage, setPendingProjectPage] = useState(1);


    const employeeProjectData = useMemo(() => {
        let data = employees.map(emp => {
            const assigned = projects.filter(p => p.assignedEmployeeIds.includes(emp.id) && (p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PENDING));
            return {
                id: emp.id,
                employeeName: `${emp.name} ${emp.lastName}`,
                activeProjectCount: assigned.length,
                assignedProjectsSummary: assigned.slice(0, 2).map(p => p.name).join(', ') + (assigned.length > 2 ? ` y ${assigned.length - 2} más...` : ''),
                rawEmployee: emp,
            };
        });
        if (employeeSearch) {
            data = data.filter(item => item.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()));
        }
        if (employeeSort.key) {
            data.sort((a, b) => {
                if (a[employeeSort.key!] < b[employeeSort.key!]) return employeeSort.direction === 'ascending' ? -1 : 1;
                if (a[employeeSort.key!] > b[employeeSort.key!]) return employeeSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [employees, projects, employeeSearch, employeeSort]);

    const clientProjectData = useMemo(() => {
        let data = clients.map(client => {
            const clientProjs = projects.filter(p => p.clientId === client.id);
            return {
                id: client.id,
                clientName: `${client.name} ${client.lastName}`,
                totalProjects: clientProjs.length,
                activeProjects: clientProjs.filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PENDING).length,
                rawClient: client,
            };
        });
         if (clientSearch) {
            data = data.filter(item => item.clientName.toLowerCase().includes(clientSearch.toLowerCase()));
        }
        if (clientSort.key) {
            data.sort((a, b) => {
                if (a[clientSort.key!] < b[clientSort.key!]) return clientSort.direction === 'ascending' ? -1 : 1;
                if (a[clientSort.key!] > b[clientSort.key!]) return clientSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [clients, projects, clientSearch, clientSort]);

    const projectCostData = useMemo(() => {
        let data = projects.map(project => {
            const client = getClientById(project.clientId);
            return {
                id: project.id,
                projectName: project.name,
                clientName: client ? `${client.name} ${client.lastName}` : 'N/A',
                estimatedCost: project.assignedProducts.reduce((acc, ap) => acc + (allProducts.find(p => p.id === ap.productId)?.unitPrice || 0) * ap.quantity, 0),
                projectStatus: project.status,
                ...project, // Spread rest of project for potential future use
            };
        });
        if (projectCostSearch) {
            data = data.filter(item => item.projectName.toLowerCase().includes(projectCostSearch.toLowerCase()) || item.clientName.toLowerCase().includes(projectCostSearch.toLowerCase()));
        }
        if (projectCostStatusFilter !== 'Todos') {
            data = data.filter(item => item.projectStatus === projectCostStatusFilter);
        }
        if (projectCostSort.key) {
            data.sort((a, b) => {
                if (a[projectCostSort.key!] < b[projectCostSort.key!]) return projectCostSort.direction === 'ascending' ? -1 : 1;
                if (a[projectCostSort.key!] > b[projectCostSort.key!]) return projectCostSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [projects, allProducts, getClientById, projectCostSearch, projectCostStatusFilter, projectCostSort]);

    const completedProjectData = useMemo(() => {
        let data = projects.filter(p => p.status === ProjectStatus.COMPLETED).map(p => {
             const client = getClientById(p.clientId);
            return {
                id: p.id,
                projectName: p.name,
                clientName: client ? `${client.name} ${client.lastName}` : 'N/A',
                duration: calculateProjectDuration(p),
                 ...p,
            }
        });
         if (completedProjectSearch) {
            data = data.filter(item => item.projectName.toLowerCase().includes(completedProjectSearch.toLowerCase()) || item.clientName.toLowerCase().includes(completedProjectSearch.toLowerCase()));
        }
        // Custom sort for duration (string)
        if (completedProjectSort.key === 'duration') {
             data.sort((a, b) => {
                const durA = parseInt(a.duration.split(' ')[0]);
                const durB = parseInt(b.duration.split(' ')[0]);
                if (isNaN(durA) && isNaN(durB)) return 0;
                if (isNaN(durA)) return 1;
                if (isNaN(durB)) return -1;
                return completedProjectSort.direction === 'ascending' ? durA - durB : durB - durA;
            });
        } else if (completedProjectSort.key) {
            data.sort((a, b) => {
                if (a[completedProjectSort.key!] < b[completedProjectSort.key!]) return completedProjectSort.direction === 'ascending' ? -1 : 1;
                if (a[completedProjectSort.key!] > b[completedProjectSort.key!]) return completedProjectSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [projects, getClientById, completedProjectSearch, completedProjectSort]);

    const pendingProjectData = useMemo(() => {
        let data = projects.filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PENDING).map(p => {
            const client = getClientById(p.clientId);
            let nextActivity = "Por definir";
            const workDates: Date[] = [];
            if (p.workMode === 'daysOnly' && p.workDays && p.workDays.length > 0) p.workDays.forEach(d => workDates.push(new Date(d + "T00:00:00")));
            else if (p.workMode === 'daysAndTimes' && p.workDayTimeRanges && p.workDayTimeRanges.length > 0) p.workDayTimeRanges.forEach(r => workDates.push(new Date(r.date + "T00:00:00")));
            
            const futureDates = workDates.filter(d => d >= new Date()).sort((a,b) => a.getTime() - b.getTime());
            if (futureDates.length > 0) nextActivity = `Próx. Act.: ${futureDates[0].toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})}`;
            else if (p.visitDate && new Date(p.visitDate + "T00:00:00") >= new Date()) nextActivity = `Visita: ${new Date(p.visitDate + "T00:00:00").toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})}`;
            
            return {
                id: p.id,
                projectName: p.name,
                clientName: client ? `${client.name} ${client.lastName}` : 'N/A',
                projectStatus: p.status,
                nextActivityInfo: nextActivity,
                resourceSummary: `${p.assignedProducts.length}P/${p.assignedEmployeeIds.length}E`,
                ...p,
            };
        });
        if (pendingProjectSearch) {
            data = data.filter(item => item.projectName.toLowerCase().includes(pendingProjectSearch.toLowerCase()) || item.clientName.toLowerCase().includes(pendingProjectSearch.toLowerCase()));
        }
        if (pendingProjectStatusFilter !== 'Todos') {
            data = data.filter(item => item.projectStatus === pendingProjectStatusFilter);
        }
        if (pendingProjectSort.key) {
            data.sort((a, b) => {
                 if (pendingProjectSort.key === 'nextActivityInfo') { // Custom sort for date strings
                    const dateA = new Date(a.nextActivityInfo.split(': ')[1] || 0);
                    const dateB = new Date(b.nextActivityInfo.split(': ')[1] || 0);
                    if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                    if (isNaN(dateA.getTime())) return 1;
                    if (isNaN(dateB.getTime())) return -1;
                    return pendingProjectSort.direction === 'ascending' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
                }
                if (a[pendingProjectSort.key!] < b[pendingProjectSort.key!]) return pendingProjectSort.direction === 'ascending' ? -1 : 1;
                if (a[pendingProjectSort.key!] > b[pendingProjectSort.key!]) return pendingProjectSort.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [projects, getClientById, pendingProjectSearch, pendingProjectStatusFilter, pendingProjectSort]);

    // --- Generic Sorter and Header Creator ---
    const createSortableHeader = <T,>(
        titleKey: string, 
        columnKey: keyof T, 
        currentSort: SortConfig<T>, 
        setSort: React.Dispatch<React.SetStateAction<SortConfig<T>>>
    ) => (
        <button className="flex items-center space-x-1" onClick={() => setSort(prev => ({ key: columnKey, direction: prev.key === columnKey && prev.direction === 'ascending' ? 'descending' : 'ascending' }))}>
            <span>{t(titleKey)}</span>
            {currentSort.key === columnKey && (currentSort.direction === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />)}
        </button>
    );

    // --- Column Definitions ---
    const employeeColumns: TableColumn<EmployeeReportItem>[] = [
        { header: createSortableHeader('reports.col.employee', 'employeeName', employeeSort, setEmployeeSort), accessor: 'employeeName' },
        { header: createSortableHeader('reports.col.projects_count', 'activeProjectCount', employeeSort, setEmployeeSort), accessor: 'activeProjectCount', className: 'text-center' },
        { header: t('reports.col.assigned_summary'), accessor: 'assignedProjectsSummary'},
    ];
    const clientColumns: TableColumn<ClientReportItem>[] = [
        { header: createSortableHeader('reports.col.client', 'clientName', clientSort, setClientSort), accessor: 'clientName' },
        { header: createSortableHeader('reports.col.total_projects', 'totalProjects', clientSort, setClientSort), accessor: 'totalProjects', className: 'text-center' },
        { header: createSortableHeader('reports.col.active_projects', 'activeProjects', clientSort, setClientSort), accessor: 'activeProjects', className: 'text-center' },
    ];
    const projectCostColumns: TableColumn<ProjectCostReportItem>[] = [
        { header: createSortableHeader('reports.col.project', 'projectName', projectCostSort, setProjectCostSort), accessor: 'projectName' },
        { header: createSortableHeader('reports.col.client', 'clientName', projectCostSort, setProjectCostSort), accessor: 'clientName' },
        { header: createSortableHeader('reports.col.est_cost', 'estimatedCost', projectCostSort, setProjectCostSort), accessor: item => `$${item.estimatedCost.toFixed(2)}`, className: 'text-right' },
        { header: createSortableHeader('common.status', 'projectStatus', projectCostSort, setProjectCostSort), accessor: 'projectStatus' },
    ];
    const completedProjectColumns: TableColumn<CompletedProjectReportItem>[] = [
        { header: createSortableHeader('reports.col.project', 'projectName', completedProjectSort, setCompletedProjectSort), accessor: 'projectName' },
        { header: createSortableHeader('reports.col.client', 'clientName', completedProjectSort, setCompletedProjectSort), accessor: 'clientName' },
        { header: createSortableHeader('reports.col.duration', 'duration', completedProjectSort, setCompletedProjectSort), accessor: 'duration', className: 'text-right' },
    ];
    const pendingProjectColumns: TableColumn<PendingProjectReportItem>[] = [
        { header: createSortableHeader('reports.col.project', 'projectName', pendingProjectSort, setPendingProjectSort), accessor: 'projectName' },
        { header: createSortableHeader('reports.col.client', 'clientName', pendingProjectSort, setPendingProjectSort), accessor: 'clientName' },
        { header: createSortableHeader('common.status', 'projectStatus', pendingProjectSort, setPendingProjectSort), accessor: 'projectStatus' },
        { header: createSortableHeader('reports.col.next_activity', 'nextActivityInfo', pendingProjectSort, setPendingProjectSort), accessor: 'nextActivityInfo' },
        { header: createSortableHeader('reports.col.resources', 'resourceSummary', pendingProjectSort, setPendingProjectSort), accessor: 'resourceSummary', className: 'text-center' },
    ];

    // --- Paginated Data ---
    const paginatedEmployeeData = employeeProjectData.slice((employeePage - 1) * ITEMS_PER_PAGE, employeePage * ITEMS_PER_PAGE);
    const paginatedClientData = clientProjectData.slice((clientPage - 1) * ITEMS_PER_PAGE, clientPage * ITEMS_PER_PAGE);
    const paginatedProjectCostData = projectCostData.slice((projectCostPage - 1) * ITEMS_PER_PAGE, projectCostPage * ITEMS_PER_PAGE);
    const paginatedCompletedProjectData = completedProjectData.slice((completedProjectPage - 1) * ITEMS_PER_PAGE, completedProjectPage * ITEMS_PER_PAGE);
    const paginatedPendingProjectData = pendingProjectData.slice((pendingProjectPage - 1) * ITEMS_PER_PAGE, pendingProjectPage * ITEMS_PER_PAGE);

    const renderSection = (
        titleKey: string, 
        iconElement: React.ReactElement<{ className?: string }>, // Use React.ReactElement
        filters: React.ReactNode, 
        tableData: any[], 
        columns: TableColumn<any>[], 
        currentPage: number, 
        totalItems: number, 
        onPageChange: (page:number) => void
    ) => (
        <div className="bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex items-center text-primary dark:text-accent mb-3">
                {React.isValidElement(iconElement) ? React.cloneElement(iconElement, { className: "w-6 h-6 mr-2" }) : null}
                <h2 className="text-lg sm:text-xl font-semibold">{t(titleKey)}</h2>
            </div>
            {filters}
            <DataTable data={tableData} columns={columns} />
            <PaginationControls currentPage={currentPage} totalPages={Math.ceil(totalItems / ITEMS_PER_PAGE)} onPageChange={onPageChange} />
        </div>
    );

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-100">{t('reports.pm.title')}</h1>

            {renderSection(
                "reports.pm.employee_performance", <UsersIcon />,
                <input type="text" placeholder={t('common.search') + "..."} value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className={`${INPUT_SM_CLASSES} mb-3 w-full sm:w-1/2`} />,
                paginatedEmployeeData, employeeColumns, employeePage, employeeProjectData.length, setEmployeePage
            )}

            {renderSection(
                "reports.pm.top_clients", <BriefcaseIcon />,
                <input type="text" placeholder={t('common.search') + "..."} value={clientSearch} onChange={e => setClientSearch(e.target.value)} className={`${INPUT_SM_CLASSES} mb-3 w-full sm:w-1/2`} />,
                paginatedClientData, clientColumns, clientPage, clientProjectData.length, setClientPage
            )}

            {renderSection(
                "reports.pm.project_costs", <BanknotesIcon />,
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input type="text" placeholder={t('common.search') + "..."} value={projectCostSearch} onChange={e => setProjectCostSearch(e.target.value)} className={`${INPUT_SM_CLASSES} flex-grow`} />
                    <select value={projectCostStatusFilter} onChange={e => setProjectCostStatusFilter(e.target.value as ProjectStatus | 'Todos')} className={INPUT_SM_CLASSES}>
                        <option value="Todos">Todos Estados</option>
                        {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>,
                paginatedProjectCostData, projectCostColumns, projectCostPage, projectCostData.length, setProjectCostPage
            )}

            {renderSection(
                "reports.pm.completed_duration", <ClockIcon />,
                <input type="text" placeholder={t('common.search') + "..."} value={completedProjectSearch} onChange={e => setCompletedProjectSearch(e.target.value)} className={`${INPUT_SM_CLASSES} mb-3 w-full sm:w-1/2`} />,
                paginatedCompletedProjectData, completedProjectColumns, completedProjectPage, completedProjectData.length, setCompletedProjectPage
            )}
            
            {renderSection(
                "reports.pm.pending_status", <ExclamationTriangleIcon className="text-amber-500"/>,
                 <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input type="text" placeholder={t('common.search') + "..."} value={pendingProjectSearch} onChange={e => setPendingProjectSearch(e.target.value)} className={`${INPUT_SM_CLASSES} flex-grow`} />
                    <select value={pendingProjectStatusFilter} onChange={e => setPendingProjectStatusFilter(e.target.value as ProjectStatus | 'Todos')} className={INPUT_SM_CLASSES}>
                        <option value="Todos">Todos Estados</option>
                        <option value={ProjectStatus.ACTIVE}>Activo</option>
                        <option value={ProjectStatus.PENDING}>Pendiente</option>
                    </select>
                </div>,
                paginatedPendingProjectData, pendingProjectColumns, pendingProjectPage, pendingProjectData.length, setPendingProjectPage
            )}
        </div>
    );
};
