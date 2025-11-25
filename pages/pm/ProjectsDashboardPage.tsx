
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Project, ProjectStatus, VisitStatus } from '../../types';
import { BriefcaseIcon, CalendarDaysIcon, ClockIcon, UsersIcon, ChatBubbleLeftRightIcon, BanknotesIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge';
import { ProjectFormModal } from './ProjectFormModal'; // Import the modal
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Use translations

export const ProjectsDashboardPage: React.FC = () => {
    const { t } = useTranslation(); // Hook
    const { projects, visits, chatMessages, getProjectById, getClientById, getEmployeeById, sales, employees } = useData();
    const navigate = useNavigate();

    // State for the project modal
    const [isProjectFormModalOpen, setIsProjectFormModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [initialModalTab, setInitialModalTab] = useState<'details' | 'chat'>('details');

    const handleOpenProjectModal = (project: Project, initialTab: 'details' | 'chat' = 'details') => {
        setProjectToEdit(project);
        setInitialModalTab(initialTab);
        setIsProjectFormModalOpen(true);
    };

    const handleOpenChat = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation(); // Prevent the card's main click event
        handleOpenProjectModal(project, 'chat');
    };


    const stats = React.useMemo(() => ({
        active: projects.filter(p => p.status === ProjectStatus.ACTIVE).length,
        pending: projects.filter(p => p.status === ProjectStatus.PENDING).length,
        completedThisMonth: projects.filter(p => {
            if (p.status !== ProjectStatus.COMPLETED) return false;
            // Use invoiceDate as a proxy for completion date for this report
            if (!p.invoiceDate) return false;
            const completedDate = new Date(p.invoiceDate + 'T00:00:00');
            const today = new Date();
            return completedDate.getMonth() === today.getMonth() && completedDate.getFullYear() === today.getFullYear();
        }).length,
    }), [projects]);

    const upcomingVisits = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return visits
            .filter(v => new Date(v.date + 'T00:00:00') >= today && v.status === VisitStatus.PROGRAMADO)
            .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())
            .slice(0, 5);
    }, [visits]);
    
    const getNextActivityString = (project: Project): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const format = (date: Date) => date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

        // Collect all potential future dates from visits, work days, ranges, etc.
        const allFutureDates: {date: Date, type: 'Visita' | 'Trabajo' | 'Inicio'}[] = [];

        // Check project's own visit date
        if (project.visitDate) {
            const visitDate = new Date(project.visitDate + 'T00:00:00');
            if (visitDate >= today) allFutureDates.push({date: visitDate, type: 'Visita'});
        }

        // Check separate Visits collection
        const projectVisits = visits.filter(v => v.projectId === project.id && new Date(v.date + 'T00:00:00') >= today);
        projectVisits.forEach(v => allFutureDates.push({date: new Date(v.date + 'T00:00:00'), type: 'Visita'}));
        
        // Check work days
        if (project.workMode === 'daysOnly' && project.workDays) {
            project.workDays.forEach(d => {
                const workDate = new Date(d + 'T00:00:00');
                if (workDate >= today) allFutureDates.push({date: workDate, type: 'Trabajo'});
            });
        }
        
        // Check work day time ranges
        if (project.workMode === 'daysAndTimes' && project.workDayTimeRanges) {
            project.workDayTimeRanges.forEach(r => {
                const workDate = new Date(r.date + 'T00:00:00');
                if (workDate >= today) allFutureDates.push({date: workDate, type: 'Trabajo'});
            });
        }

        // Check date range
        if (project.workMode === 'dateRange' && project.workStartDate) {
            const startDate = new Date(project.workStartDate + 'T00:00:00');
            if (startDate >= today) {
                allFutureDates.push({date: startDate, type: 'Inicio'});
            } else if (project.workEndDate) {
                const endDate = new Date(project.workEndDate + 'T00:00:00');
                if (endDate >= today) {
                    return `En curso: ${format(startDate)} - ${format(endDate)}`;
                }
            }
        }
        
        // Find the earliest future date
        if (allFutureDates.length > 0) {
            allFutureDates.sort((a, b) => a.date.getTime() - b.date.getTime());
            const nextActivity = allFutureDates[0];
            const prefix = nextActivity.type === 'Visita' ? 'Próxima visita:' : nextActivity.type === 'Inicio' ? 'Inicia:' : 'Próximo trabajo:';
            return `${prefix} ${format(nextActivity.date)}`;
        }

        if (project.status === ProjectStatus.ACTIVE) {
            return t('pm.status.in_progress', "En progreso");
        }

        return t('pm.status.planning_pending', "Planificación pendiente");
    };


    const projectsInProgress = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fourteenDaysFromNow = new Date(today);
        fourteenDaysFromNow.setDate(today.getDate() + 14);

        const getProjectStartDate = (project: Project): Date | null => {
            const dates: (string | undefined)[] = [];
            if (project.visitDate) dates.push(project.visitDate);
            if (project.workStartDate) dates.push(project.workStartDate);
            if (project.workDays && project.workDays.length > 0) dates.push(...project.workDays);
            if (project.workDayTimeRanges && project.workDayTimeRanges.length > 0) dates.push(...project.workDayTimeRanges.map(r => r.date));
            
            if (dates.length === 0) return null;
            
            const validDates = dates
                .filter((d): d is string => !!d)
                .map(d => new Date(d + 'T00:00:00'))
                .sort((a, b) => a.getTime() - b.getTime());

            return validDates.length > 0 ? validDates[0] : null;
        };

        return projects
            .filter(p => {
                if (p.status === ProjectStatus.ACTIVE) return true;
                if (p.status === ProjectStatus.PENDING) {
                    const startDate = getProjectStartDate(p);
                    // Include pending projects starting within 14 days
                    return startDate ? startDate <= fourteenDaysFromNow : false;
                }
                return false;
            })
            .map(p => ({ ...p, startDate: getProjectStartDate(p) }))
            .sort((a, b) => {
                // Active projects first
                if (a.status === ProjectStatus.ACTIVE && b.status !== ProjectStatus.ACTIVE) return -1;
                if (b.status === ProjectStatus.ACTIVE && a.status !== ProjectStatus.ACTIVE) return 1;
                // Then sort by start date
                if (a.startDate && b.startDate) return a.startDate.getTime() - b.startDate.getTime();
                if (a.startDate) return -1;
                if (b.startDate) return 1;
                return 0;
            })
            .slice(0, 5);

    }, [projects, visits]);


    const recentMessages = React.useMemo(() => {
        return [...chatMessages]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }, [chatMessages]);

    const topClientsThisMonth = React.useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const clientSpending: { [clientId: string]: number } = {};

        sales
            .filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
            })
            .forEach(sale => {
                if (sale.clientId) {
                    clientSpending[sale.clientId] = (clientSpending[sale.clientId] || 0) + sale.totalAmount;
                }
            });

        return Object.entries(clientSpending)
            .map(([clientId, total]) => ({
                client: getClientById(clientId),
                totalSpent: total,
            }))
            .filter(item => item.client) // Ensure client exists
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5);
    }, [sales, getClientById]);

    const parseTime = (timeStr: string): number => {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return 0;
        return hours * 60 + minutes;
    };

    const mostActiveEmployeesThisMonth = React.useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const employeeHours: { [employeeId: string]: number } = {};

        visits
            .filter(visit => {
                const visitDate = new Date(visit.date + 'T00:00:00');
                return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear &&
                       (visit.status === VisitStatus.COMPLETADO || visit.status === VisitStatus.PROGRAMADO);
            })
            .forEach(visit => {
                const durationMinutes = parseTime(visit.endTime) - parseTime(visit.startTime);
                if (durationMinutes > 0) {
                    visit.assignedEmployeeIds.forEach(empId => {
                        employeeHours[empId] = (employeeHours[empId] || 0) + durationMinutes;
                    });
                }
            });

        return Object.entries(employeeHours)
            .map(([employeeId, totalMinutes]) => ({
                employee: getEmployeeById(employeeId),
                totalHours: totalMinutes / 60,
            }))
            .filter(item => item.employee)
            .sort((a, b) => b.totalHours - a.totalHours)
            .slice(0, 5);
    }, [visits, getEmployeeById]);


    const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md flex items-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary dark:bg-accent/10 dark:text-accent mr-4">{icon}</div>
            <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</p>
            </div>
        </div>
    );

    const formatRelativeTime = (isoTimestamp: string) => {
        const now = new Date();
        const past = new Date(isoTimestamp);
        const diffInSeconds = Math.round((now.getTime() - past.getTime()) / 1000);
        const minutes = Math.round(diffInSeconds / 60);
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes}m atrás`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours}h atrás`;
        const days = Math.round(hours / 24);
        return `${days}d atrás`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('pm.dashboard.title')}</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pm.dashboard.subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/pm/projects" className={BUTTON_PRIMARY_SM_CLASSES}>
                        <BriefcaseIcon className="w-4 h-4 mr-1.5" /> {t('pm.dashboard.view_all')}
                    </Link>
                    <Link to="/pm/calendar" className={BUTTON_PRIMARY_SM_CLASSES}>
                        <CalendarDaysIcon className="w-4 h-4 mr-1.5" /> {t('pm.dashboard.full_calendar')}
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title={t('pm.stats.active')} value={stats.active} icon={<BriefcaseIcon />} />
                <StatCard title={t('pm.stats.pending')} value={stats.pending} icon={<ClockIcon />} />
                <StatCard title={t('pm.stats.completed_month')} value={stats.completedThisMonth} icon={<BriefcaseIcon />} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {/* Projects in Progress */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">{t('pm.section.in_progress')}</h2>
                         <div className="space-y-3">
                            {projectsInProgress.length > 0 ? (
                                projectsInProgress.map(project => {
                                    const client = project.clientId ? getClientById(project.clientId) : null;
                                    const assignedEmployees = project.assignedEmployeeIds
                                        .map(id => getEmployeeById(id))
                                        .filter(Boolean)
                                        .map(e => e?.name)
                                        .join(', ');
                                    const activityString = getNextActivityString(project);

                                    return (
                                        <button 
                                            key={project.id} 
                                            onClick={() => handleOpenProjectModal(project, 'details')}
                                            className="w-full text-left p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md space-y-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-sm text-primary dark:text-accent">{project.name}</p>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{client ? `${t('common.client')}: ${client.name} ${client.lastName}` : t('pm.no_client')}</p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${project.status === ProjectStatus.ACTIVE ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200'}`}>{project.status}</span>
                                                </div>
                                                <div className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
                                                     {assignedEmployees && <p className="flex items-center"><UsersIcon className="w-3 h-3 mr-1.5" /> {assignedEmployees}</p>}
                                                     <p className="flex items-center"><CalendarDaysIcon className="w-3 h-3 mr-1.5"/> {activityString}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <button 
                                                    onClick={(e) => handleOpenChat(e, project)} 
                                                    className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs flex items-center z-10 relative`}
                                                >
                                                    <ChatBubbleLeftRightIcon className="w-3 h-3 mr-1"/> {t('pm.view_chat')}
                                                </button>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('pm.no_active_projects')}</p>
                            )}
                        </div>
                    </div>
                     {/* Upcoming Visits */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">{t('pm.section.visits')}</h2>
                        <div className="space-y-3">
                            {upcomingVisits.length > 0 ? (
                                upcomingVisits.map(visit => {
                                    const project = visit.projectId ? getProjectById(visit.projectId) : null;
                                    return (
                                        <div key={visit.id} className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-sm text-primary dark:text-accent">{visit.title}</p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{project ? `${t('calendar.project')}: ${project.name}` : t('pm.general_visit')}</p>
                                                </div>
                                                <VisitStatusBadge status={visit.status} />
                                            </div>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                                {new Date(`${visit.date}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} a las {visit.startTime}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('pm.no_visits')}</p>
                            )}
                        </div>
                    </div>
                    {/* Top Clients */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3 flex items-center">
                            <BanknotesIcon className="w-5 h-5 mr-2 text-primary dark:text-accent"/> {t('pm.section.top_clients')}
                        </h2>
                        <div className="space-y-3">
                            {topClientsThisMonth.length > 0 ? (
                                topClientsThisMonth.map(({ client, totalSpent }, index) => (
                                    <div key={client!.id} className="text-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate pr-2">{index + 1}. {client!.name} {client!.lastName}</span>
                                            <span className="font-semibold text-primary dark:text-accent flex-shrink-0">${totalSpent.toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                                            <div 
                                                className="bg-primary dark:bg-accent h-1.5 rounded-full" 
                                                style={{ width: `${(totalSpent / (topClientsThisMonth[0]?.totalSpent || totalSpent)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('pm.no_sales')}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Recent Messages */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3">{t('pm.section.recent_chat')}</h2>
                        <div className="space-y-2">
                            {recentMessages.length > 0 ? (
                                recentMessages.map(message => {
                                    const project = getProjectById(message.projectId);
                                    if (!project) return null; // Don't show messages for projects that might have been deleted
                                    return (
                                        <button
                                            key={message.id}
                                            onClick={() => handleOpenProjectModal(project, 'chat')}
                                            className="block w-full text-left p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
                                        >
                                            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                                                <span className="font-semibold truncate pr-2">{project?.name}</span>
                                                <span>{formatRelativeTime(message.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-neutral-700 dark:text-neutral-200 truncate">
                                                <strong className="font-medium">{message.senderName}:</strong> {message.text}
                                            </p>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('pm.no_messages')}</p>
                            )}
                        </div>
                    </div>
                    {/* Most Active Employees */}
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-3 flex items-center">
                            <UsersIcon className="w-5 h-5 mr-2 text-primary dark:text-accent"/> {t('pm.section.top_employees')}
                        </h2>
                        <div className="space-y-3">
                            {mostActiveEmployeesThisMonth.length > 0 ? (
                                mostActiveEmployeesThisMonth.map(({ employee, totalHours }, index) => (
                                    <div key={employee!.id} className="text-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate pr-2">{index + 1}. {employee!.name} {employee!.lastName}</span>
                                            <span className="font-semibold text-neutral-600 dark:text-neutral-300 flex-shrink-0">{totalHours.toFixed(1)} {t('pm.hours')}</span>
                                        </div>
                                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                                            <div 
                                                className="bg-primary dark:bg-accent h-1.5 rounded-full" 
                                                style={{ width: `${(totalHours / (mostActiveEmployeesThisMonth[0]?.totalHours || totalHours)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('pm.no_hours')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <ProjectFormModal
                isOpen={isProjectFormModalOpen}
                onClose={() => setIsProjectFormModalOpen(false)}
                project={projectToEdit}
                initialTab={initialModalTab}
            />
        </div>
    );
};
